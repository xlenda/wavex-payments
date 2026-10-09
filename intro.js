// Abertura no molde da Zenith: selo Wavex -> globo girando até o Brasil -> boas-vindas -> site.
// Só roda se o <head> marcou html.intro-on (1ª visita da sessão e sem "reduzir movimento").
(() => {
  const TOTAL = 12600; // duração da abertura (a barra de progresso lê daqui via --intro-ms)
  const root = document.documentElement;
  const intro = document.getElementById('intro');
  if (!intro) return;
  if (!root.classList.contains('intro-on')) { intro.remove(); return; }
  // script chegou atrasado (rede lenta): abertura atrasada é pior que nenhuma — e o failsafe de 16 s do CSS já estaria correndo
  if (performance.now() > 5000) {
    intro.remove();
    root.classList.remove('intro-on');
    document.dispatchEvent(new Event('wx:intro-done'));
    return;
  }
  window.wxIntro = true; // avisa o onclick de reserva do botão "Pular" que o JS assumiu
  try { sessionStorage.setItem('wx-intro', '1'); } catch (e) { /* aba privada: tudo bem repetir */ }

  const q = s => intro.querySelector(s);
  const page = [...document.body.children].filter(el => el !== intro && el.tagName !== 'SCRIPT');
  const timers = [];
  const at = (ms, fn) => timers.push(setTimeout(fn, ms));
  let done = false, globe = null;

  // pular: botão, Esc/Enter/espaço, roda do mouse ou arrastar no celular — ninguém fica preso na abertura
  const onKey = e => { if (['Escape', 'Enter', ' '].includes(e.key)) finish(); };
  function finish() {
    if (done) return;
    done = true;
    timers.forEach(clearTimeout);
    if (globe) globe.stop();
    removeEventListener('keydown', onKey);
    removeEventListener('wheel', finish);
    removeEventListener('touchmove', finish);
    page.forEach(el => { el.inert = false; });
    intro.classList.add('is-out');
    root.classList.remove('intro-lock');
    document.dispatchEvent(new Event('wx:intro-done'));
    setTimeout(() => { intro.remove(); root.classList.remove('intro-on'); }, 750);
  }
  q('.intro-skip').addEventListener('click', finish);
  addEventListener('keydown', onKey);
  addEventListener('wheel', finish, { passive: true });
  addEventListener('touchmove', finish, { passive: true });

  try {
    // o site por baixo fica fora do alcance do teclado e do leitor de tela enquanto a abertura roda
    page.forEach(el => { el.inert = true; });
    root.classList.add('intro-lock');
    q('.intro-skip').focus({ preventScroll: true });
    intro.style.setProperty('--intro-ms', TOTAL + 'ms');

    const caption = q('.intro-caption');
    const feed = [...intro.querySelectorAll('.feed-list li')];
    globe = makeGlobe(q('.globe-canvas'), [...intro.querySelectorAll('.gtag')]);

    // linha do tempo (~12,6 s, como a da Zenith)
    intro.classList.add('is-badge');
    at(1500, () => { caption.innerHTML = 'Conectando a Wavex ao Brasil<span> · Pix, cartão e boleto.</span>'; });
    at(1600, () => globe.prepare());                                        // conta pesada do globo enquanto o selo respira
    at(2500, () => intro.classList.add('is-zoom'));
    at(2900, () => { intro.classList.add('is-globe'); globe.start(); });
    at(8000, () => intro.classList.remove('is-globe'));                     // globo apaga; pausa escura antes da próxima cena
    at(8800, () => { globe.stop(); intro.classList.add('is-welcome'); caption.innerHTML = '<span>Abertura automática</span>'; });
    feed.forEach((li, k) => at(9300 + k * 480, () => li.classList.add('is-in')));
    at(TOTAL, finish);
  } catch (e) {
    finish(); // qualquer erro na abertura: abre o site direto
  }
})();

