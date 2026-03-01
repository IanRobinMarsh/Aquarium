use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};

// ── Protocol classification ────────────────────────────────────────────────

#[derive(Clone, Copy, Debug, PartialEq, Serialize, Deserialize)]
pub enum FlowKind {
    Http,       // colourful clownfish
    Dns,        // small darting sardines
    Ssh,        // sleek barracuda
    Tls,        // elegant angelfish
    Udp,        // jellyfish
    Icmp,       // bubbles only
    Ftp,        // dramatic lionfish
    Smtp,       // butterflyfish
    Ntp,        // round pufferfish
    Other,      // shadowy deep-sea fish
}

impl FlowKind {
    fn from_str(s: &str) -> FlowKind {
        match s {
            "http"  => FlowKind::Http,
            "dns"   => FlowKind::Dns,
            "ssh"   => FlowKind::Ssh,
            "tls"   => FlowKind::Tls,
            "udp"   => FlowKind::Udp,
            "icmp"  => FlowKind::Icmp,
            "ftp"   => FlowKind::Ftp,
            "smtp"  => FlowKind::Smtp,
            "ntp"   => FlowKind::Ntp,
            _       => FlowKind::Other,
        }
    }

    fn color(&self) -> &'static str {
        match self {
            FlowKind::Http  => "#FF6B35",
            FlowKind::Dns   => "#A8E6CF",
            FlowKind::Ssh   => "#4A90D9",
            FlowKind::Tls   => "#9B59B6",
            FlowKind::Udp   => "#E8F5A3",
            FlowKind::Icmp  => "#FFFFFF",
            FlowKind::Ftp   => "#CC3820",
            FlowKind::Smtp  => "#F5C518",
            FlowKind::Ntp   => "#7CB84A",
            FlowKind::Other => "#445566",
        }
    }

    fn fin_color(&self) -> &'static str {
        match self {
            FlowKind::Http  => "#FF9F1C",
            FlowKind::Dns   => "#77C59A",
            FlowKind::Ssh   => "#2C6FAC",
            FlowKind::Tls   => "#6C3483",
            FlowKind::Udp   => "#C9D97A",
            FlowKind::Icmp  => "#AADDFF",
            FlowKind::Ftp   => "#8A1A0A",
            FlowKind::Smtp  => "#C89010",
            FlowKind::Ntp   => "#4E8A28",
            FlowKind::Other => "#223344",
        }
    }

    fn shape(&self) -> &'static str {
        match self {
            FlowKind::Udp  => "jellyfish",
            FlowKind::Icmp => "bubble",
            _              => "fish",
        }
    }
}

// ── Fish entity ────────────────────────────────────────────────────────────

#[derive(Clone, Serialize, Deserialize)]
pub struct Fish {
    pub id:        u32,
    pub x:         f64,
    pub y:         f64,
    pub vx:        f64,
    pub vy:        f64,
    pub size:      f64,   // radius-ish, px
    pub kind:      String,
    pub color:     String,
    pub fin_color: String,
    pub shape:     String,
    pub wobble:    f64,   // phase offset for sine wobble
    pub alive:     f64,   // TTL seconds; decreases each update
    pub opacity:   f64,
    pub facing:    f64,   // 1 = right, -1 = left
    pub variant:   u8,    // 0-3 visual sub-type within species
}

// ── Bubble entity ──────────────────────────────────────────────────────────

#[derive(Clone, Serialize, Deserialize)]
pub struct Bubble {
    pub x:      f64,
    pub y:      f64,
    pub r:      f64,
    pub speed:  f64,
    pub wobble: f64,
    pub t:      f64,
}

// ── Simulation state ───────────────────────────────────────────────────────

#[wasm_bindgen]
pub struct Aquarium {
    width:    f64,
    height:   f64,
    fish:     Vec<Fish>,
    bubbles:  Vec<Bubble>,
    next_id:  u32,
    rng:      SimpleRng,
    time:     f64,
}

#[wasm_bindgen]
impl Aquarium {
    #[wasm_bindgen(constructor)]
    pub fn new(width: f64, height: f64) -> Aquarium {
        Aquarium {
            width,
            height,
            fish: Vec::new(),
            bubbles: Vec::new(),
            next_id: 0,
            rng: SimpleRng::new(0x1234_ABCD),
            time: 0.0,
        }
    }

