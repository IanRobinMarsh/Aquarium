//! Aquarium capture daemon
//!
//! Captures live packets via libpcap, classifies each into a flow kind,
//! then broadcasts JSON flow events over WebSocket on ws://127.0.0.1:9001.
//!
//! Requires: root / CAP_NET_RAW (macOS: sudo ./aquarium-capture)

use std::net::SocketAddr;
use std::sync::Arc;

use futures_util::{SinkExt, StreamExt};
use pcap::{Capture, Device};
use pnet_packet::{
    ethernet::{EtherTypes, EthernetPacket},
    ip::IpNextHeaderProtocols,
    ipv4::Ipv4Packet,
    ipv6::Ipv6Packet,
    tcp::TcpPacket,
    udp::UdpPacket,
    Packet,
};
use serde::Serialize;
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::broadcast;
use tokio_tungstenite::{accept_async, tungstenite::Message};

// ── Flow event sent to browser ─────────────────────────────────────────────

#[derive(Clone, Serialize, Debug)]
struct FlowEvent {
    protocol: String,
    bytes:    u32,
    src:      String,
    dst:      String,
}

// ── Protocol classification ────────────────────────────────────────────────

fn classify_tcp(port_src: u16, port_dst: u16) -> &'static str {
    let ports = [port_src, port_dst];
    if ports.contains(&22)                                        { return "ssh"; }
    if ports.iter().any(|&p| p == 20 || p == 21)                 { return "ftp"; }
    if ports.iter().any(|&p| p == 25 || p == 465 || p == 587)    { return "smtp"; }
    if ports.iter().any(|&p| p == 80 || p == 8080)               { return "http"; }
    if ports.iter().any(|&p| p == 443 || p == 8443)              { return "tls"; }
    if ports.contains(&53)                                        { return "dns"; }
    if ports.iter().any(|&p| p == 1883 || p == 8883)             { return "mqtt"; }
    "tcp"
}

fn classify_udp(port_src: u16, port_dst: u16) -> &'static str {
    let ports = [port_src, port_dst];
    if ports.iter().any(|&p| p == 53 || p == 5353)      { return "dns"; }
    if ports.contains(&443)                              { return "tls"; } // QUIC
    if ports.contains(&123)                              { return "ntp"; }
    "udp"
}

fn parse_packet(data: &[u8]) -> Option<FlowEvent> {
    let eth = EthernetPacket::new(data)?;

    match eth.get_ethertype() {
        EtherTypes::Ipv4 => {
            let ip = Ipv4Packet::new(eth.payload())?;
            let src = ip.get_source().to_string();
            let dst = ip.get_destination().to_string();
            let len = ip.get_total_length() as u32;

            match ip.get_next_level_protocol() {
                IpNextHeaderProtocols::Tcp => {
                    let tcp = TcpPacket::new(ip.payload())?;
                    Some(FlowEvent {
                        protocol: classify_tcp(tcp.get_source(), tcp.get_destination()).into(),
                        bytes: len, src, dst,
                    })
                }
                IpNextHeaderProtocols::Udp => {
                    let udp = UdpPacket::new(ip.payload())?;
                    Some(FlowEvent {
                        protocol: classify_udp(udp.get_source(), udp.get_destination()).into(),
                        bytes: len, src, dst,
                    })
                }
                IpNextHeaderProtocols::Icmp => {
                    Some(FlowEvent { protocol: "icmp".into(), bytes: len, src, dst })
                }
                _ => None,
            }
        }

        EtherTypes::Ipv6 => {
            let ip = Ipv6Packet::new(eth.payload())?;
            let src = ip.get_source().to_string();
            let dst = ip.get_destination().to_string();
            let len = ip.get_payload_length() as u32;

            match ip.get_next_header() {
                IpNextHeaderProtocols::Tcp => {
                    let tcp = TcpPacket::new(ip.payload())?;
                    Some(FlowEvent {
                        protocol: classify_tcp(tcp.get_source(), tcp.get_destination()).into(),
                        bytes: len, src, dst,
                    })
                }
                IpNextHeaderProtocols::Udp => {
                    let udp = UdpPacket::new(ip.payload())?;
                    Some(FlowEvent {
                        protocol: classify_udp(udp.get_source(), udp.get_destination()).into(),
                        bytes: len, src, dst,
                    })
                }
                IpNextHeaderProtocols::Icmpv6 => {
                    Some(FlowEvent { protocol: "icmp".into(), bytes: len, src, dst })
                }
                _ => None,
            }
        }

        _ => None,
    }
}

// ── WebSocket server ───────────────────────────────────────────────────────

async fn handle_ws(stream: TcpStream, addr: SocketAddr, mut rx: broadcast::Receiver<String>) {
    let ws = match accept_async(stream).await {
        Ok(ws) => ws,
        Err(e) => { eprintln!("WS handshake error {addr}: {e}"); return; }
    };
    println!("Browser connected: {addr}");

    let (mut tx_ws, _rx_ws) = ws.split();

    while let Ok(msg) = rx.recv().await {
        if tx_ws.send(Message::Text(msg)).await.is_err() {
            break;
        }
    }
    println!("Browser disconnected: {addr}");
}

// ── Main ───────────────────────────────────────────────────────────────────

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Broadcast channel: pcap thread → all connected WS clients
    let (tx, _) = broadcast::channel::<String>(1024);
    let tx = Arc::new(tx);

    // ── WebSocket listener ──
    let ws_addr = "127.0.0.1:9001";
    let listener = TcpListener::bind(ws_addr).await?;
    println!("WebSocket listening on ws://{ws_addr}");

    let tx_ws = tx.clone();
    tokio::spawn(async move {
        loop {
            if let Ok((stream, addr)) = listener.accept().await {
                let rx = tx_ws.subscribe();
                tokio::spawn(handle_ws(stream, addr, rx));
            }
        }
    });

    // ── pcap capture (blocking, runs on a dedicated thread) ──
    let dev = Device::lookup()
        .expect("pcap lookup failed")
        .expect("no default device found");
    println!("Capturing on: {} ({:?})", dev.name, dev.desc);

    let mut cap = Capture::from_device(dev)?
        .promisc(false)
        .snaplen(256)     // we only need headers
        .timeout(100)
        .open()?;

    let tx_cap = tx.clone();
    std::thread::spawn(move || {
        while let Ok(pkt) = cap.next_packet() {
            if let Some(event) = parse_packet(pkt.data) {
                if let Ok(json) = serde_json::to_string(&event) {
                    // ignore send error when no clients connected
                    let _ = tx_cap.send(json);
                }
            }
        }
    });

    // Keep main alive
    tokio::signal::ctrl_c().await?;
    println!("Shutting down.");
    Ok(())
}
