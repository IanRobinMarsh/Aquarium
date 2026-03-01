import init, { Aquarium } from './pkg/aquarium_wasm.js';

// ── Color helpers ──────────────────────────────────────────────────────────

function hex2rgb(h) {
  return [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)];
}
function hexA(h, a) {
  const [r,g,b] = hex2rgb(h);
  return `rgba(${r},${g},${b},${a})`;
}
function lighter(h, n) {
  const [r,g,b] = hex2rgb(h);
  return `rgb(${Math.min(255,r+n)},${Math.min(255,g+n)},${Math.min(255,b+n)})`;
}
function darker(h, n) {
  const [r,g,b] = hex2rgb(h);
  return `rgb(${Math.max(0,r-n)},${Math.max(0,g-n)},${Math.max(0,b-n)})`;
}

// ── Canvas + WASM boot ─────────────────────────────────────────────────────

await init();

const canvas = document.getElementById('c');
const ctx    = canvas.getContext('2d');
let W = canvas.width  = window.innerWidth;
let H = canvas.height = window.innerHeight;

const sim = new Aquarium(W, H);

// Seed a lively demo tank
['http','tls','dns','ssh','udp','http','http','tls','dns','ssh',
 'udp','http','tls','other','http'].forEach(p =>
  sim.on_flow(p, 2000 + Math.random() * 80000 | 0));

function onResize() {
  W = canvas.width  = window.innerWidth;
  H = canvas.height = window.innerHeight;
  sim.resize(W, H);
  buildScene();
}
window.addEventListener('resize', onResize);

// ── WebSocket ──────────────────────────────────────────────────────────────

let pktCount = 0;
const wsDot  = document.getElementById('ws-dot');
const wsLbl  = document.getElementById('ws-label');

function connectWS() {
  const ws = new WebSocket('ws://127.0.0.1:9001');
  ws.onopen  = () => { wsDot.style.background='#2ecc71'; wsLbl.textContent='live capture'; };
  ws.onclose = () => { wsDot.style.background='#e74c3c'; wsLbl.textContent='daemon offline — demo mode';
                       setTimeout(connectWS, 3000); };
  ws.onerror = () => ws.close();
  ws.onmessage = ({data}) => {
    try { const {protocol,bytes}=JSON.parse(data); sim.on_flow(protocol,bytes); pktCount++; }
    catch(_) {}
  };
}
connectWS();

// ── Scene elements ─────────────────────────────────────────────────────────

let rocks=[], seagrass=[], kelp=[], anemones=[], coralDefs=[], starfish=[], plankton=[], urchins=[], clams=[], crabs=[], marineSnow=[], seahorses=[], bioParticles=[];

function buildScene() {
  // Rocks
  rocks = [];
  for (let i=0; i<Math.max(5,W/160|0); i++) {
    const x = (i + 0.5 + (Math.random()-0.5)*0.45) * (W / Math.max(5,W/160|0));
    rocks.push({ x, rw: 28+Math.random()*55, rh: 10+Math.random()*22,
      col: ['#152030','#1a2a38','#0e1e2e','#1d3040'][Math.random()*4|0] });
  }

  // Sea-grass patches
  seagrass = [];
  for (let i=0; i<Math.max(10,W/70|0); i++) {
    const x = Math.random()*W;
    seagrass.push({ x, blades: Array.from({length:3+Math.random()*5|0}, ()=>({
      dx: (Math.random()-0.5)*22,
      h:  18+Math.random()*38,
      phase: Math.random()*Math.PI*2,
      col: Math.random()<0.5 ? '#1E7A32' : '#28923C',
    }))});
  }

  // Kelp
  kelp = [];
  for (let i=0; i<Math.max(3,W/240|0); i++) {
    kelp.push({ x: 60+Math.random()*(W-120),
      h: H*0.28+Math.random()*H*0.32,
      segs: 9+Math.random()*5|0,
      phase: Math.random()*Math.PI*2,
      c1:'#16642A', c2:'#1E8A38' });
  }

  // Anemones
  anemones = [];
  for (let i=0; i<Math.max(3,W/270|0); i++) {
    anemones.push({ x: 80+Math.random()*(W-160),
      tents: 8+Math.random()*7|0,
      baseH: 14+Math.random()*18,
      tentH: 22+Math.random()*32,
      col: ['#D94F8A','#E87030','#8B4BC9','#D9C030','#30A0C9'][Math.random()*5|0],
      phase: Math.random()*Math.PI*2 });
  }

  // Coral
  coralDefs = [];
  const cc = Math.max(6, W/120|0);
  for (let i=0; i<cc; i++) {
    coralDefs.push({ x: (i+0.5+(Math.random()-0.5)*0.45)*(W/cc),
      h: H*0.07+Math.random()*H*0.13,
      col: ['#E0506A','#F07030','#9060C8','#40B8A0','#E8BC30','#E03060'][i%6],
      type: ['branch','branch','fan','brain','tube'][Math.random()*5|0],
      arms: 3+Math.random()*4|0 });
  }

  // Starfish
  starfish = [];
  for (let i=0; i<Math.max(3,W/240|0); i++) {
    starfish.push({ x: 40+Math.random()*(W-80),
      r: 8+Math.random()*14,
      col: ['#D85040','#D89030','#8850A8','#D84060'][Math.random()*4|0],
      rot: Math.random()*Math.PI*2 });
  }

  // Plankton
  plankton = Array.from({length:90}, ()=>({
    x: Math.random()*W, y: Math.random()*H,
    r: 0.5+Math.random()*1.5,
    vx: (Math.random()-0.5)*0.04,
    vy: -(0.015+Math.random()*0.04),
    ph: Math.random()*Math.PI*2,
    a: 0.1+Math.random()*0.28,
  }));

  // Marine snow — fine particles drifting downward
  marineSnow = Array.from({length:160}, ()=>({
    x: Math.random()*W, y: Math.random()*H,
    r: 0.3+Math.random()*0.85,
    vx: (Math.random()-0.5)*0.05,
    vy: 0.07+Math.random()*0.14,
    a: 0.05+Math.random()*0.18,
    ph: Math.random()*Math.PI*2,
  }));

  // Sea urchins
  urchins = [];
  for (let i=0; i<Math.max(4,W/210|0); i++) {
    urchins.push({ x: 25+Math.random()*(W-50),
      r: 7+Math.random()*9, spines: 14+(Math.random()*8|0),
      col: ['#3A1A5A','#1A3A5A','#5A1A1A','#1A4A3A'][Math.random()*4|0] });
  }

  // Clams
  clams = [];
  for (let i=0; i<Math.max(3,W/280|0); i++) {
    clams.push({ x: 40+Math.random()*(W-80),
      w: 11+Math.random()*16, phase: Math.random()*Math.PI*2,
      col: ['#8A6A4A','#6A8A7A','#4A6A8A','#7A5A8A'][Math.random()*4|0] });
  }

  // Crabs
  crabs = [];
  for (let i=0; i<Math.max(2,W/380|0); i++) {
    crabs.push({ x: 80+Math.random()*(W-160),
      vx: (Math.random()-0.5)*0.22, phase: Math.random()*Math.PI*2,
      r: 11+Math.random()*10,
      col: ['#8A3A1A','#A04828','#6A2210'][Math.random()*3|0] });
  }

  // Seahorses (anchored near seagrass blades)
  seahorses = [];
  for (let i=0; i<Math.max(2,W/550|0); i++) {
    const sg = seagrass[Math.random()*seagrass.length|0];
    seahorses.push({
      x: sg ? sg.x+(Math.random()-0.5)*35 : 100+Math.random()*(W-200),
      y: H-(48+Math.random()*28),
      size: 15+Math.random()*9,
      col: ['#C87820','#3A8870','#9A3A80'][Math.random()*3|0],
      phase: Math.random()*Math.PI*2,
      facing: Math.random()<0.5 ? 1 : -1,
    });
  }

  // Bioluminescent deep-water particles
  bioParticles = Array.from({length:38}, ()=>({
    x: Math.random()*W,
    y: H*0.5+Math.random()*H*0.42,
    r: 0.9+Math.random()*2.0,
    vx: (Math.random()-0.5)*0.04,
    vy: (Math.random()-0.5)*0.03,
    ph: Math.random()*Math.PI*2,
    col: Math.random()<0.6 ? '#00D8B0' : '#3878FF',
    gr: 9+Math.random()*14,
  }));

  // Ambient fish school
  buildFishSchool();
}
buildScene();

// Sea turtle (ambient, crosses periodically)
const turtle = { x:-220, y:0, vx:0.5, flip:1, t:0 };
function resetTurtle() {
  turtle.flip = Math.random()<0.5 ? 1 : -1;
  turtle.x    = turtle.flip>0 ? -220 : W+220;
  turtle.vx   = turtle.flip*(0.3+Math.random()*0.35);
  turtle.y    = H*(0.15+Math.random()*0.55);
}
resetTurtle();

// Manta ray (ambient, appears periodically)
const manta = { x:-500, y:0, vx:0.45, flip:1, t:0, delay:14 };
function resetManta() {
  manta.delay = 20+Math.random()*40;
  manta.flip  = Math.random()<0.5 ? 1 : -1;
  manta.x     = manta.flip>0 ? -480 : W+480;
  manta.vx    = manta.flip*(0.28+Math.random()*0.24);
  manta.y     = H*(0.12+Math.random()*0.5);
  manta.t     = 0;
}

// Shark (ambient, appears periodically, swims through ominously)
const shark = { x:-340, y:0, vx:0.55, flip:1, t:0, delay:30 };
function resetShark() {
  shark.delay = 35+Math.random()*55;
  shark.flip  = Math.random()<0.5 ? 1 : -1;
  shark.x     = shark.flip>0 ? -340 : W+340;
  shark.vx    = shark.flip*(0.38+Math.random()*0.28);
  shark.y     = H*(0.18+Math.random()*0.52);
  shark.t     = 0;
}

// Ambient fish school (decorative mid-water silhouettes)
const fishSchool = { cx:0, cy:0, vx:0.38, vy:0.04, dir:0, turnT:5, speed:0.36, members:[] };
function buildFishSchool() {
  fishSchool.cx    = W*(0.25+Math.random()*0.5);
  fishSchool.cy    = H*(0.22+Math.random()*0.44);
  fishSchool.dir   = Math.random()*Math.PI*2;
  fishSchool.speed = 0.28+Math.random()*0.22;
  fishSchool.vx    = Math.cos(fishSchool.dir)*fishSchool.speed;
  fishSchool.vy    = Math.sin(fishSchool.dir)*fishSchool.speed;
  fishSchool.turnT = 5+Math.random()*9;
  fishSchool.members = Array.from({length:28}, ()=>({
    ox: (Math.random()-0.5)*112, oy: (Math.random()-0.5)*48,
    px: fishSchool.cx+(Math.random()-0.5)*112,
    py: fishSchool.cy+(Math.random()-0.5)*48,
    ph: Math.random()*Math.PI*2, sz: 4.5+Math.random()*3,
  }));
}

// Whale shark (enormous, very rare, faint deep silhouette)
const whaleshark = { x:-660, y:0, vx:0.16, flip:1, t:0, delay:55 };
function resetWhaleshark() {
  whaleshark.delay = 70+Math.random()*100;
  whaleshark.flip  = Math.random()<0.5 ? 1 : -1;
  whaleshark.x     = whaleshark.flip>0 ? -680 : W+680;
  whaleshark.vx    = whaleshark.flip*(0.13+Math.random()*0.09);
  whaleshark.y     = H*(0.48+Math.random()*0.28);
  whaleshark.t     = 0;
}

// ── Background + light rays ────────────────────────────────────────────────

