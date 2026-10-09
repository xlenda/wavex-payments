// Abertura no molde da Zenith: selo Wavex -> globo realista conectando o mundo até o Brasil -> boas-vindas -> site.
// Só roda se o <head> marcou html.intro-on (1ª visita da sessão e sem "reduzir movimento").
// É chamada no fim do arquivo: precisa do shader (const) já definido.
function runIntro() {
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
    if (globe) globe.dispose();
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

    const caption = q('.intro-caption');
    const feed = [...intro.querySelectorAll('.feed-list li')];
    globe = makeGlobe(q('.globe-gl'), q('.globe-fx'), [...intro.querySelectorAll('.gtag')]);
    if (!globe) q('.scene-globe').remove(); // sem WebGL: vai do selo direto às boas-vindas
    // linha do tempo (~13 s com o globo, como a da Zenith)
    const T = globe ? { globe: 2900, out: 8700, welcome: 9500, total: 13300 } : { welcome: 3300, total: 7100 };
    intro.style.setProperty('--intro-ms', T.total + 'ms');

    intro.classList.add('is-badge');
    at(1500, () => { caption.innerHTML = 'Conectando a Wavex ao mundo<span> · Pix, cartão e boleto.</span>'; });
    at(2500, () => intro.classList.add('is-zoom'));
    if (globe) {
      at(1600, () => globe.prepare());                                      // sobe o shader enquanto o selo respira
      at(T.globe, () => { intro.classList.add('is-globe'); globe.start(); });
      at(T.out, () => intro.classList.remove('is-globe'));                  // globo apaga; pausa escura antes da próxima cena
    }
    at(T.welcome, () => { if (globe) globe.stop(); intro.classList.add('is-welcome'); caption.innerHTML = '<span>Abertura automática</span>'; });
    feed.forEach((li, k) => at(T.welcome + 500 + k * 480, () => li.classList.add('is-in')));
    at(T.total, finish);
    intro.style.animation = 'none'; // o JS assumiu e já agendou o fim: desliga o failsafe de 16 s do CSS
  } catch (e) {
    console.error('[abertura]', e); // registra pra quem for depurar...
    finish();                        // ...e abre o site direto
  }
}

// ---------------------------------------------------------------------------------------------
// Globo realista em WebGL puro (sem biblioteca): um shader desenha a Terra pixel a pixel —
// cor de satélite, relevo, lado da noite com as luzes das cidades, brilho do sol no mar,
// nuvens procedurais, atmosfera violeta e estrelas. Texturas: NASA Blue/Black Marble (domínio público).
// Por cima, um canvas 2D desenha os arcos de luz e os pulsos; os selos são HTML.
// ---------------------------------------------------------------------------------------------
const GLOBE_VS = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';
const GLOBE_FS = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 uC;          // centro do globo (px do canvas, origem embaixo)
uniform float uR;         // raio (px do canvas)
uniform float uLng, uTilt, uTime, uFade;
uniform sampler2D uDay, uData; // uData: r = luzes da noite, g = água, b = relevo
const float PI = 3.14159265;
const vec3 L = vec3(-.78, .36, .52);    // sol bem de lado (alto à esquerda): a direita fica na noite, com as cidades acesas
const vec3 ATMO = vec3(.52, .4, 1.);     // atmosfera violeta-azulada (cor da marca)