// Globo em canvas 2D, sem biblioteca: a textura é projetada pixel a pixel (projeção ortográfica).
// A inclinação é fixa (Brasil no centro), então a conta de cada pixel é feita uma vez só;
// por quadro só muda a longitude, que vira um deslocamento de coluna na textura.
function makeGlobe(canvas, tagEls) {
  const D = Math.PI / 180, TW = 1024, TH = 512;            // TW potência de 2: o "& (TW - 1)" dá a volta no mapa
  const SIN0 = Math.sin(-14 * D), COS0 = Math.cos(-14 * D); // centro da vista na latitude -14° (Brasil)
  const ctx = canvas.getContext('2d');
  let S = 0, R = 0, C = 0, img, pix, rowOf, colOf, tex = null, raf = 0, t0 = 0, lng0 = 20;

  // textura (falha aberta via file://, porque o canvas fica "contaminado": aí o globo sai só com grade, arcos e selos)
  const texture = new Image();
  texture.src = 'assets/globo.jpg';
  texture.decode().then(() => {
    const c = document.createElement('canvas');
    c.width = TW; c.height = TH;
    const x = c.getContext('2d');
    x.drawImage(texture, 0, 0, TW, TH);
    tex = new Uint32Array(x.getImageData(0, 0, TW, TH).data.buffer);
  }).catch(() => {});

  const tags = tagEls.map(el => ({ el, lat: +el.dataset.lat, lng: +el.dataset.lng, on: false, at: 0, arc: null }));
  const hub = tags[0];

  function setup() {
    // teto de 720 px internos: acima disso o custo por quadro cresce e a textura (1024 px) não ganha nitidez
    S = Math.round(Math.min(720, canvas.clientWidth * Math.min(devicePixelRatio || 1, 1.5)));
    canvas.width = canvas.height = S;
    R = S / 2 - 1; C = S / 2;
    img = ctx.createImageData(S, S);
    pix = new Uint32Array(img.data.buffer);
    rowOf = new Int32Array(S * S).fill(-1);
    colOf = new Int32Array(S * S);
    for (let py = 0; py < S; py++) {
      for (let px = 0; px < S; px++) {
        const nx = (px + .5 - C) / R, ny = (C - py - .5) / R, rr = nx * nx + ny * ny;
        if (rr >= 1) continue;
        const nz = Math.sqrt(1 - rr);
        const lat = Math.asin(nz * SIN0 + ny * COS0) / D;
        const dl = Math.atan2(nx, nz * COS0 - ny * SIN0) / D;
        const i = py * S + px;
        rowOf[i] = Math.min(TH - 1, Math.floor((90 - lat) / 180 * TH)) * TW;
        colOf[i] = Math.round(dl / 360 * TW) + TW * 8;
      }
    }
  }

  // projeção ortográfica de (lat, lng) -> [x, y, z]; z > 0 = lado visível
  function proj(lat, lng) {
    const p = lat * D, l = (lng - lng0) * D, cp = Math.cos(p), sp = Math.sin(p), cl = Math.cos(l);
    return [C + R * cp * Math.sin(l), C - R * (COS0 * sp - SIN0 * cp * cl), SIN0 * sp + COS0 * cp * cl];
  }

  // grade (meridianos e paralelos a cada 20°), amostrada uma vez
  const grid = [];
  for (let ln = -180; ln < 180; ln += 20) { const l = []; for (let la = -80; la <= 80; la += 4) l.push([la, ln]); grid.push(l); }
  for (let la = -60; la <= 60; la += 20) { const l = []; for (let ln = -180; ln <= 180; ln += 4) l.push([la, ln]); grid.push(l); }

  // arco de grande círculo do hub (São Paulo) até cada cidade, com altura no meio
  const vec = (la, ln) => [Math.cos(la * D) * Math.cos(ln * D), Math.cos(la * D) * Math.sin(ln * D), Math.sin(la * D)];
  for (const t of tags) {
    if (t === hub) continue;
    const a = vec(hub.lat, hub.lng), b = vec(t.lat, t.lng);
    const w = Math.acos(Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2])), sw = Math.sin(w);
    t.arc = [];
    for (let i = 0; i <= 32; i++) {
      const f = i / 32, k1 = Math.sin((1 - f) * w) / sw, k2 = Math.sin(f * w) / sw;
      const v = [a[0] * k1 + b[0] * k2, a[1] * k1 + b[1] * k2, a[2] * k1 + b[2] * k2];
      t.arc.push([Math.asin(v[2]) / D, Math.atan2(v[1], v[0]) / D, Math.sin(Math.PI * f) * Math.min(.18, w * 1.2)]);
    }
  }

  function path(points, toXY) {
    ctx.beginPath();
    let pen = false;
    for (const pt of points) {
      const xy = toXY(pt);
      if (xy) { pen ? ctx.lineTo(xy[0], xy[1]) : ctx.moveTo(xy[0], xy[1]); pen = true; } else pen = false;
    }
    ctx.stroke();
  }

  function draw(now) {
    const t = now - t0, u = S / 560;
    // gira de 20° (África) até -52° (Brasil no centro) em 2,8 s e segue devagar
    const e = 1 - Math.pow(1 - Math.min(1, t / 2800), 3);
    lng0 = 20 - 72 * e - Math.max(0, t - 2800) * .0012;

    const off = Math.round((lng0 + 180) / 360 * TW);
    if (tex) {
      for (let i = 0, n = pix.length; i < n; i++) {
        const r = rowOf[i];
        pix[i] = r < 0 ? 0 : tex[r + ((colOf[i] + off) & (TW - 1))];
      }
      ctx.putImageData(img, 0, 0);
    } else {
      ctx.clearRect(0, 0, S, S);
      ctx.fillStyle = '#0d0818';
      ctx.beginPath(); ctx.arc(C, C, R, 0, 7); ctx.fill();
    }

    // volume: luz no alto à esquerda, borda escurecendo
    ctx.globalCompositeOperation = 'source-atop';
    const g = ctx.createRadialGradient(C - R * .35, C - R * .4, R * .05, C, C, R * 1.02);
    g.addColorStop(0, 'rgba(201,184,255,.16)'); g.addColorStop(.6, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(3,1,8,.62)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
    ctx.globalCompositeOperation = 'source-over';

    ctx.lineWidth = Math.max(1, u);
    ctx.strokeStyle = 'rgba(169,139,255,.14)';
    for (const line of grid) path(line, ([la, ln]) => { const p = proj(la, ln); return p[2] > 0 ? p : null; });

    // selos entram um a um (hub primeiro) e cada um puxa um arco do hub
    tags.forEach((tg, i) => { if (!tg.on && t > 900 + i * 380) { tg.on = true; tg.at = t; } });
    ctx.lineWidth = 1.4 * u;
    ctx.strokeStyle = 'rgba(201,184,255,.85)';
    ctx.shadowColor = 'rgba(143,99,254,.9)';
    ctx.shadowBlur = 8 * u;
    for (const tg of tags) {
      if (!tg.on || !tg.arc) continue;
      const n = Math.round(Math.min(1, (t - tg.at) / 700) * (tg.arc.length - 1));
      path(tg.arc.slice(0, n + 1), ([la, ln, h]) => {
        const p = proj(la, ln);
        return p[2] > -.05 ? [C + (p[0] - C) * (1 + h), C + (p[1] - C) * (1 + h)] : null;
      });
    }
    ctx.shadowBlur = 0;

    const hp = proj(hub.lat, hub.lng);
    if (hub.on && hp[2] > 0) {
      const ph = ((t - hub.at) % 1600) / 1600;
      ctx.strokeStyle = `rgba(201,184,255,${(1 - ph).toFixed(2)})`;
      ctx.lineWidth = 1.5 * u;
      ctx.beginPath(); ctx.arc(hp[0], hp[1], (6 + ph * 22) * u, 0, 7); ctx.stroke();
    }

    // selos (HTML) acompanham as cidades; atrás do globo somem
    const k = canvas.clientWidth / S;
    for (const tg of tags) {
      const p = proj(tg.lat, tg.lng);
      tg.el.style.transform = `translate(${(p[0] * k).toFixed(1)}px, ${(p[1] * k).toFixed(1)}px)`;
      tg.el.classList.toggle('is-on', tg.on && p[2] > .15);
    }
    raf = requestAnimationFrame(draw);
  }

  let ready = false;
  const prepare = () => { if (!ready) { setup(); ready = true; } };
  return {
    prepare,
    start() { if (raf) return; prepare(); t0 = performance.now(); raf = requestAnimationFrame(draw); },
    stop() { cancelAnimationFrame(raf); raf = 0; },
  };
}