function drawBackground(t) {
  const g = ctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0,   '#010C18');
  g.addColorStop(0.45,'#031624');
  g.addColorStop(1,   '#040F1C');
  ctx.fillStyle = g;
  ctx.fillRect(0,0,W,H);

  // Volumetric light shafts
  ctx.save();
  for (let i=0; i<8; i++) {
    const cx  = W*(0.08+i*0.12) + Math.sin(t*0.12+i)*W*0.035;
    const ang = -0.1 + Math.sin(t*0.08+i*0.9)*0.07;
    const len = H*(0.45+Math.sin(t*0.07+i)*0.12);
    const w   = 35+Math.sin(t*0.1+i*1.3)*18;
    ctx.save();
    ctx.translate(cx, 0);
    ctx.rotate(ang);
    const rg = ctx.createLinearGradient(0,0,0,len);
    rg.addColorStop(0,   'rgba(130,210,255,0.05)');
    rg.addColorStop(0.55,'rgba(90,170,230,0.018)');
    rg.addColorStop(1,   'rgba(60,130,190,0)');
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.moveTo(-w/2,0); ctx.lineTo(w/2,0);
    ctx.lineTo(w*0.75,len); ctx.lineTo(-w*0.75,len);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // Caustic shimmer blobs
  for (let i=0; i<5; i++) {
    const cx = W*0.12+i*W*0.18+Math.sin(t*0.28+i)*45;
    const cy = H*0.1+Math.cos(t*0.22+i*1.4)*30;
    const r  = 70+i*35;
    const cg = ctx.createRadialGradient(cx,cy,0,cx,cy,r);
    cg.addColorStop(0,'rgba(100,210,255,0.022)');
    cg.addColorStop(1,'transparent');
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.ellipse(cx,cy,r,r*0.55,t*0.08+i,0,Math.PI*2);
    ctx.fill();
  }
  ctx.restore();
}

// ── Plankton ───────────────────────────────────────────────────────────────

function tickPlankton(dt) {
  for (const p of plankton) {
    p.x += p.vx + Math.sin(p.ph + performance.now()*0.0004)*0.025;
    p.y += p.vy;
    if (p.y < -4) { p.y = H+4; p.x = Math.random()*W; }
    if (p.x < -4) p.x = W+4;
    if (p.x > W+4) p.x = -4;
  }
}
function drawPlankton() {
  for (const p of plankton) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
    ctx.fillStyle = `rgba(180,235,255,${p.a})`;
    ctx.fill();
  }
}

// ── Sea floor ──────────────────────────────────────────────────────────────