float h21(vec2 p) { p = fract(p * vec2(234.34, 435.345)); p += dot(p, p + 34.23); return fract(p.x * p.y); }
float h31(vec3 p) { p = fract(p * .3183099 + .1); p *= 17.; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float noise(vec3 x) {
  vec3 i = floor(x), f = fract(x);
  f = f * f * (3. - 2. * f);
  return mix(mix(mix(h31(i), h31(i + vec3(1, 0, 0)), f.x), mix(h31(i + vec3(0, 1, 0)), h31(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(h31(i + vec3(0, 0, 1)), h31(i + vec3(1, 0, 1)), f.x), mix(h31(i + vec3(0, 1, 1)), h31(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}
float fbm(vec3 p) { float a = .5, s = 0.; for (int i = 0; i < 5; i++) { s += a * noise(p); p *= 2.03; a *= .5; } return s; }
vec3 toView(vec3 w, float ct, float st) { return vec3(w.x, w.y * ct - w.z * st, w.y * st + w.z * ct); }

void main() {
  vec2 p = (gl_FragCoord.xy - uC) / uR;
  float r = length(p);
  vec3 col = vec3(0.);
  float a = 0.;

  // estrelas
  vec2 cell = floor(gl_FragCoord.xy / 2.);
  float hs = h21(cell);
  float star = step(.9979, hs) * (.35 + .65 * h21(cell + 3.1)) * (.7 + .3 * sin(uTime * 1.6 + hs * 60.)) * step(1.25, r);
  col += vec3(.85, .87, 1.) * star;
  a += star;

  // halo da atmosfera fora do disco (mais forte do lado do sol)
  float t = max(r - 1., 0.) / .17;
  float face = .4 + .6 * max(dot(normalize(vec3(p, .0001)), L), 0.);
  float halo = exp(-t * 3.4) * face * step(1., r);
  col += ATMO * halo;
  a = max(a, halo);

  if (r < 1.) {
    float ct = cos(uTilt), st = sin(uTilt);
    vec3 n = vec3(p, sqrt(1. - r * r));                                   // normal na vista
    vec3 w = vec3(n.x, n.y * ct + n.z * st, -n.y * st + n.z * ct);        // vista -> mundo (gira pela inclinação)
    float lat = asin(clamp(w.y, -1., 1.)), dl = atan(w.x, w.z);
    // u sem fract(): contínua no lado visível; o REPEAT da textura dá a volta no mapa sem costura
    vec2 uv = vec2((dl + uLng) / (2. * PI) + .5, .5 - lat / PI);
    vec3 day = texture2D(uDay, uv).rgb;
    vec3 dat = texture2D(uData, uv).rgb;

    // relevo: inclina a normal pelo gradiente da altura (leste e norte)
    float hE = texture2D(uData, uv + vec2(1. / 2048., 0.)).b - texture2D(uData, uv - vec2(1. / 2048., 0.)).b;
    float hN = texture2D(uData, uv - vec2(0., 1. / 1024.)).b - texture2D(uData, uv + vec2(0., 1. / 1024.)).b;
    vec3 east = toView(vec3(cos(dl), 0., -sin(dl)), ct, st);
    vec3 north = toView(vec3(-sin(lat) * sin(dl), cos(lat), -sin(lat) * cos(dl)), ct, st);
    vec3 nb = normalize(n - 2.2 * (hE * east + hN * north));

    float d = dot(nb, L), dn = dot(n, L);
    vec3 surf = pow(day, vec3(1.12)) * (.02 + 1.22 * max(d, 0.));

    // nuvens procedurais (ruído no espaço do mundo, sem emenda), andando devagar
    // achatadas no eixo norte-sul: viram faixas finas, como as nuvens de verdade
    vec3 cq = w * vec3(3.4, 5.6, 3.4) + vec3(uTime * .012, 0., uTime * .006);
    float cl = smoothstep(.56, .82, fbm(cq + 1.4 * fbm(cq * 2.1))) * .64;
    surf = mix(surf, vec3(.96, .97, 1.) * (.03 + 1.05 * max(dn, 0.)), cl);

    // luzes das cidades acendem no lado da noite
    float night = smoothstep(.12, -.22, dn);
    surf += vec3(1., .76, .46) * pow(dat.r, 1.4) * night * (1. - cl * .9) * 2.4;

    // reflexo do sol no mar
    vec3 R = reflect(-L, nb);
    surf += vec3(.9, .86, 1.) * pow(max(R.z, 0.), 90.) * dat.g * (1. - cl) * .55;

    // atmosfera na borda do disco
    float fres = pow(1. - n.z, 2.4);
    surf = mix(surf, ATMO * (.28 + .95 * max(dn + .25, 0.)), fres * .78);

    float edge = smoothstep(1., 1. - 1.6 / uR, r);                         // borda suave (anti-serrilhado)
    col = mix(col, surf, edge);
    a = mix(a, 1., edge);
  }
  gl_FragColor = vec4(min(col, vec3(a)), a) * uFade;   // alfa pré-multiplicado: cor nunca acima do alfa
}`;

function makeGlobe(glCanvas, fxCanvas, tagEls) {
  try { return buildGlobe(glCanvas, fxCanvas, tagEls); } catch (e) { console.error('[globo]', e); return null; }
}

function buildGlobe(glCanvas, fxCanvas, tagEls) {
  const gl = glCanvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false });
  if (!gl) return null;
  const sh = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, GLOBE_VS));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, GLOBE_FS));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  gl.useProgram(prog);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW); // um triângulo cobre a tela
  const aPos = gl.getAttribLocation(prog, 'a');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
  const U = {};
  ['uC', 'uR', 'uLng', 'uTilt', 'uTime', 'uFade', 'uDay', 'uData'].forEach(k => { U[k] = gl.getUniformLocation(prog, k); });

  const aniso = gl.getExtension('EXT_texture_filter_anisotropic');
  // texturas: começam com 1 pixel escuro e trocam quando a imagem chega (em file:// a troca falha e o globo fica escuro)
  const texture = (unit, src, placeholder) => {
    const tex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 1, 1, 0, gl.RGB, gl.UNSIGNED_BYTE, new Uint8Array(placeholder));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    if (aniso) gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
    gl.generateMipmap(gl.TEXTURE_2D);
    const img = new Image();
    img.src = src;
    img.decode().then(() => {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
      gl.generateMipmap(gl.TEXTURE_2D);
    }).catch(() => {});
  };
  texture(0, 'assets/terra-dia.jpg', [8, 12, 28]);
  texture(1, 'assets/terra-dados.jpg', [0, 0, 0]);
  gl.uniform1i(U.uDay, 0);
  gl.uniform1i(U.uData, 1);

  const fx = fxCanvas.getContext('2d');
  const D = Math.PI / 180, TILT = -10 * D, S0 = Math.sin(TILT), C0 = Math.cos(TILT);
  const tags = tagEls.map(el => ({ el, lat: +el.dataset.lat, lng: +el.dataset.lng, on: false, at: 0, arc: null }));
  const hub = tags[0]; // São Paulo: todos os arcos chegam nele
  let W = 0, H = 0, dpr = 1, raf = 0, t0 = 0, lng0 = 150, cx = 0, cy = 0, R = 1;

  // arcos de grande círculo de cada cidade até o hub, com altura no meio
  const vec = (la, ln) => [Math.cos(la * D) * Math.cos(ln * D), Math.cos(la * D) * Math.sin(ln * D), Math.sin(la * D)];
  for (const tg of tags) {
    if (tg === hub) continue;
    const a = vec(tg.lat, tg.lng), b = vec(hub.lat, hub.lng);
    const w = Math.acos(Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2])), sw = Math.sin(w);
    tg.arc = [];
    for (let i = 0; i <= 48; i++) {
      const f = i / 48, k1 = Math.sin((1 - f) * w) / sw, k2 = Math.sin(f * w) / sw;
      const v = [a[0] * k1 + b[0] * k2, a[1] * k1 + b[1] * k2, a[2] * k1 + b[2] * k2];
      tg.arc.push([Math.asin(v[2]) / D, Math.atan2(v[1], v[0]) / D, Math.sin(Math.PI * f) * Math.min(.2, .05 + w * .1)]);
    }
  }

  // mesma projeção do shader: [x, y] em px de CSS e z (> 0 = lado visível)
  function proj(lat, lng, lift = 0) {
    const p = lat * D, l = (lng - lng0) * D, cp = Math.cos(p), sp = Math.sin(p), cl = Math.cos(l);
    const X = cp * Math.sin(l), Y = C0 * sp - S0 * cp * cl, Z = S0 * sp + C0 * cp * cl;
    return [cx + R * (1 + lift) * X, cy - R * (1 + lift) * Y, Z, (1 + lift) * Math.hypot(X, Y)];
  }
  const visible = q => q[2] > 0 || q[3] > 1; // na frente, ou erguido além da borda do globo

  function size() {
    W = glCanvas.clientWidth; H = glCanvas.clientHeight;
    dpr = Math.min(devicePixelRatio || 1, 1.5, Math.sqrt(2.2e6 / Math.max(1, W * H)));
    for (const c of [glCanvas, fxCanvas]) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); }
    gl.viewport(0, 0, glCanvas.width, glCanvas.height);
    fx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  const ease = x => (x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  function frame(now) {
    const t = now - t0;
    // câmera: chega do espaço (raio cresce), varre o mundo da Ásia até o Brasil e aproxima no final
    const base = Math.min(W * .42, H * .36);
    R = base * (.55 + .45 * (1 - Math.pow(1 - Math.min(1, t / 1700), 3))) * (1 + .2 * ease(Math.min(1, Math.max(0, (t - 4500) / 1300))));
    lng0 = 150 - 200 * ease(Math.min(1, t / 4700)) - Math.max(0, t - 4700) * .0006;
    cx = W / 2; cy = H * .48;

    gl.uniform2f(U.uC, cx * dpr, (H - cy) * dpr);
    gl.uniform1f(U.uR, R * dpr);
    gl.uniform1f(U.uLng, lng0 * D);
    gl.uniform1f(U.uTilt, TILT);
    gl.uniform1f(U.uTime, now / 1000);
    gl.uniform1f(U.uFade, Math.min(1, t / 500));
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // selos acendem quando a cidade passa pela frente (o hub também), em sequência
    const pos = tags.map(tg => proj(tg.lat, tg.lng));
    tags.forEach((tg, i) => { if (!tg.on && t > i * 140 && pos[i][2] > .55) { tg.on = true; tg.at = t; } });

    // arcos: rastro fraco + cabeça de cometa na primeira passada; depois um pulso de dado viajando até São Paulo
    fx.clearRect(0, 0, W, H);
    fx.lineCap = 'round';
    for (const tg of tags) {
      if (!tg.on || !tg.arc) continue;
      const pts = tg.arc.map(([la, ln, h]) => proj(la, ln, h));
      const grow = Math.min(1, (t - tg.at) / 1100), n = Math.max(1, Math.round(grow * (pts.length - 1)));
      fx.strokeStyle = 'rgba(201,184,255,.32)';
      fx.lineWidth = 1.1;
      fx.beginPath();
      for (let i = 0, pen = false; i <= n; i++) {
        if (visible(pts[i])) { pen ? fx.lineTo(pts[i][0], pts[i][1]) : fx.moveTo(pts[i][0], pts[i][1]); pen = true; } else pen = false;
      }
      fx.stroke();
      // cabeça (cometa) e, depois de chegar, um pulso de dado que viaja da cidade até São Paulo, em loop
      const head = grow < 1 ? n : Math.round(((t - tg.at - 1100) / 1800 % 1) * (pts.length - 1));
      const from = Math.max(0, head - 7);
      fx.strokeStyle = 'rgba(236,230,255,.95)';
      fx.shadowColor = 'rgba(143,99,254,1)';
      fx.shadowBlur = 10;
      fx.lineWidth = 2;
      fx.beginPath();
      for (let i = from, pen = false; i <= head; i++) {
        if (visible(pts[i])) { pen ? fx.lineTo(pts[i][0], pts[i][1]) : fx.moveTo(pts[i][0], pts[i][1]); pen = true; } else pen = false;
      }
      fx.stroke();
      fx.shadowBlur = 0;
    }
    // pontos das cidades e o pulso duplo de São Paulo
    tags.forEach((tg, i) => {
      const p = pos[i];
      if (!tg.on || p[2] <= 0) return;
      fx.fillStyle = '#fff';
      fx.shadowColor = 'rgba(169,139,255,1)';
      fx.shadowBlur = 8;
      fx.beginPath(); fx.arc(p[0], p[1], tg === hub ? 3.4 : 2.2, 0, 7); fx.fill();
      fx.shadowBlur = 0;
    });
    const hp = pos[0];
    if (hub.on && hp[2] > 0) {
      for (const off of [0, 800]) {
        const ph = ((t - hub.at + off) % 1600) / 1600;
        fx.strokeStyle = `rgba(201,184,255,${(.9 * (1 - ph)).toFixed(2)})`;
        fx.lineWidth = 1.5;
        fx.beginPath(); fx.arc(hp[0], hp[1], 5 + ph * 30, 0, 7); fx.stroke();
      }
    }
    // selos HTML seguem as cidades; atrás do globo somem
    tags.forEach((tg, i) => {
      const p = pos[i];
      tg.el.style.transform = `translate(${p[0].toFixed(1)}px, ${p[1].toFixed(1)}px)`;
      tg.el.classList.toggle('is-on', tg.on && p[2] > .2);
    });
    raf = requestAnimationFrame(frame);
  }

  let ready = false;
  const onResize = () => { if (ready) size(); };
  const prepare = () => {
    if (ready) return;
    size();
    gl.uniform1f(U.uFade, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3); // desenho invisível de aquecimento: o driver compila agora, não na entrada do globo
    ready = true;
  };
  addEventListener('resize', onResize, { passive: true });
  const stop = () => { cancelAnimationFrame(raf); raf = 0; };
  return {
    prepare,
    stop,
    start() { if (raf) return; prepare(); t0 = performance.now(); raf = requestAnimationFrame(frame); },
    dispose() {
      stop();
      removeEventListener('resize', onResize);
      const lose = gl.getExtension('WEBGL_lose_context');
      if (lose) lose.loseContext(); // devolve as texturas da GPU
    },
  };
}

runIntro();