    /// Called by JS when a new flow event arrives from the WebSocket.
    /// `protocol`: "http" | "dns" | "ssh" | "tls" | "udp" | "icmp" | other
    /// `bytes`: approximate flow size → fish size
    #[wasm_bindgen]
    pub fn on_flow(&mut self, protocol: &str, bytes: u32) {
        let kind  = FlowKind::from_str(protocol);
        let shape = kind.shape();

        if shape == "bubble" {
            // ICMP → just emit a bubble
            let x = self.rng.next_f64() * self.width;
            self.bubbles.push(Bubble {
                x,
                y:      self.height,
                r:      4.0 + self.rng.next_f64() * 6.0,
                speed:  0.4 + self.rng.next_f64() * 0.6,
                wobble: self.rng.next_f64() * std::f64::consts::TAU,
                t:      0.0,
            });
            return;
        }

        let size = (10.0_f64 + (bytes as f64).log2() * 2.0).min(40.0);
        let x    = if self.rng.next_bool() { -size } else { self.width + size };
        let y    = self.height * 0.1 + self.rng.next_f64() * (self.height * 0.8);
        let vx   = if x < 0.0 { 0.5 + self.rng.next_f64() } else { -(0.5 + self.rng.next_f64()) };
        let vy   = (self.rng.next_f64() - 0.5) * 0.3;

        self.fish.push(Fish {
            id:        self.next_id,
            x, y, vx, vy, size,
            kind:      protocol.to_string(),
            color:     kind.color().to_string(),
            fin_color: kind.fin_color().to_string(),
            shape:     shape.to_string(),
            wobble:    self.rng.next_f64() * std::f64::consts::TAU,
            alive:     20.0 + self.rng.next_f64() * 30.0,
            opacity:   1.0,
            facing:    if vx > 0.0 { 1.0 } else { -1.0 },
            variant:   (self.rng.next_u32() % 4) as u8,
        });
        self.next_id += 1;

        // cap fish count to keep rendering snappy
        if self.fish.len() > 120 {
            self.fish.remove(0);
        }
    }

    /// Advance simulation by `dt` seconds. Returns JSON fish+bubble arrays.
    #[wasm_bindgen]
    pub fn tick(&mut self, dt: f64) -> JsValue {
        self.time += dt;

        // Update fish
        for f in &mut self.fish {
            f.alive -= dt;
            if f.alive < 3.0 {
                f.opacity = (f.alive / 3.0).max(0.0);
            }

            // Gentle sine-wave vertical drift
            f.y += f.vy + (self.time * 1.2 + f.wobble).sin() * 0.15;
            f.x += f.vx;

            // Wrap horizontally
            if f.x > self.width + f.size * 2.0 {
                f.x = -f.size * 2.0;
            } else if f.x < -f.size * 2.0 {
                f.x = self.width + f.size * 2.0;
            }

            // Gentle boundary nudge vertically
            let margin = f.size;
            if f.y < margin { f.y = margin; }
            if f.y > self.height - margin { f.y = self.height - margin; }
        }
        self.fish.retain(|f| f.alive > 0.0);

        // Emit ambient bubbles from coral zone (bottom 15%)
        if self.rng.next_f64() < dt * 3.0 {
            let x = self.rng.next_f64() * self.width;
            self.bubbles.push(Bubble {
                x,
                y:      self.height,
                r:      2.0 + self.rng.next_f64() * 5.0,
                speed:  0.3 + self.rng.next_f64() * 0.5,
                wobble: self.rng.next_f64() * std::f64::consts::TAU,
                t:      0.0,
            });
        }

        // Update bubbles
        for b in &mut self.bubbles {
            b.t  += dt;
            b.y  -= b.speed * 60.0 * dt;
            b.x  += (b.t * 1.5 + b.wobble).sin() * 0.4;
        }
        self.bubbles.retain(|b| b.y > -b.r * 2.0);

        // Serialize state for JS
        let state = SimState {
            fish:    &self.fish,
            bubbles: &self.bubbles,
            time:    self.time,
        };
        serde_wasm_bindgen::to_value(&state).unwrap()
    }

    #[wasm_bindgen]
    pub fn resize(&mut self, w: f64, h: f64) {
        self.width  = w;
        self.height = h;
    }

    #[wasm_bindgen]
    pub fn fish_count(&self) -> usize {
        self.fish.len()
    }
}

#[derive(Serialize)]
struct SimState<'a> {
    fish:    &'a Vec<Fish>,
    bubbles: &'a Vec<Bubble>,
    time:    f64,
}

// ── Tiny PRNG (xorshift32) – avoids pulling in rand for wasm size ──────────

struct SimpleRng(u32);

impl SimpleRng {
    fn new(seed: u32) -> Self { SimpleRng(seed) }

    fn next_u32(&mut self) -> u32 {
        self.0 ^= self.0 << 13;
        self.0 ^= self.0 >> 17;
        self.0 ^= self.0 << 5;
        self.0
    }

    fn next_f64(&mut self) -> f64 {
        (self.next_u32() as f64) / (u32::MAX as f64)
    }

    fn next_bool(&mut self) -> bool {
        self.next_u32() & 1 == 0
    }
}