function drawSeafloor(t) {
  // Sandy gradient strip
  const sg = ctx.createLinearGradient(0,H-H*0.09,0,H);
  sg.addColorStop(0,'rgba(14,38,62,0)');
  sg.addColorStop(0.35,'rgba(16,44,68,0.85)');
  sg.addColorStop(1,'rgba(10,30,50,1)');
  ctx.fillStyle = sg;
  ctx.fillRect(0,H-H*0.09,W,H*0.09);

  // Sand ripples
  ctx.save();
  ctx.strokeStyle = 'rgba(60,120,160,0.1)';
  ctx.lineWidth = 1;
  for (let i=0; i<6; i++) {
    const y = H-H*0.07+i*H*0.011;
    ctx.beginPath(); ctx.moveTo(0,y);
    for (let x=0; x<=W; x+=8)
      ctx.lineTo(x, y+Math.sin(x*0.04+t*0.18+i)*2);
    ctx.stroke();
  }
  ctx.restore();

  // Rocks
  for (const r of rocks) {
    const y = H - r.rh*0.45;
    // Shadow
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(r.x+5, y+r.rh*0.35, r.rw*0.9, r.rh*0.55, 0, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();
    // Rock
    const rg = ctx.createRadialGradient(r.x-r.rw*0.25, y-r.rh*0.3, 0, r.x, y, r.rw);
    rg.addColorStop(0, lighter(r.col,12));
    rg.addColorStop(1, r.col);
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.ellipse(r.x, y, r.rw, r.rh, 0, Math.PI, 0);
    ctx.ellipse(r.x, y, r.rw*1.04, r.rh*0.38, 0, 0, Math.PI);
    ctx.fill();
  }

  // Starfish
  for (const sf of starfish) {
    const y = H - 6;
    ctx.save();
    ctx.translate(sf.x, y);
    ctx.rotate(sf.rot);
    const sfg = ctx.createRadialGradient(0,-sf.r*0.2,0,0,0,sf.r);
    sfg.addColorStop(0, lighter(sf.col,35));
    sfg.addColorStop(1, sf.col);
    ctx.fillStyle = sfg;
    ctx.globalAlpha = 0.88;
    ctx.beginPath();
    for (let i=0; i<10; i++) {
      const a = (i/10)*Math.PI*2 - Math.PI/2;
      const rd = i%2===0 ? sf.r : sf.r*0.4;
      ctx.lineTo(Math.cos(a)*rd, Math.sin(a)*rd);
    }
    ctx.closePath(); ctx.fill();
    // Texture dots
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.globalAlpha = 1;
    for (let i=0; i<5; i++) {
      const a = (i/5)*Math.PI*2;
      ctx.beginPath();
      ctx.arc(Math.cos(a)*sf.r*0.52, Math.sin(a)*sf.r*0.52, 1.5, 0, Math.PI*2);
      ctx.fill();
    }
    ctx.restore();
  }
}

// ── Sea grass ──────────────────────────────────────────────────────────────

function drawSeagrass(t) {
  ctx.save();
  ctx.lineWidth = 2;
  for (const patch of seagrass) {
    for (const b of patch.blades) {
      const x = patch.x+b.dx, y = H;
      const bend = Math.sin(t*0.75+b.phase+patch.x*0.008)*14;
      ctx.strokeStyle = b.col;
      ctx.globalAlpha = 0.72;
      ctx.beginPath();
      ctx.moveTo(x,y);
      ctx.quadraticCurveTo(x+bend*0.55, y-b.h*0.5, x+bend, y-b.h);
      ctx.stroke();
    }
  }
  ctx.restore();
}

// ── Kelp ───────────────────────────────────────────────────────────────────

function drawKelp(t) {
  for (const k of kelp) {
    const segH = k.h/k.segs;
    let px=k.x, py=H;
    ctx.save();
    for (let i=0; i<k.segs; i++) {
      const progress = i/k.segs;
      const sway = Math.sin(t*0.5+k.phase+i*0.38)*13*progress;
      const nx = k.x+sway, ny = H-(i+1)*segH;
      ctx.strokeStyle = i%2===0 ? k.c1 : k.c2;
      ctx.lineWidth   = 3.5-progress*2.5;
      ctx.globalAlpha = 0.82;
      ctx.beginPath(); ctx.moveTo(px,py);
      ctx.quadraticCurveTo(px+(nx-px)*0.5+sway*0.3,(py+ny)/2,nx,ny);
      ctx.stroke();
      // Leaf blades every other segment
      if (i%2===0 && i<k.segs-2) {
        const side = i%4===0 ? 1 : -1;
        const lx = nx+side*22*progress, ly = ny+4;
        ctx.fillStyle = i%2===0 ? k.c2 : k.c1;
        ctx.globalAlpha = 0.65;
        ctx.beginPath();
        ctx.moveTo(nx,ny);
        ctx.quadraticCurveTo(lx,ly-12,lx+side*6,ly+18);
        ctx.quadraticCurveTo(lx-side*6,ly+22,nx,ny+5);
        ctx.fill();
      }
      px=nx; py=ny;
    }
    ctx.restore();
    ctx.globalAlpha=1;
  }
}

// ── Anemones ───────────────────────────────────────────────────────────────

function drawAnemones(t) {
  for (const an of anemones) {
    ctx.save();
    ctx.translate(an.x, H);
    // Body column
    const bg = ctx.createLinearGradient(0,0,0,-an.baseH);
    bg.addColorStop(0,darker(an.col,40)); bg.addColorStop(1,an.col);
    ctx.fillStyle = bg; ctx.globalAlpha = 0.92;
    ctx.beginPath();
    ctx.ellipse(0,-an.baseH*0.5,8,an.baseH*0.55,0,0,Math.PI*2);
    ctx.fill();
    // Tentacles
    for (let i=0; i<an.tents; i++) {
      const ba  = (i/an.tents)*Math.PI*2;
      const spr = 8+i%2*4;
      const bx  = Math.cos(ba)*spr*0.4;
      const sw  = Math.sin(t*1.3+an.phase+i*0.65)*13;
      const tx  = Math.cos(ba)*spr+sw;
      const ty  = -an.baseH-an.tentH;
      const tg  = ctx.createLinearGradient(bx,-an.baseH,tx,ty);
      tg.addColorStop(0,an.col); tg.addColorStop(1,lighter(an.col,45));
      ctx.strokeStyle = tg; ctx.lineWidth = 2; ctx.globalAlpha = 0.82;
      ctx.beginPath(); ctx.moveTo(bx,-an.baseH);
      ctx.quadraticCurveTo(bx+sw*0.5,-an.baseH-an.tentH*0.5,tx,ty);
      ctx.stroke();
      ctx.fillStyle = lighter(an.col,55); ctx.globalAlpha = 0.9;
      ctx.beginPath(); ctx.arc(tx,ty,3,0,Math.PI*2); ctx.fill();
    }
    ctx.restore(); ctx.globalAlpha=1;
  }
}

// ── Coral (4 types) ────────────────────────────────────────────────────────

function drawCoral(t) {
  ctx.lineCap = 'round';
  for (const c of coralDefs) {
    if      (c.type==='branch') drawBranchCoral(c.x,H,-Math.PI/2,c.h,c.arms,c.col,t);
    else if (c.type==='fan')    drawFanCoral(c,t);
    else if (c.type==='brain')  drawBrainCoral(c,t);
    else                        drawTubeCoral(c,t);
  }
}

function drawBranchCoral(x,y,ang,len,depth,col,t) {
  if (depth<=0||len<3) return;
  const sw = Math.sin(t*0.5+x*0.01)*0.055;
  const ex = x+Math.cos(ang+sw)*len, ey = y+Math.sin(ang+sw)*len;
  ctx.lineWidth   = Math.max(1,depth*0.85);
  ctx.globalAlpha = 0.5+depth*0.07;
  ctx.strokeStyle = depth>2 ? col : lighter(col,22);
  ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(ex,ey); ctx.stroke();
  const sp = 0.36+0.08*depth;
  drawBranchCoral(ex,ey,ang-sp,len*0.68,depth-1,col,t);
  drawBranchCoral(ex,ey,ang+sp,len*0.68,depth-1,col,t);
  ctx.globalAlpha=1;
}

function drawFanCoral(c,t) {
  ctx.save(); ctx.translate(c.x,H);
  ctx.rotate(Math.sin(t*0.4+c.x)*0.055);
  const steps = c.arms*3;
  for (let i=0; i<steps; i++) {
    const a = -Math.PI*0.78+(i/(steps-1))*Math.PI*1.56;
    ctx.strokeStyle = i%2===0 ? c.col : lighter(c.col,20);
    ctx.lineWidth=0.9; ctx.globalAlpha=0.5;
    ctx.beginPath(); ctx.moveTo(0,0);
    ctx.quadraticCurveTo(Math.cos(a)*c.h*0.45,-c.h*0.5,
                          Math.cos(a)*c.h*0.8,Math.sin(a)*c.h-Math.abs(Math.sin(a))*c.h*0.1);
    ctx.stroke();
  }
  // Cross-arc mesh
  for (let i=1; i<=5; i++) {
    ctx.globalAlpha=0.22; ctx.lineWidth=0.6; ctx.strokeStyle=c.col;
    ctx.beginPath(); ctx.arc(0,0,c.h*i/6,-Math.PI*0.78,0,false); ctx.stroke();
  }
  ctx.restore(); ctx.globalAlpha=1;
}

function drawBrainCoral(c,t) {
  ctx.save(); ctx.translate(c.x, H-c.h*0.28);
  const r = c.h*0.44;
  const bg = ctx.createRadialGradient(0,-r*0.2,0,0,0,r*1.2);
  bg.addColorStop(0,lighter(c.col,30)); bg.addColorStop(0.6,c.col); bg.addColorStop(1,darker(c.col,20));
  ctx.fillStyle=bg; ctx.globalAlpha=0.88;
  ctx.beginPath(); ctx.ellipse(0,0,r,r*0.68,0,Math.PI,0); ctx.fill();
  // Wavy grooves
  ctx.strokeStyle=darker(c.col,30); ctx.lineWidth=1.5; ctx.globalAlpha=0.45;
  for (let i=-3; i<=3; i++) {
    ctx.beginPath();
    const by = i*(r*0.19);
    for (let x=-r*0.88; x<=r*0.88; x+=3) {
      const ny = by+Math.sin(x*0.14+i+t*0.08)*5.5;
      const maxY = -Math.sqrt(Math.max(0,r*r-x*x))*0.66;
      if (ny>maxY && ny<0) {
        if (x<=-r*0.85) ctx.moveTo(x,ny); else ctx.lineTo(x,ny);
      }
    }
    ctx.stroke();
  }
  ctx.restore(); ctx.globalAlpha=1;
}

function drawTubeCoral(c,t) {
  const count = 3+c.arms;
  ctx.save();
  for (let i=0; i<count; i++) {
    const tx = c.x+(i-count/2)*13+(i%2)*6;
    const th = c.h*(0.65+Math.sin(i*1.3)*0.28);
    const sw = Math.sin(t*0.6+i+c.x)*0.045;
    ctx.save(); ctx.translate(tx,H); ctx.rotate(sw);
    const tg = ctx.createLinearGradient(0,0,0,-th);
    tg.addColorStop(0,darker(c.col,35)); tg.addColorStop(1,c.col);
    ctx.fillStyle=tg; ctx.globalAlpha=0.82;
    ctx.beginPath(); ctx.rect(-4,-th,8,th); ctx.fill();
    // Opening rim
    ctx.fillStyle=darker(c.col,50); ctx.globalAlpha=0.9;
    ctx.beginPath(); ctx.ellipse(0,-th,5,2.5,0,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle=lighter(c.col,40); ctx.lineWidth=1; ctx.globalAlpha=0.4;
    ctx.beginPath(); ctx.ellipse(0,-th,4.2,2,0,0,Math.PI*2); ctx.stroke();
    ctx.restore();
  }
  ctx.restore(); ctx.globalAlpha=1;
}

// ── Bubbles ────────────────────────────────────────────────────────────────

function drawBubble(b) {
  const wx = Math.sin(b.t*1.5+b.wobble)*4;
  ctx.save(); ctx.translate(b.x+wx, b.y);
  const g = ctx.createRadialGradient(-b.r*0.3,-b.r*0.35,b.r*0.05,0,0,b.r);
  g.addColorStop(0,'rgba(255,255,255,0.88)');
  g.addColorStop(0.28,'rgba(175,228,255,0.28)');
  g.addColorStop(1,'rgba(80,160,220,0.02)');
  ctx.fillStyle=g; ctx.strokeStyle='rgba(175,228,255,0.48)'; ctx.lineWidth=0.8;
  ctx.globalAlpha=0.38;
  ctx.beginPath(); ctx.arc(0,0,b.r,0,Math.PI*2); ctx.fill(); ctx.stroke();
  // Specular
  ctx.fillStyle='rgba(255,255,255,0.8)'; ctx.globalAlpha=0.28;
  ctx.beginPath(); ctx.ellipse(-b.r*0.28,-b.r*0.32,b.r*0.22,b.r*0.11,-0.5,0,Math.PI*2); ctx.fill();
  ctx.restore();
}

// ── Fish: shared helpers ───────────────────────────────────────────────────

function drawEye(x, y, r, irisCol) {
  ctx.fillStyle='#EEF0F0'; ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill();
  ctx.fillStyle=irisCol;   ctx.beginPath(); ctx.arc(x+r*0.15,y,r*0.65,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#111';    ctx.beginPath(); ctx.arc(x+r*0.2,y,r*0.36,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='rgba(255,255,255,0.85)';
  ctx.beginPath(); ctx.arc(x+r*0.04,y-r*0.26,r*0.2,0,Math.PI*2); ctx.fill();
}

function glow(col, blur) {
  ctx.shadowColor = col;
  ctx.shadowBlur  = blur;
}
function clearGlow() { ctx.shadowBlur=0; }

// ── Depth haze overlay ─────────────────────────────────────────────────────

function drawDepthHaze() {
  const g=ctx.createLinearGradient(0,H*0.5,0,H);
  g.addColorStop(0,'rgba(1,10,24,0)');
  g.addColorStop(0.62,'rgba(1,9,20,0.32)');
  g.addColorStop(1,'rgba(0,6,16,0.60)');
  ctx.fillStyle=g; ctx.fillRect(0,H*0.5,W,H*0.5);
}

// ── Marine snow ────────────────────────────────────────────────────────────

function tickMarineSnow() {
  const now=performance.now();
  for (const p of marineSnow) {
    p.x+=p.vx+Math.sin(p.ph+now*0.00027)*0.036;
    p.y+=p.vy;
    if (p.y>H+4) { p.y=-4; p.x=Math.random()*W; }
    if (p.x<-4) p.x=W+4; if (p.x>W+4) p.x=-4;
  }
}
function drawMarineSnow() {
  for (const p of marineSnow) {
    ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
    ctx.fillStyle=`rgba(208,228,255,${p.a})`; ctx.fill();
  }
}

// ── Sea urchins ────────────────────────────────────────────────────────────

function drawSeaUrchin(u) {
  const y=H-u.r*0.38;
  ctx.save(); ctx.translate(u.x,y);
  // Shadow
  ctx.fillStyle='rgba(0,0,0,0.2)';
  ctx.beginPath(); ctx.ellipse(2,3,u.r*1.12,u.r*0.35,0,0,Math.PI*2); ctx.fill();
  // Spines
  ctx.strokeStyle=lighter(u.col,22); ctx.lineWidth=0.85; ctx.globalAlpha=0.8;
  for (let i=0;i<u.spines;i++) {
    const a=(i/u.spines)*Math.PI*2;
    const len=u.r*(1.35+Math.sin(i*2.3)*0.22);
    ctx.beginPath();
    ctx.moveTo(Math.cos(a)*u.r*0.65,Math.sin(a)*u.r*0.65);
    ctx.lineTo(Math.cos(a)*len,Math.sin(a)*len); ctx.stroke();
  }
  // Body
  const ug=ctx.createRadialGradient(-u.r*0.28,-u.r*0.3,0,0,0,u.r*0.82);
  ug.addColorStop(0,lighter(u.col,30)); ug.addColorStop(1,u.col);
  ctx.fillStyle=ug; ctx.globalAlpha=0.9;
  ctx.beginPath(); ctx.arc(0,0,u.r*0.7,0,Math.PI*2); ctx.fill();
  // Highlight
  ctx.fillStyle='rgba(255,255,255,0.25)'; ctx.globalAlpha=0.6;
  ctx.beginPath(); ctx.arc(-u.r*0.28,-u.r*0.3,u.r*0.17,0,Math.PI*2); ctx.fill();
  ctx.restore(); ctx.globalAlpha=1;
}

// ── Clams ──────────────────────────────────────────────────────────────────

function drawClam(c,t) {
  const open=Math.max(0,Math.sin(t*0.28+c.phase))*0.52;
  ctx.save(); ctx.translate(c.x,H);
  // Shadow
  ctx.fillStyle='rgba(0,0,0,0.18)';
  ctx.beginPath(); ctx.ellipse(2,-1,c.w*1.05,c.w*0.26,0,0,Math.PI*2); ctx.fill();
  // Bottom shell (flat at floor, curved upward)
  const bg=ctx.createRadialGradient(-c.w*0.2,-c.w*0.1,0,0,0,c.w);
  bg.addColorStop(0,lighter(c.col,28)); bg.addColorStop(1,c.col);
  ctx.fillStyle=bg; ctx.globalAlpha=0.92;
  ctx.beginPath();
  ctx.ellipse(0,0,c.w,c.w*0.4,0,0,Math.PI,true); ctx.closePath(); ctx.fill();
  // Bottom ridges
  ctx.strokeStyle=darker(c.col,22); ctx.lineWidth=0.55; ctx.globalAlpha=0.38;
  for (let i=1;i<=4;i++) {
    ctx.beginPath(); ctx.ellipse(0,0,c.w*i/4.5,c.w*0.38*i/4.5,0,0,Math.PI,true); ctx.stroke();
  }
  // Top shell (hinges open)
  ctx.save(); ctx.rotate(-open);
  const tg=ctx.createRadialGradient(-c.w*0.15,-c.w*0.06,0,0,0,c.w);
  tg.addColorStop(0,lighter(c.col,20)); tg.addColorStop(1,darker(c.col,8));
  ctx.fillStyle=tg; ctx.globalAlpha=0.88;
  ctx.beginPath();
  ctx.ellipse(0,0,c.w*0.94,c.w*0.36,0,0,Math.PI,true); ctx.closePath(); ctx.fill();
  ctx.strokeStyle=darker(c.col,20); ctx.lineWidth=0.55; ctx.globalAlpha=0.32;
  for (let i=1;i<=4;i++) {
    ctx.beginPath(); ctx.ellipse(0,0,c.w*0.94*i/4.5,c.w*0.32*i/4.5,0,0,Math.PI,true); ctx.stroke();
  }
  ctx.restore();
  // Pearl visible when open
  if (open>0.1) {
    const pa=Math.min(1,(open-0.1)*3.5)*0.78;
    ctx.fillStyle=`rgba(232,242,255,${pa})`; ctx.globalAlpha=pa;
    ctx.beginPath(); ctx.arc(-c.w*0.03,-c.w*0.28,c.w*0.12,0,Math.PI*2); ctx.fill();
    ctx.fillStyle=`rgba(255,255,255,${pa*0.5})`;
    ctx.beginPath(); ctx.arc(-c.w*0.07,-c.w*0.33,c.w*0.048,0,Math.PI*2); ctx.fill();
  }
  ctx.restore(); ctx.globalAlpha=1;
}

// ── Crabs ──────────────────────────────────────────────────────────────────

function tickCrabs(dt) {
  for (const c of crabs) {
    c.x+=c.vx*60*dt; c.phase+=dt*2.4;
    if (c.x<c.r+12) c.vx=Math.abs(c.vx);
    if (c.x>W-c.r-12) c.vx=-Math.abs(c.vx);
    if (Math.random()<0.004) c.vx=(Math.random()-0.5)*0.28;
  }
}

function drawCrab(c,t) {
  const y=H-c.r*0.26, walk=Math.sin(c.phase);
  ctx.save(); ctx.translate(c.x,y); ctx.scale(c.vx>=0?1:-1,1);
  // Shadow
  ctx.fillStyle='rgba(0,0,0,0.16)';
  ctx.beginPath(); ctx.ellipse(1,3,c.r*1.5,c.r*0.36,0,0,Math.PI*2); ctx.fill();
  // Legs (3 visible pairs)
  ctx.lineCap='round';
  for (let i=0;i<3;i++) {
    const lx=(i-1)*c.r*0.38, w1=walk*(i%2===0?1:-1)*0.28;
    ctx.strokeStyle=darker(c.col,18); ctx.lineWidth=1.1; ctx.globalAlpha=0.75;
    ctx.beginPath(); ctx.moveTo(lx,-c.r*0.16);
    ctx.lineTo(lx-c.r*0.34,c.r*(0.48+w1)); ctx.lineTo(lx-c.r*0.58,c.r*0.08); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(lx,-c.r*0.16);
    ctx.lineTo(lx+c.r*0.28,c.r*(0.42-w1)); ctx.lineTo(lx+c.r*0.52,c.r*0.1); ctx.stroke();
  }
  // Claws
  const clawW=Math.sin(c.phase*0.55)*0.16;
  ctx.globalAlpha=0.9;
  for (const side of [-1,1]) {
    ctx.save(); ctx.translate(c.r*0.6,side*c.r*0.1); ctx.rotate(side*(0.22+clawW));
    ctx.fillStyle=c.col;
    ctx.beginPath(); ctx.ellipse(0,0,c.r*0.38,c.r*0.22,0,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle=darker(c.col,28); ctx.lineWidth=0.82;
    ctx.beginPath(); ctx.arc(c.r*0.3,0,c.r*0.11,-0.5,0.5); ctx.stroke();
    ctx.restore();
  }
  // Body carapace
  const bg=ctx.createRadialGradient(-c.r*0.18,-c.r*0.2,0,0,0,c.r*0.88);
  bg.addColorStop(0,lighter(c.col,38)); bg.addColorStop(0.55,c.col); bg.addColorStop(1,darker(c.col,22));
  ctx.fillStyle=bg; ctx.globalAlpha=0.95;
  ctx.beginPath(); ctx.ellipse(0,0,c.r*0.8,c.r*0.54,0,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle=darker(c.col,18); ctx.lineWidth=0.6; ctx.globalAlpha=0.26;
  ctx.beginPath(); ctx.ellipse(0,0,c.r*0.48,c.r*0.3,0,0,Math.PI*2); ctx.stroke();
  // Eye stalks
  for (const side of [-1,1]) {
    const ex=c.r*0.56, ey=side*c.r*0.22;
    ctx.strokeStyle=darker(c.col,15); ctx.lineWidth=1.2; ctx.globalAlpha=0.82;
    ctx.beginPath(); ctx.moveTo(c.r*0.38,side*c.r*0.1); ctx.lineTo(ex,ey); ctx.stroke();
    ctx.fillStyle='#111'; ctx.globalAlpha=1;
    ctx.beginPath(); ctx.arc(ex,ey,c.r*0.1,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='rgba(255,255,255,0.62)';
    ctx.beginPath(); ctx.arc(ex-c.r*0.03,ey-c.r*0.04,c.r*0.04,0,Math.PI*2); ctx.fill();
  }
  ctx.restore(); ctx.globalAlpha=1;
}

// ── Manta ray ──────────────────────────────────────────────────────────────

function tickManta(dt) {
  manta.t+=dt;
  if (manta.delay>0) { manta.delay-=dt; return; }
  manta.x+=manta.vx*60*dt;
  manta.y+=Math.sin(manta.t*0.22)*0.28;
  if ((manta.flip>0&&manta.x>W+500)||(manta.flip<0&&manta.x<-500)) resetManta();
}

function _drawMantaWings(s,flap,col) {
  for (const side of [-1,1]) {
    ctx.save(); ctx.scale(1,side);
    ctx.fillStyle=col;
    ctx.beginPath(); ctx.moveTo(s*0.38,0);
    ctx.bezierCurveTo(s*0.16,s*(0.38+flap),-s*0.12,s*(0.54+flap),-s*0.3,s*0.18);
    ctx.bezierCurveTo(-s*0.18,s*0.06,-s*0.04,s*0.01,s*0.38,0);
    ctx.fill(); ctx.restore();
  }
}

function drawManta() {
  if (manta.delay>0) return;
  const {x,y,flip,t}=manta, s=52;
  ctx.save(); ctx.translate(x,y); ctx.scale(flip,1);
  const flap=Math.sin(t*0.88)*0.14;
  // Wing shadow
  ctx.save(); ctx.translate(5,6); ctx.globalAlpha=0.28;
  _drawMantaWings(s,flap,'rgba(0,0,0,1)'); ctx.restore();
  // Wings
  ctx.globalAlpha=0.8; _drawMantaWings(s,flap,'#0C1E35');
  // Body disc
  const mg=ctx.createRadialGradient(-s*0.08,-s*0.06,0,0,0,s*0.44);
  mg.addColorStop(0,'#284E6C'); mg.addColorStop(1,'#0C1E35');
  ctx.fillStyle=mg; ctx.globalAlpha=0.92;
  ctx.beginPath(); ctx.ellipse(0,0,s*0.44,s*0.22,0,0,Math.PI*2); ctx.fill();
  // Belly highlight
  ctx.fillStyle='rgba(175,215,255,0.14)';
  ctx.beginPath(); ctx.ellipse(s*0.04,s*0.04,s*0.19,s*0.1,0.2,0,Math.PI*2); ctx.fill();
  // Cephalic lobes
  ctx.fillStyle='#0C1E35'; ctx.globalAlpha=0.88;
  for (const side of [-1,1]) {
    ctx.save(); ctx.scale(1,side);
    ctx.beginPath(); ctx.moveTo(s*0.37,-s*0.04);
    ctx.bezierCurveTo(s*0.54,-s*0.17,s*0.56,-s*0.26,s*0.42,-s*0.1);
    ctx.bezierCurveTo(s*0.38,-s*0.06,s*0.37,-s*0.04,s*0.37,-s*0.04);
    ctx.fill(); ctx.restore();
  }
  drawEye(s*0.22,-s*0.04,s*0.044,'#0A1824');
  // Tail
  ctx.strokeStyle='#091828'; ctx.lineWidth=2.4; ctx.lineCap='round'; ctx.globalAlpha=0.72;
  ctx.beginPath(); ctx.moveTo(-s*0.4,0);
  ctx.bezierCurveTo(-s*0.75,s*0.05,-s*1.15,-s*0.04,-s*1.65,s*0.06); ctx.stroke();
  ctx.lineWidth=0.9; ctx.globalAlpha=0.44;
  ctx.beginPath(); ctx.moveTo(-s*1.65,s*0.06);
  ctx.bezierCurveTo(-s*1.95,-s*0.01,-s*2.1,s*0.04,-s*2.4,0); ctx.stroke();
  ctx.restore(); ctx.globalAlpha=1;
}

function drawFins(shapes) {
  // shapes = [{path fn, col, alpha}]
  for (const {draw,col,a} of shapes) {
    ctx.save(); ctx.globalAlpha*=a; ctx.fillStyle=col; draw(); ctx.fill(); ctx.restore();
  }
}

// ── Bioluminescent particles ────────────────────────────────────────────────

function tickBioParticles(dt) {
  const now=performance.now();
  for (const p of bioParticles) {
    p.x+=p.vx+Math.sin(p.ph+now*0.00028)*0.03;
    p.y+=p.vy+Math.cos(p.ph*0.72+now*0.00022)*0.022;
    p.ph+=dt*0.38;
    if (p.y<H*0.46) p.y=H*0.96+Math.random()*H*0.03;
    if (p.y>H+4)    p.y=H*0.5;
    if (p.x<-5) p.x=W+5; if (p.x>W+5) p.x=-5;
  }
}
function drawBioParticles(t) {
  for (const p of bioParticles) {
    const pulse=0.45+Math.sin(t*2.4+p.ph)*0.35;
    ctx.save();
    glow(p.col, p.gr*pulse);
    ctx.globalAlpha=0.16*pulse;
    ctx.fillStyle=p.col;
    ctx.beginPath(); ctx.arc(p.x,p.y,p.r*2.2,0,Math.PI*2); ctx.fill();
    clearGlow();
    ctx.globalAlpha=0.55*pulse;
    ctx.fillStyle=p.col;
    ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill();
    ctx.restore();
  }
  ctx.globalAlpha=1;
}

// ── Ambient fish school ────────────────────────────────────────────────────

function tickFishSchool(dt) {
  fishSchool.turnT-=dt;
  if (fishSchool.turnT<=0) {
    fishSchool.dir+=(Math.random()-0.5)*1.55;
    fishSchool.speed=0.26+Math.random()*0.24;
    fishSchool.turnT=5+Math.random()*10;
  }
  // Soft boundary nudge
  if (fishSchool.cx<W*0.1)  fishSchool.dir+=(0-fishSchool.dir)*0.05;
  if (fishSchool.cx>W*0.9)  fishSchool.dir+=(Math.PI-fishSchool.dir)*0.05;
  if (fishSchool.cy<H*0.1)  fishSchool.vy+=0.04;
  if (fishSchool.cy>H*0.7)  fishSchool.vy-=0.04;
  // Smooth velocity towards target direction
  fishSchool.vx+=(Math.cos(fishSchool.dir)*fishSchool.speed - fishSchool.vx)*0.04;
  fishSchool.vy+=(Math.sin(fishSchool.dir)*fishSchool.speed - fishSchool.vy)*0.04;
  fishSchool.cx+=fishSchool.vx*60*dt;
  fishSchool.cy+=fishSchool.vy*60*dt;
  for (const m of fishSchool.members) {
    const lag=0.04+Math.sin(m.ph)*0.015;
    m.px+=(fishSchool.cx+m.ox-m.px)*lag;
    m.py+=(fishSchool.cy+m.oy-m.py)*lag;
    m.ph+=dt*0.7;
  }
}
function drawFishSchool(t) {
  const ang=Math.atan2(fishSchool.vy,fishSchool.vx);
  ctx.save();
  for (const m of fishSchool.members) {
    ctx.save();
    ctx.translate(m.px,m.py);
    ctx.rotate(ang+Math.sin(m.ph)*0.1);
    const a=0.26+(1-m.py/H)*0.2;
    ctx.globalAlpha=a;
    ctx.fillStyle='#14263A';
    // Body
    ctx.beginPath(); ctx.ellipse(0,0,m.sz,m.sz*0.4,0,0,Math.PI*2); ctx.fill();
    // Forked tail
    ctx.beginPath();
    ctx.moveTo(-m.sz*0.85,0);
    ctx.lineTo(-m.sz*1.45,-m.sz*0.56);
    ctx.lineTo(-m.sz*1.3,0);
    ctx.lineTo(-m.sz*1.45,m.sz*0.56);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  ctx.restore(); ctx.globalAlpha=1;
}

// ── Seahorse ───────────────────────────────────────────────────────────────

function drawSeahorse(sh, t) {
  const s=sh.size;
  const sway=Math.sin(t*1.1+sh.phase)*4.5;
  const bob =Math.cos(t*0.85+sh.phase)*2.5;
  ctx.save();
  ctx.translate(sh.x+sway, sh.y+bob);
  ctx.scale(sh.facing, 1);

  // Coiled tail
  ctx.strokeStyle=sh.col; ctx.lineCap='round'; ctx.lineJoin='round';
  ctx.lineWidth=s*0.22; ctx.globalAlpha=0.88;
  ctx.beginPath();
  ctx.moveTo(0,0);
  ctx.bezierCurveTo(s*0.32,s*0.28,s*0.5,s*0.55,s*0.3,s*0.72);
  ctx.bezierCurveTo(s*0.1,s*0.88,-s*0.2,s*0.78,-s*0.18,s*0.6);
  ctx.stroke();

  // Body column
  ctx.lineWidth=s*0.26; ctx.strokeStyle=sh.col; ctx.globalAlpha=0.9;
  ctx.beginPath();
  ctx.moveTo(0,-s*0.62); ctx.bezierCurveTo(s*0.05,-s*0.3,s*0.04,-s*0.1,0,0); ctx.stroke();

  // Bony segment rings
  ctx.strokeStyle=darker(sh.col,28); ctx.lineWidth=0.85; ctx.globalAlpha=0.48;
  for (let i=0;i<5;i++) {
    const ry=-s*0.56+i*s*0.13, rw=s*(0.14-i*0.012);
    ctx.beginPath(); ctx.moveTo(-rw,ry); ctx.lineTo(rw,ry); ctx.stroke();
  }

  // Fluttering dorsal fin
  ctx.globalAlpha=0.52; ctx.fillStyle=lighter(sh.col,32);
  const dfx=s*0.36+Math.sin(t*9+sh.phase)*s*0.06;
  ctx.beginPath();
  ctx.moveTo(s*0.13,-s*0.52);
  ctx.bezierCurveTo(dfx,-s*0.6,dfx+s*0.04,-s*0.68,s*0.15,-s*0.68);
  ctx.bezierCurveTo(s*0.06,-s*0.64,s*0.06,-s*0.58,s*0.13,-s*0.52);
  ctx.fill();

  // Neck/throat pouch
  const hg=ctx.createRadialGradient(s*0.04,-s*0.72,0,0,-s*0.68,s*0.24);
  hg.addColorStop(0,lighter(sh.col,24)); hg.addColorStop(1,sh.col);
  ctx.fillStyle=hg; ctx.globalAlpha=0.92;
  ctx.beginPath(); ctx.ellipse(s*0.06,-s*0.7,s*0.17,s*0.22,0.28,0,Math.PI*2); ctx.fill();

  // Head
  ctx.fillStyle=lighter(sh.col,14);
  ctx.beginPath();
  ctx.moveTo(0,-s*0.86);
  ctx.bezierCurveTo(-s*0.14,-s*0.92,-s*0.2,-s*1.04,-s*0.14,-s*1.12);
  ctx.bezierCurveTo(-s*0.06,-s*1.2,s*0.1,-s*1.18,s*0.14,-s*1.08);
  ctx.bezierCurveTo(s*0.18,-s*0.98,s*0.16,-s*0.88,s*0.08,-s*0.84);
  ctx.bezierCurveTo(s*0.04,-s*0.82,s*0.02,-s*0.84,0,-s*0.86);
  ctx.fill();

  // Snout (tube)
  ctx.save(); ctx.strokeStyle=sh.col; ctx.lineWidth=s*0.1; ctx.lineCap='round'; ctx.globalAlpha=0.9;
  ctx.beginPath(); ctx.moveTo(-s*0.06,-s*1.08); ctx.lineTo(-s*0.28,-s*1.24); ctx.stroke(); ctx.restore();

  // Coronet spines
  ctx.fillStyle=lighter(sh.col,20); ctx.globalAlpha=0.72;
  for (let i=0;i<4;i++) {
    const cx=s*(-0.04+i*0.044);
    ctx.beginPath(); ctx.moveTo(cx,-s*1.17);
    ctx.lineTo(cx+s*0.015,-s*1.27); ctx.lineTo(cx+s*0.03,-s*1.17);
    ctx.closePath(); ctx.fill();
  }

  // Eye
  ctx.globalAlpha=1;
  ctx.fillStyle='#DDD'; ctx.beginPath(); ctx.arc(-s*0.01,-s*1.03,s*0.068,0,Math.PI*2); ctx.fill();
  ctx.fillStyle=lighter(sh.col,35); ctx.beginPath(); ctx.arc(-s*0.01,-s*1.03,s*0.04,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#111'; ctx.beginPath(); ctx.arc(s*0.004,-s*1.03,s*0.028,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='rgba(255,255,255,0.55)'; ctx.beginPath(); ctx.arc(-s*0.016,-s*1.046,s*0.02,0,Math.PI*2); ctx.fill();

  // Pectoral fin
  ctx.fillStyle=lighter(sh.col,22); ctx.globalAlpha=0.48;
  ctx.beginPath(); ctx.ellipse(s*0.2,-s*0.62,s*0.14,s*0.08,-0.4,0,Math.PI*2); ctx.fill();

  ctx.restore(); ctx.globalAlpha=1;
}

// ── Whale shark ────────────────────────────────────────────────────────────

function tickWhaleshark(dt) {
  whaleshark.t+=dt;
  if (whaleshark.delay>0) { whaleshark.delay-=dt; return; }
  whaleshark.x+=whaleshark.vx*60*dt;
  whaleshark.y+=Math.sin(whaleshark.t*0.18)*0.22;
  if ((whaleshark.flip>0&&whaleshark.x>W+700)||(whaleshark.flip<0&&whaleshark.x<-700)) resetWhaleshark();
}
function drawWhaleshark() {
  if (whaleshark.delay>0) return;
  const {x,y,flip,t}=whaleshark, s=200;
  ctx.save();
  ctx.translate(x,y); ctx.scale(flip,1);
  ctx.globalAlpha=0.14;
  ctx.rotate(Math.sin(t*0.85)*0.025);

  const col='#1C3048';

  // Tail (heterocercal, large)
  ctx.fillStyle=col;
  ctx.beginPath();
  ctx.moveTo(-s*0.8,s*0.02);
  ctx.bezierCurveTo(-s*0.9,-s*0.06,-s*1.0,-s*0.3,-s*1.08,-s*0.42);
  ctx.bezierCurveTo(-s*0.96,-s*0.24,-s*0.85,-s*0.08,-s*0.8,s*0.02);
  ctx.bezierCurveTo(-s*0.86,s*0.06,-s*0.96,s*0.22,-s*1.02,s*0.3);
  ctx.bezierCurveTo(-s*0.94,s*0.18,-s*0.84,s*0.07,-s*0.8,s*0.02);
  ctx.fill();

  // Body — broad, rounded, whale-shark shape
  ctx.beginPath();
  ctx.moveTo(s*0.55,-s*0.02);
  ctx.bezierCurveTo(s*0.46,-s*0.14,s*0.24,-s*0.24,0,-s*0.26);
  ctx.bezierCurveTo(-s*0.34,-s*0.24,-s*0.62,-s*0.18,-s*0.8,-s*0.06);
  ctx.bezierCurveTo(-s*0.62,s*0.2,-s*0.34,s*0.28,0,s*0.3);
  ctx.bezierCurveTo(s*0.24,s*0.28,s*0.46,s*0.2,s*0.55,s*0.04);
  ctx.closePath(); ctx.fill();

  // Dorsal fin
  ctx.beginPath();
  ctx.moveTo(-s*0.05,-s*0.26);
  ctx.bezierCurveTo(-s*0.08,-s*0.48,s*0.06,-s*0.58,s*0.14,-s*0.26);
  ctx.closePath(); ctx.fill();

  // Pectoral fins
  ctx.beginPath();
  ctx.moveTo(s*0.22,s*0.18);
  ctx.bezierCurveTo(s*0.08,s*0.42,-s*0.1,s*0.56,-s*0.2,s*0.46);
  ctx.bezierCurveTo(-s*0.1,s*0.3,s*0.06,s*0.2,s*0.22,s*0.18);
  ctx.fill();

  // Second dorsal + anal fin
  ctx.beginPath(); ctx.moveTo(-s*0.45,-s*0.22); ctx.lineTo(-s*0.55,-s*0.36); ctx.lineTo(-s*0.65,-s*0.22); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-s*0.48,s*0.2);   ctx.lineTo(-s*0.58,s*0.34);  ctx.lineTo(-s*0.68,s*0.2);  ctx.closePath(); ctx.fill();

  // Spots (distinctive whale shark pattern)
  ctx.fillStyle='rgba(255,255,255,0.6)';
  const spots=[
    [0.18,-s*0.08,s*0.042],[-s*0.08,-s*0.14,s*0.038],[-s*0.28,-s*0.1,s*0.04],
    [s*0.06,s*0.12,s*0.032],[-s*0.18,s*0.14,s*0.036],[-s*0.42,-s*0.06,s*0.04],
    [s*0.34,-s*0.05,s*0.03],[s*0.0,-s*0.04,s*0.028],[-s*0.55,s*0.08,s*0.032],
    [s*0.22,s*0.2,s*0.026],[-s*0.34,s*0.16,s*0.032],[s*0.12,-s*0.18,s*0.024],
    [-s*0.62,-s*0.04,s*0.028],[-s*0.15,s*0.05,s*0.03],[s*0.4,s*0.1,s*0.022],
    [-s*0.48,s*0.12,s*0.03],[s*0.28,-s*0.14,s*0.022],[-s*0.68,s*0.0,s*0.024],
  ];
  for (const [sx,sy,sr] of spots) {
    ctx.beginPath(); ctx.arc(sx,sy,sr,0,Math.PI*2); ctx.fill();
  }

  ctx.restore(); ctx.globalAlpha=1;
}

// ── Shark ──────────────────────────────────────────────────────────────────

function tickShark(dt) {
  shark.t+=dt;
  if (shark.delay>0) { shark.delay-=dt; return; }
  shark.x+=shark.vx*60*dt;
  shark.y+=Math.sin(shark.t*0.28)*0.3;
  if ((shark.flip>0&&shark.x>W+360)||(shark.flip<0&&shark.x<-360)) resetShark();
}

function drawShark() {
  if (shark.delay>0) return;
  const {x,y,flip,t}=shark, s=75;
  ctx.save();
  ctx.translate(x,y); ctx.scale(flip,1);

  const wb=Math.sin(t*1.7)*0.055;
  ctx.rotate(wb*0.4);

  // Drop shadow
  ctx.save(); ctx.translate(6,8); ctx.globalAlpha=0.22;
  ctx.fillStyle='rgba(0,0,0,1)';
  ctx.beginPath();
  ctx.moveTo(s*1.06,0);
  ctx.bezierCurveTo(s*0.75,-s*0.16,s*0.2,-s*0.22,-s*0.5,-s*0.14);
  ctx.bezierCurveTo(-s*0.72,-s*0.1,-s*0.9,-s*0.03,-s*0.92,0);
  ctx.bezierCurveTo(-s*0.9,s*0.1,-s*0.72,s*0.16,-s*0.5,s*0.18);
  ctx.bezierCurveTo(s*0.2,s*0.28,s*0.75,s*0.18,s*1.06,0);
  ctx.fill();
  ctx.restore();

  // Heterocercal tail
  ctx.save(); ctx.translate(-s*0.9,0); ctx.rotate(wb*2.8);
  const tc='#374E64';
  // Upper lobe (larger)
  ctx.fillStyle=tc; ctx.globalAlpha=0.92;
  ctx.beginPath();
  ctx.moveTo(0,s*0.02);
  ctx.bezierCurveTo(-s*0.18,-s*0.08,-s*0.52,-s*0.44,-s*0.64,-s*0.6);
  ctx.bezierCurveTo(-s*0.48,-s*0.38,-s*0.18,-s*0.18,0,s*0.02);
  ctx.fill();
  // Lower lobe (smaller)
  ctx.beginPath();
  ctx.moveTo(0,s*0.02);
  ctx.bezierCurveTo(-s*0.14,s*0.1,-s*0.36,s*0.28,-s*0.4,s*0.38);
  ctx.bezierCurveTo(-s*0.28,s*0.22,-s*0.1,s*0.1,0,s*0.02);
  ctx.fill();
  ctx.restore();

  // Body — grey on top, white belly (counter-shading)
  const bodyG=ctx.createLinearGradient(0,-s*0.22,0,s*0.22);
  bodyG.addColorStop(0,  '#4A6478');
  bodyG.addColorStop(0.3,'#3C566C');
  bodyG.addColorStop(0.62,'#D8E8F2');
  bodyG.addColorStop(1,  '#C8DCF0');
  ctx.fillStyle=bodyG; ctx.globalAlpha=0.96;
  ctx.beginPath();
  ctx.moveTo(s*1.06,0);
  ctx.bezierCurveTo(s*0.75,-s*0.16,s*0.2,-s*0.22,-s*0.5,-s*0.14);
  ctx.bezierCurveTo(-s*0.72,-s*0.1,-s*0.9,-s*0.03,-s*0.92,0);
  ctx.bezierCurveTo(-s*0.9,s*0.1,-s*0.72,s*0.16,-s*0.5,s*0.18);
  ctx.bezierCurveTo(s*0.2,s*0.28,s*0.75,s*0.18,s*1.06,0);
  ctx.fill();

  // Counter-shade edge line
  ctx.save(); ctx.strokeStyle='rgba(180,210,235,0.38)'; ctx.lineWidth=1.1; ctx.globalAlpha=0.5;
  ctx.beginPath();
  ctx.moveTo(s*0.82,s*0.09);
  ctx.bezierCurveTo(s*0.4,s*0.22,-s*0.18,s*0.16,-s*0.72,s*0.08);
  ctx.stroke(); ctx.restore();

  // Gill slits (5 slits)
  ctx.save(); ctx.strokeStyle='rgba(38,58,80,0.5)'; ctx.lineWidth=1.3; ctx.lineCap='round'; ctx.globalAlpha=0.65;
  for (let i=0;i<5;i++) {
    const gx=s*0.48-i*s*0.1;
    ctx.beginPath();
    ctx.moveTo(gx,-s*0.1-i*s*0.008);
    ctx.lineTo(gx-s*0.02,s*0.06+i*s*0.005);
    ctx.stroke();
  }
  ctx.restore();

  // Dorsal fin — iconic tall triangle
  ctx.fillStyle='#374E64'; ctx.globalAlpha=0.94;
  ctx.beginPath();
  ctx.moveTo(s*0.08,-s*0.22);
  ctx.bezierCurveTo(s*0.06,-s*0.72,s*0.26,-s*0.9,s*0.34,-s*0.22);
  ctx.closePath(); ctx.fill();
  // Leading-edge highlight
  ctx.save(); ctx.strokeStyle='rgba(90,130,165,0.4)'; ctx.lineWidth=0.9; ctx.globalAlpha=0.55;
  ctx.beginPath();
  ctx.moveTo(s*0.08,-s*0.22);
  ctx.bezierCurveTo(s*0.06,-s*0.72,s*0.26,-s*0.9,s*0.34,-s*0.22);
  ctx.stroke(); ctx.restore();

  // Second (smaller) dorsal near tail
  ctx.fillStyle='#374E64'; ctx.globalAlpha=0.82;
  ctx.beginPath();
  ctx.moveTo(-s*0.52,-s*0.12);
  ctx.lineTo(-s*0.64,-s*0.28);
  ctx.lineTo(-s*0.74,-s*0.12);
  ctx.closePath(); ctx.fill();

  // Pectoral fin (large, swept back)
  ctx.fillStyle='#42607A'; ctx.globalAlpha=0.88;
  ctx.beginPath();
  ctx.moveTo(s*0.42,s*0.12);
  ctx.bezierCurveTo(s*0.28,s*0.32,s*0.02,s*0.55,-s*0.1,s*0.44);
  ctx.bezierCurveTo(-s*0.02,s*0.28,s*0.22,s*0.14,s*0.42,s*0.12);
  ctx.fill();

  // Pelvic fin
  ctx.fillStyle='#374E64'; ctx.globalAlpha=0.74;
  ctx.beginPath();
  ctx.moveTo(-s*0.28,s*0.14);
  ctx.lineTo(-s*0.52,s*0.32);
  ctx.lineTo(-s*0.62,s*0.14);
  ctx.closePath(); ctx.fill();

  // Anal fin
  ctx.beginPath();
  ctx.moveTo(-s*0.58,s*0.12);
  ctx.lineTo(-s*0.7,s*0.26);
  ctx.lineTo(-s*0.8,s*0.12);
  ctx.closePath(); ctx.fill();

  // Eye — cold, black, slightly blue-grey iris
  ctx.fillStyle='#C8D4DE'; ctx.globalAlpha=1;
  ctx.beginPath(); ctx.arc(s*0.74,-s*0.065,s*0.076,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#0A0F14';
  ctx.beginPath(); ctx.arc(s*0.745,-s*0.065,s*0.054,0,Math.PI*2); ctx.fill();
  // Specular glint
  ctx.fillStyle='rgba(255,255,255,0.45)';
  ctx.beginPath(); ctx.arc(s*0.73,-s*0.082,s*0.02,0,Math.PI*2); ctx.fill();

  // Snout / mouth crease
  ctx.strokeStyle='rgba(28,48,68,0.55)'; ctx.lineWidth=1.3; ctx.lineCap='round';
  ctx.beginPath();
  ctx.moveTo(s*1.04,s*0.04);
  ctx.quadraticCurveTo(s*0.9,s*0.11,s*0.76,s*0.07);
  ctx.stroke();

  // Nostril
  ctx.fillStyle='rgba(28,50,72,0.65)';
  ctx.beginPath(); ctx.ellipse(s*0.9,-s*0.042,s*0.026,s*0.016,-0.3,0,Math.PI*2); ctx.fill();

  ctx.restore(); ctx.globalAlpha=1;
}

// ── Fish dispatcher ────────────────────────────────────────────────────────

function drawFish(f, t) {
  ctx.save();
  ctx.globalAlpha = f.opacity;
  ctx.translate(f.x, f.y);

  // Tilt slightly with vertical motion
  ctx.rotate(Math.atan2(f.vy, Math.abs(f.vx))*0.45*f.facing);
  ctx.scale(f.facing, 1);

  // Subtle body glow
  if (f.opacity>0.5) {
    ctx.save();
    glow(f.color, f.size*0.9);
    ctx.globalAlpha=0.1*f.opacity;
    ctx.fillStyle=f.color;
    ctx.beginPath(); ctx.arc(0,0,f.size*0.55,0,Math.PI*2); ctx.fill();
    clearGlow();
    ctx.restore();
  }

  const wb = Math.sin(t*2.8+f.wobble);

  if      (f.shape==='jellyfish') drawJellyfish(f, t, wb);
  else if (f.kind==='http')       drawTropicalFish(f, t, wb);
  else if (f.kind==='dns')        drawSardine(f, t, wb);
  else if (f.kind==='ssh')        drawBarracuda(f, t, wb);
  else if (f.kind==='tls')        drawAngelfish(f, t, wb);
  else                            drawGenericFish(f, t, wb);

  ctx.restore();
}

// ── HTTP: wide tropical reef fish ─────────────────────────────────────────

function drawTropicalFish(f, t, wb) {
  const s = f.size, col=f.color, fin=f.fin_color;
  const tailWob = wb*0.18;

  // Caudal (tail) fin — forked
  ctx.save(); ctx.translate(-s*0.62,0); ctx.rotate(tailWob*1.6);
  const tg = ctx.createLinearGradient(0,-s*0.7,0,s*0.7);
  tg.addColorStop(0,lighter(fin,25)); tg.addColorStop(1,fin);
  ctx.fillStyle=tg; ctx.globalAlpha=0.9;
  ctx.beginPath();
  ctx.moveTo(0,0);
  ctx.bezierCurveTo(-s*0.3,-s*0.2,-s*0.82,-s*0.58,-s*0.92,-s*0.78);
  ctx.bezierCurveTo(-s*0.72,-s*0.48,-s*0.3,-s*0.15,0,0);
  ctx.bezierCurveTo(-s*0.3,s*0.15,-s*0.72,s*0.48,-s*0.92,s*0.78);
  ctx.bezierCurveTo(-s*0.82,s*0.58,-s*0.3,s*0.2,0,0);
  ctx.fill();
  ctx.restore();

  // Body — rounded clownfish shape
  const bg = ctx.createRadialGradient(-s*0.12,-s*0.3,0,0,s*0.05,s*0.98);
  bg.addColorStop(0,lighter(col,60)); bg.addColorStop(0.4,col); bg.addColorStop(1,darker(col,32));
  ctx.fillStyle=bg;
  ctx.beginPath(); ctx.ellipse(0,0,s*0.88,s*0.74,wb*0.04,0,Math.PI*2); ctx.fill();

  // Clownfish: 3 bold white bands with black outline (clipped to body)
  ctx.save();
  ctx.beginPath(); ctx.ellipse(0,0,s*0.9,s*0.76,wb*0.04,0,Math.PI*2); ctx.clip();
  const bandX = [s*0.42, -s*0.04, -s*0.48];
  const bandW = [s*0.11, s*0.13, s*0.09];
  // Black outlines first
  ctx.fillStyle='rgba(0,0,0,0.72)';
  for (let i=0; i<3; i++) {
    ctx.beginPath(); ctx.ellipse(bandX[i],0,bandW[i]+s*0.04,s*0.8,0,0,Math.PI*2); ctx.fill();
  }
  // White fill
  ctx.fillStyle='rgba(255,255,255,0.94)';
  for (let i=0; i<3; i++) {
    ctx.beginPath(); ctx.ellipse(bandX[i],0,bandW[i],s*0.74,0,0,Math.PI*2); ctx.fill();
  }
  ctx.restore();

  // Dorsal fin — tall spiny
  ctx.save(); ctx.globalAlpha=0.85;
  const dg = ctx.createLinearGradient(0,-s*0.72,0,-s*1.38);
  dg.addColorStop(0,col); dg.addColorStop(1,lighter(fin,22));
  ctx.fillStyle=dg;
  ctx.beginPath();
  ctx.moveTo(-s*0.52,-s*0.72);
  ctx.bezierCurveTo(-s*0.28,-s*1.38,s*0.12,-s*1.42,s*0.44,-s*0.72);
  ctx.closePath(); ctx.fill();
  // Spine rays
  ctx.strokeStyle=darker(fin,38); ctx.lineWidth=0.9; ctx.globalAlpha=0.52;
  for (let i=0; i<5; i++) {
    const fx = -s*0.44+i*s*0.22;
    ctx.beginPath(); ctx.moveTo(fx,-s*0.72); ctx.lineTo(fx-s*0.04,-s*(1.04+i*0.07)); ctx.stroke();
  }
  ctx.restore();

  // Pectoral fin
  ctx.fillStyle=hexA(fin,0.55);
  ctx.beginPath(); ctx.ellipse(s*0.1,s*0.22,s*0.36,s*0.2,-0.4+wb*0.08,0,Math.PI*2); ctx.fill();

  // Anal fin (bottom) — matches dorsal orange with white band hint
  ctx.save(); ctx.globalAlpha=0.72;
  ctx.fillStyle=fin;
  ctx.beginPath();
  ctx.moveTo(-s*0.2,s*0.7);
  ctx.bezierCurveTo(-s*0.14,s*1.14,s*0.22,s*1.08,s*0.34,s*0.7);
  ctx.closePath(); ctx.fill();
  ctx.restore();

  drawEye(s*0.5,-s*0.12,s*0.2,'#1A3A1A');

  // Mouth
  ctx.strokeStyle=darker(col,30); ctx.lineWidth=1.2;
  ctx.beginPath(); ctx.arc(s*0.84,s*0.07,s*0.07,0,Math.PI*0.85); ctx.stroke();
}

// ── DNS: slim silver sardine ───────────────────────────────────────────────

function drawSardine(f, t, wb) {
  const s=f.size, col=f.color, fin=f.fin_color;
  const tw = wb*0.2;

  // Tail
  ctx.save(); ctx.translate(-s*0.88,0); ctx.rotate(tw*2.2);
  ctx.fillStyle=hexA(fin,0.82);
  ctx.beginPath();
  ctx.moveTo(0,0); ctx.lineTo(-s*0.52,-s*0.38); ctx.lineTo(-s*0.52,s*0.38);
  ctx.closePath(); ctx.fill();
  ctx.restore();

  // Body — slim, pearlescent
  const bg = ctx.createRadialGradient(-s*0.1,-s*0.1,0,0,0,s);
  bg.addColorStop(0,'rgba(225,240,255,0.95)'); bg.addColorStop(0.38,col); bg.addColorStop(1,darker(col,18));
  ctx.fillStyle=bg;
  ctx.beginPath(); ctx.ellipse(0,0,s,s*0.26,tw*0.15,0,Math.PI*2); ctx.fill();

  // Lateral silver stripe
  ctx.save(); ctx.globalAlpha=0.42;
  ctx.fillStyle='rgba(200,225,255,0.7)';
  ctx.beginPath(); ctx.ellipse(-s*0.08,0,s*0.78,s*0.07,0,0,Math.PI*2); ctx.fill();
  ctx.restore();

  // Dorsal fin
  ctx.fillStyle=hexA(fin,0.5);
  ctx.beginPath();
  ctx.moveTo(-s*0.18,-s*0.26); ctx.bezierCurveTo(-s*0.04,-s*0.56,s*0.22,-s*0.52,s*0.3,-s*0.26);
  ctx.closePath(); ctx.fill();

  // Pectoral fin
  ctx.fillStyle=hexA(fin,0.38);
  ctx.beginPath(); ctx.ellipse(s*0.1,s*0.1,s*0.2,s*0.1,-0.3+tw,0,Math.PI*2); ctx.fill();

  // Iridescent scale shimmer
  ctx.save(); ctx.globalAlpha=0.15+Math.sin(t*2.8+f.wobble)*0.06;
  const shim=ctx.createLinearGradient(-s*0.4,-s*0.12,s*0.4,s*0.12);
  shim.addColorStop(0,'rgba(120,255,200,0)'); shim.addColorStop(0.45,'rgba(180,255,228,0.9)');
  shim.addColorStop(0.55,'rgba(148,220,255,0.9)'); shim.addColorStop(1,'rgba(120,255,200,0)');
  ctx.fillStyle=shim;
  ctx.beginPath(); ctx.ellipse(0,0,s*0.88,s*0.22,tw*0.12,0,Math.PI*2); ctx.fill();
  ctx.restore();

  drawEye(s*0.7,-s*0.04,s*0.13,'#5A8898');
}

// ── SSH: barracuda – long, dark, pointed ────────────────────────────────────

function drawBarracuda(f, t, wb) {
  const s=f.size, col=f.color, fin=f.fin_color;
  const tw = wb*0.08;

  // Forked tail
  ctx.save(); ctx.translate(-s,0); ctx.rotate(tw);
  ctx.fillStyle=hexA(fin,0.85);
  ctx.beginPath();
  ctx.moveTo(0,s*0.04);
  ctx.lineTo(-s*0.72,-s*0.48); ctx.lineTo(-s*0.28,0); ctx.lineTo(-s*0.72,s*0.48);
  ctx.closePath(); ctx.fill();
  ctx.restore();

  // Body — elongated, pointed with counter-shading
  const bg = ctx.createLinearGradient(0,-s*0.21,0,s*0.21);
  bg.addColorStop(0,darker(col,22));       // dark dorsal
  bg.addColorStop(0.28,col);
  bg.addColorStop(0.75,lighter(col,18));   // lighter mid
  bg.addColorStop(1,'rgba(205,225,240,0.92)'); // silver belly
  ctx.fillStyle=bg;
  ctx.beginPath();
  ctx.moveTo(s*1.08,0);
  ctx.bezierCurveTo(s*0.72,-s*0.18,-s*0.28,-s*0.22,-s,s*0.04);
  ctx.bezierCurveTo(-s*0.28,s*0.22,s*0.72,s*0.18,s*1.08,0);
  ctx.fill();

  // Scale lines
  ctx.save(); ctx.strokeStyle=darker(col,18); ctx.lineWidth=0.5; ctx.globalAlpha=0.28;
  for (let i=0; i<7; i++) {
    const x=-s*0.72+i*s*0.27;
    ctx.beginPath(); ctx.moveTo(x,-s*0.14); ctx.lineTo(x,s*0.14); ctx.stroke();
  }
  ctx.restore();

  // Metallic dorsal sheen
  ctx.save(); ctx.globalAlpha=0.13;
  const sheen=ctx.createLinearGradient(0,-s*0.18,0,0);
  sheen.addColorStop(0,'rgba(190,215,242,0.9)'); sheen.addColorStop(1,'rgba(170,200,228,0)');
  ctx.fillStyle=sheen;
  ctx.beginPath(); ctx.ellipse(0,-s*0.05,s*1.06,s*0.14,0,0,Math.PI*2); ctx.fill();
  ctx.restore();

  // Two dorsal fins
  ctx.save(); ctx.globalAlpha=0.7;
  ctx.fillStyle=fin;
  ctx.beginPath(); ctx.moveTo(s*0.22,-s*0.2); ctx.lineTo(s*0.06,-s*0.54); ctx.lineTo(-s*0.18,-s*0.2); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-s*0.38,-s*0.2); ctx.lineTo(-s*0.54,-s*0.48); ctx.lineTo(-s*0.7,-s*0.2); ctx.closePath(); ctx.fill();
  ctx.restore();

  // Pectoral
  ctx.fillStyle=hexA(fin,0.38);
  ctx.beginPath(); ctx.ellipse(s*0.22,s*0.09,s*0.24,s*0.1,-0.3+tw,0,Math.PI*2); ctx.fill();

  drawEye(s*0.8,-s*0.05,s*0.12,'#CC1A1A');

  // Jaw line
  ctx.strokeStyle=darker(col,40); ctx.lineWidth=1.1;
  ctx.beginPath(); ctx.moveTo(s*1.07,s*0.01); ctx.lineTo(s*0.82,s*0.05); ctx.stroke();

  // Teeth — small white triangles along upper jaw
  ctx.save(); ctx.fillStyle='rgba(235,242,248,0.92)';
  const nT=5;
  for (let i=0; i<nT; i++) {
    const tx = s*1.0 - i*s*0.052;
    ctx.beginPath();
    ctx.moveTo(tx, -s*0.01);
    ctx.lineTo(tx + s*0.022, s*0.055);
    ctx.lineTo(tx + s*0.046, -s*0.01);
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

// ── TLS: elegant round angelfish ─────────────────────────────────────────

function drawAngelfish(f, t, wb) {
  const s=f.size, col=f.color, fin=f.fin_color;
  const tw = wb*0.1;

  // Long trailing streamers — wider, fade to transparent
  ctx.save();
  const sg = ctx.createLinearGradient(-s*0.28,0,-s*1.5,0);
  sg.addColorStop(0,hexA(fin,0.7)); sg.addColorStop(1,hexA(fin,0.05));
  ctx.fillStyle=sg;
  // Top streamer
  ctx.globalAlpha=0.7;
  ctx.beginPath();
  ctx.moveTo(-s*0.28,-s*0.86);
  ctx.bezierCurveTo(-s*0.82,-s*1.55+tw*s,-s*1.45,-s*1.3,-s*1.22,-s*0.7);
  ctx.bezierCurveTo(-s*0.82,-s*0.52,-s*0.44,-s*0.66,-s*0.28,-s*0.86);
  ctx.fill();
  // Bottom streamer
  ctx.beginPath();
  ctx.moveTo(-s*0.28,s*0.86);
  ctx.bezierCurveTo(-s*0.82,s*1.55-tw*s,-s*1.45,s*1.3,-s*1.22,s*0.7);
  ctx.bezierCurveTo(-s*0.82,s*0.52,-s*0.44,s*0.66,-s*0.28,s*0.86);
  ctx.fill();
  ctx.restore();

  // Body — tall disc (angelfish are very tall relative to length)
  const bg = ctx.createRadialGradient(-s*0.1,-s*0.3,0,0,0,s*1.04);
  bg.addColorStop(0,lighter(col,72)); bg.addColorStop(0.4,col); bg.addColorStop(1,darker(col,24));
  ctx.fillStyle=bg;
  ctx.beginPath(); ctx.ellipse(0,0,s*0.72,s*0.96,tw*0.08,0,Math.PI*2); ctx.fill();

  // Bold dark vertical stripes (clipped to body)
  ctx.save();
  ctx.beginPath(); ctx.ellipse(0,0,s*0.74,s*0.98,tw*0.08,0,Math.PI*2); ctx.clip();
  const stripeX = [s*0.3, -s*0.06, -s*0.42];
  ctx.fillStyle='rgba(18,12,38,0.42)';
  for (let i=0; i<3; i++) {
    ctx.beginPath(); ctx.ellipse(stripeX[i],0,s*0.085,s*1.02,0,0,Math.PI*2); ctx.fill();
  }
  ctx.restore();

  // Dorsal fin — very tall, sweeping
  ctx.save(); ctx.globalAlpha=0.8;
  const dfg = ctx.createLinearGradient(0,-s*0.9,0,-s*1.85);
  dfg.addColorStop(0,col); dfg.addColorStop(1,lighter(fin,28));
  ctx.fillStyle=dfg;
  ctx.beginPath();
  ctx.moveTo(-s*0.44,-s*0.94);
  ctx.bezierCurveTo(-s*0.24,-s*1.78,s*0.22,-s*1.88,s*0.44,-s*0.94);
  ctx.closePath(); ctx.fill();
  // Fin rays
  ctx.strokeStyle=darker(fin,28); ctx.lineWidth=0.8; ctx.globalAlpha=0.45;
  for (let i=0; i<6; i++) {
    const fx=-s*0.4+i*s*0.18;
    ctx.beginPath(); ctx.moveTo(fx,-s*0.94); ctx.lineTo(fx-s*0.02,-s*(1.32+i*0.09)); ctx.stroke();
  }
  ctx.restore();

  // Pectoral fin
  ctx.fillStyle=hexA(fin,0.44);
  ctx.beginPath(); ctx.ellipse(s*0.14,s*0.12,s*0.34,s*0.18,-0.48+tw*0.5,0,Math.PI*2); ctx.fill();

  // Anal fin — tall to match dorsal
  ctx.save(); ctx.globalAlpha=0.75; ctx.fillStyle=fin;
  ctx.beginPath();
  ctx.moveTo(-s*0.32,s*0.92);
  ctx.bezierCurveTo(-s*0.2,s*1.5,s*0.26,s*1.44,s*0.36,s*0.92);
  ctx.closePath(); ctx.fill();
  ctx.restore();

  drawEye(s*0.44,-s*0.2,s*0.19,'#3311AA');
}

// ── Generic / Other ───────────────────────────────────────────────────────

function drawGenericFish(f, t, wb) {
  // Deep-sea mystery fish: dark, shadowy, with a bioluminescent photophore
  const s=f.size, col=f.color, fin=f.fin_color;
  const tw = wb*0.1;
  const deepCol = darker(col, 30);

  // Tail — wider, menacing
  ctx.save(); ctx.translate(-s*0.7,0); ctx.rotate(tw*1.4);
  ctx.fillStyle=hexA(fin,0.58);
  ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(-s*0.65,-s*0.52); ctx.lineTo(-s*0.52,0); ctx.lineTo(-s*0.65,s*0.52); ctx.closePath(); ctx.fill();
  ctx.restore();

  // Body — dark, elongated, deeper belly
  const bg = ctx.createRadialGradient(-s*0.1,-s*0.2,0,s*0.1,s*0.1,s*1.0);
  bg.addColorStop(0,lighter(col,10)); bg.addColorStop(0.55,col); bg.addColorStop(1,darker(col,45));
  ctx.fillStyle=bg;
  ctx.beginPath(); ctx.ellipse(0,0,s*0.86,s*0.52,tw*0.12,0,Math.PI*2); ctx.fill();

  // Scale arc texture
  ctx.save(); ctx.strokeStyle=darker(col,22); ctx.lineWidth=0.6; ctx.globalAlpha=0.24;
  for (let i=0; i<5; i++) {
    const x=-s*0.55+i*s*0.27;
    ctx.beginPath(); ctx.arc(x,0,s*0.2,Math.PI*0.28,Math.PI*0.72); ctx.stroke();
  }
  ctx.restore();

  // Dorsal fin — jagged, spiny
  ctx.save(); ctx.globalAlpha=0.55;
  ctx.fillStyle=fin;
  ctx.beginPath();
  ctx.moveTo(-s*0.22,-s*0.5);
  ctx.lineTo(-s*0.08,-s*0.86);
  ctx.lineTo(s*0.04,-s*0.62);
  ctx.lineTo(s*0.14,-s*0.94);
  ctx.lineTo(s*0.26,-s*0.64);
  ctx.lineTo(s*0.36,-s*0.5);
  ctx.closePath(); ctx.fill();
  ctx.restore();

  // Pectoral fin
  ctx.fillStyle=hexA(fin,0.34);
  ctx.beginPath(); ctx.ellipse(s*0.1,s*0.16,s*0.28,s*0.16,-0.38+tw,0,Math.PI*2); ctx.fill();

  // Bioluminescent photophore on belly — pulsing glow
  const glowPhase = 0.62 + Math.sin(t*2.4 + f.wobble) * 0.28;
  const px = -s*0.06, py = s*0.32;
  ctx.save();
  glow('rgba(100,255,160,1)', s * 1.4);
  ctx.globalAlpha = glowPhase * 0.6;
  ctx.fillStyle = 'rgba(140,255,190,0.85)';
  ctx.beginPath(); ctx.arc(px, py, s*0.1, 0, Math.PI*2); ctx.fill();
  clearGlow();
  // Bright core
  ctx.globalAlpha = 0.8 + Math.sin(t*2.4 + f.wobble) * 0.15;
  ctx.fillStyle = 'rgba(220,255,235,0.98)';
  ctx.beginPath(); ctx.arc(px, py, s*0.038, 0, Math.PI*2); ctx.fill();
  ctx.restore();

  drawEye(s*0.52,-s*0.1,s*0.15,'#6688AA');
}

// ── UDP: detailed jellyfish ────────────────────────────────────────────────

function drawJellyfish(f, t, wb) {
  const s=f.size, col=f.color;
  const pulse = Math.sin(t*1.9+f.wobble);
  const r = s*(0.88+pulse*0.07);
  const flat = 0.54+pulse*0.05;

  // Outer glow halo
  ctx.save();
  glow(col, s*2.5); ctx.globalAlpha=0.07;
  ctx.fillStyle=col;
  ctx.beginPath(); ctx.ellipse(0,0,r*1.22,r*flat*1.22,0,Math.PI,0); ctx.fill();
  clearGlow();
  ctx.restore();

  // Bell
  const bg = ctx.createRadialGradient(0,-r*flat*0.28,0,0,0,r*1.1);
  bg.addColorStop(0,hexA(col,0.92)); bg.addColorStop(0.55,hexA(col,0.5)); bg.addColorStop(1,hexA(col,0.04));
  ctx.fillStyle=bg; ctx.globalAlpha=0.88;
  ctx.beginPath(); ctx.ellipse(0,0,r,r*flat,0,Math.PI,0); ctx.fill();

  // Inner bell glow
  ctx.save(); ctx.globalAlpha=0.18;
  ctx.fillStyle='rgba(255,255,255,0.65)';
  ctx.beginPath(); ctx.ellipse(-r*0.2,-r*flat*0.32,r*0.28,r*flat*0.2,-0.3,0,Math.PI*2); ctx.fill();
  ctx.restore();

  // Radial veins
  ctx.save(); ctx.strokeStyle=hexA(col,0.4); ctx.lineWidth=1; ctx.globalAlpha=0.5;
  for (let i=0; i<8; i++) {
    const a = (i/8)*Math.PI+Math.PI;
    ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(Math.cos(a)*r*0.88,Math.sin(a)*r*flat*0.88); ctx.stroke();
  }
  ctx.restore();

  // Oral arms (thick, ruffled)
  ctx.save(); ctx.globalAlpha=0.52;
  for (let i=0; i<4; i++) {
    const tx=(i-1.5)*s*0.3, len=s*(0.55+i%2*0.28);
    ctx.strokeStyle=hexA(col,0.85); ctx.lineWidth=2.8;
    ctx.beginPath(); ctx.moveTo(tx,0);
    ctx.quadraticCurveTo(tx+Math.sin(t*0.9+i)*s*0.22,len*0.5,tx+Math.sin(t*0.7+i+1)*s*0.28,len);
    ctx.stroke();
  }
  ctx.restore();

  // Thin trailing tentacles with knots
  ctx.save();
  for (let i=0; i<9; i++) {
    const tx=(i-4)*s*0.26, len=s*(1.0+i%3*0.42), ph=t*0.78+i*0.88;
    ctx.strokeStyle=lighter(col,30); ctx.lineWidth=0.85; ctx.globalAlpha=0.32;
    ctx.beginPath(); ctx.moveTo(tx,0);
    ctx.bezierCurveTo(tx+Math.sin(ph)*s*0.28,len*0.35,tx+Math.cos(ph*0.68)*s*0.22,len*0.7,tx+Math.sin(ph*0.5+1)*s*0.2,len);
    ctx.stroke();
    ctx.fillStyle=lighter(col,20); ctx.globalAlpha=0.38;
    for (let k=1; k<=3; k++) {
      const ky=len*k/3.6, kx=tx+Math.sin(ph+k)*s*0.14;
      ctx.beginPath(); ctx.arc(kx,ky,1.6,0,Math.PI*2); ctx.fill();
    }
  }
  ctx.restore(); ctx.globalAlpha=1;
}

// ── Sea turtle ─────────────────────────────────────────────────────────────

function tickTurtle(dt) {
  turtle.x += turtle.vx*60*dt;
  turtle.t += dt;
  turtle.y += Math.sin(turtle.t*0.38)*0.28;
  if ((turtle.flip>0 && turtle.x>W+240) || (turtle.flip<0 && turtle.x<-240)) resetTurtle();
}

function drawTurtle() {
  const {x,y,flip,t} = turtle;
  const s=32;
  ctx.save();
  ctx.translate(x,y); ctx.scale(flip,1);

  const flap = Math.sin(t*1.9);

  // Back flippers
  for (const side of [-1,1]) {
    ctx.save(); ctx.translate(-s*0.28,side*s*0.16); ctx.rotate(side*(0.58+flap*0.22));
    ctx.fillStyle='#28663A'; ctx.globalAlpha=0.9;
    ctx.beginPath(); ctx.ellipse(0,0,s*0.44,s*0.17,0,0,Math.PI*2); ctx.fill();
    ctx.restore();
  }

  // Front flippers
  for (const side of [-1,1]) {
    ctx.save(); ctx.translate(s*0.14,side*s*0.24); ctx.rotate(side*(0.28+flap*0.48));
    ctx.fillStyle='#358A4A'; ctx.globalAlpha=0.9;
    ctx.beginPath(); ctx.ellipse(0,0,s*0.58,s*0.19,0.28*side,0,Math.PI*2); ctx.fill();
    ctx.restore();
  }

  // Shell
  const sg = ctx.createRadialGradient(-s*0.14,-s*0.2,0,0,0,s*0.72);
  sg.addColorStop(0,'#5A9A5A'); sg.addColorStop(0.5,'#3A7A48'); sg.addColorStop(1,'#185A28');
  ctx.fillStyle=sg; ctx.globalAlpha=1;
  ctx.beginPath(); ctx.ellipse(0,0,s*0.66,s*0.56,0,0,Math.PI*2); ctx.fill();

  // Shell scute pattern
  ctx.strokeStyle='rgba(15,75,28,0.52)'; ctx.lineWidth=1.3;
  ctx.beginPath();
  ctx.moveTo(0,-s*0.54); ctx.lineTo(0,s*0.54);
  ctx.moveTo(-s*0.58,0); ctx.lineTo(s*0.58,0);
  ctx.moveTo(-s*0.32,-s*0.42); ctx.lineTo(s*0.32,s*0.42);
  ctx.moveTo(s*0.32,-s*0.42); ctx.lineTo(-s*0.32,s*0.42);
  ctx.stroke();

  // Head
  ctx.fillStyle='#4A8A4A';
  ctx.beginPath(); ctx.ellipse(s*0.7,0,s*0.28,s*0.21,0,0,Math.PI*2); ctx.fill();
  // Neck crease
  ctx.strokeStyle='rgba(15,70,25,0.4)'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(s*0.52,-s*0.14); ctx.lineTo(s*0.52,s*0.14); ctx.stroke();

  // Eye
  ctx.fillStyle='#111';
  ctx.beginPath(); ctx.arc(s*0.86,-s*0.07,s*0.062,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='rgba(255,255,255,0.7)';
  ctx.beginPath(); ctx.arc(s*0.855,-s*0.09,s*0.024,0,Math.PI*2); ctx.fill();

  ctx.restore();
}

// ── HUD ────────────────────────────────────────────────────────────────────

const hudFps  = document.getElementById('fps');
const hudFish = document.getElementById('fish-count');
const hudPkt  = document.getElementById('pkt-count');
let fc=0, lastFpsT=performance.now();

function updateHud(n) {
  fc++;
  const now=performance.now(), s=(now-lastFpsT)/1000;
  if (s>=1) { hudFps.textContent=`${Math.round(fc/s)} fps`; fc=0; lastFpsT=now; }
  hudFish.textContent=`${n} fish`;
  hudPkt.textContent=`${pktCount} pkts`;
}

// ── Render loop ────────────────────────────────────────────────────────────

let lastTime=performance.now();

function frame(now) {
  const dt=Math.min((now-lastTime)/1000,0.05);
  lastTime=now;

  const state=sim.tick(dt);
  const t=state.time;

  tickPlankton(dt);
  tickMarineSnow();
  tickBioParticles(dt);
  tickFishSchool(dt);
  tickTurtle(dt);
  tickManta(dt);
  tickShark(dt);
  tickWhaleshark(dt);
  tickCrabs(dt);

  drawBackground(t);
  drawDepthHaze();
  drawWhaleshark();       // faint deep silhouette, behind everything
  drawMarineSnow();
  drawBioParticles(t);
  drawPlankton();
  drawFishSchool(t);      // mid-water ambient school
  drawKelp(t);
  drawCoral(t);
  drawAnemones(t);
  drawSeagrass(t);
  drawSeafloor(t);

  for (const u of urchins)   drawSeaUrchin(u);
  for (const sh of seahorses) drawSeahorse(sh, t);
  for (const c of clams)     drawClam(c, t);
  for (const c of crabs)     drawCrab(c, t);

  for (const b of state.bubbles) drawBubble(b);

  drawManta();
  drawShark();

  // Depth sort: larger fish behind smaller
  const sorted = [...state.fish].sort((a,b)=>b.size-a.size);
  for (const f of sorted) drawFish(f,t);

  drawTurtle();
  updateHud(state.fish.length);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
