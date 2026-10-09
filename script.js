// Wavex Payments — interações da landing. Sem dependências.

// ===== CONFIGURAÇÃO — preencha aqui. Campo vazio = o link/elemento some do site (nada de link morto). =====
const CONFIG = {
  whatsapp: '',      // só dígitos com DDI+DDD, ex.: '5511999999999'. Vazio = o WhatsApp pede pra escolher o contato.
  painel: '',        // URL de login do painel (ícone "Entrar" no topo)
  instagram: '',
  linkedin: '',
  youtube: '',
  email: '',         // ex.: 'contato@wavex.com.br'
  termos: '',        // URL dos Termos de uso
  privacidade: '',   // URL da Política de privacidade
  razaoSocial: '',   // ex.: 'Wavex Payments Ltda.'
  cnpj: '',          // ex.: '00.000.000/0001-00'
};

document.documentElement.classList.add('js');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

// ----- links configuráveis -----
$$('[data-link]').forEach(a => {
  const v = CONFIG[a.dataset.link];
  if (!v) { (a.closest('li') || a).hidden = true; return; }
  a.href = a.dataset.link === 'email' ? `mailto:${v}` : v;
  if (a.dataset.link === 'email') $('span', a).textContent = v;
  else { a.target = '_blank'; a.rel = 'noopener'; }
});
const legal = $('[data-legal]');
if (legal && (CONFIG.razaoSocial || CONFIG.cnpj)) {
  legal.textContent = [CONFIG.razaoSocial, CONFIG.cnpj && `CNPJ ${CONFIG.cnpj}`].filter(Boolean).join(' · ');
  legal.hidden = false;
}
$$('.socials').forEach(ul => { if (!$$('li:not([hidden])', ul).length) ul.hidden = true; });

// ----- cabeçalho -----
const header = $('.site-header');
const onScroll = () => header.classList.toggle('is-scrolled', scrollY > 8);
addEventListener('scroll', onScroll, { passive: true });
onScroll();

const menuBtn = $('.menu-toggle');
const setMenu = open => {
  menuBtn.setAttribute('aria-expanded', open);
  menuBtn.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
  $('use', menuBtn).setAttribute('href', open ? '#i-x' : '#i-menu');
  document.body.classList.toggle('nav-open', open);
};
menuBtn.addEventListener('click', () => setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'));

// submenus (desktop abre no hover pelo CSS; clique/teclado pelo aria-expanded)
const subBtns = $$('.nav-link[aria-controls]');
const closeSubs = except => subBtns.forEach(b => b !== except && b.setAttribute('aria-expanded', 'false'));
subBtns.forEach(b => b.addEventListener('click', () => {
  closeSubs(b);
  b.setAttribute('aria-expanded', b.getAttribute('aria-expanded') !== 'true');
}));
$$('.nav-item').forEach(item => item.addEventListener('focusout', e => {
  if (!item.contains(e.relatedTarget)) $('.nav-link', item).setAttribute('aria-expanded', 'false');
}));
document.addEventListener('click', e => { if (!e.target.closest('.nav-item')) closeSubs(); });
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  closeSubs();
  if (document.body.classList.contains('nav-open')) { setMenu(false); menuBtn.focus(); }
});
$('#site-nav').addEventListener('click', e => {
  if (!e.target.closest('a')) return;
  closeSubs();
  setMenu(false);
  document.activeElement.blur();
});

// ----- hero: frase rotativa -----
const rotator = $('[data-rotator]');
if (rotator) {
  const words = $$('.rot-item', rotator), subs = $$('.rot-sub'), dots = $$('.hero-dots button');
  let i = 0, timer;
  const show = n => {
    i = (n + words.length) % words.length;
    words.forEach((w, k) => { w.classList.toggle('is-active', k === i); w.setAttribute('aria-hidden', k !== i); });
    subs.forEach((s, k) => { s.classList.toggle('is-active', k === i); s.setAttribute('aria-hidden', k !== i); });
    dots.forEach((d, k) => d.setAttribute('aria-current', k === i));
  };
  const play = () => { if (!reduce) timer = setInterval(() => show(i + 1), 3400); };
  dots.forEach((d, k) => d.addEventListener('click', () => { clearInterval(timer); show(k); play(); }));
  play();
}

// ----- hero: partículas violeta -----
const canvas = $('.hero-particles');
if (canvas && !reduce) {
  const ctx = canvas.getContext('2d');
  let w = 0, h = 0, parts = [], raf = 0, running = false;
  const resize = () => {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    w = canvas.clientWidth; h = canvas.clientHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  const spawn = (y = Math.random() * h) => ({
    x: Math.random() * w, y, r: Math.random() * 1.5 + .35,
    vy: -(Math.random() * .22 + .04), vx: (Math.random() - .5) * .08,
    a: Math.random() * .55 + .2, t: Math.random() * 6.28,
  });
  const tick = () => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#8F63FE';
    for (const p of parts) {
      p.x += p.vx; p.y += p.vy; p.t += .02;
      if (p.y < -4) Object.assign(p, spawn(h + 4));
      ctx.globalAlpha = p.a * (.55 + .45 * Math.sin(p.t));
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill();
    }
    raf = running ? requestAnimationFrame(tick) : 0;
  };
  resize();
  parts = Array.from({ length: Math.min(110, Math.round(w * h / 12000)) }, () => spawn());
  addEventListener('resize', resize, { passive: true });
  // só anima com o hero na tela
  new IntersectionObserver(([e]) => {
    running = e.isIntersecting;
    if (running && !raf) tick();
  }).observe(canvas);
}

// ----- entrada suave ao rolar -----
const revealer = new IntersectionObserver(entries => entries.forEach(e => {
  if (!e.isIntersecting) return;
  e.target.classList.add('is-in');
  revealer.unobserve(e.target);
}), { rootMargin: '0px 0px -8% 0px' });
$$('[data-reveal]').forEach(el => revealer.observe(el));

// ----- para quem é: carrossel de segmentos -----
const seg = $('[data-segments]');
if (seg) {
  const slides = $$('.seg-slide', seg), items = $$('.seg-item', seg), count = $('.seg-count', seg);
  const pad = n => String(n).padStart(2, '0');
  let i = 0;
  const show = n => {
    i = (n + slides.length) % slides.length;
    slides.forEach((s, k) => { s.hidden = k !== i; });
    items.forEach((b, k) => b.setAttribute('aria-current', k === i));
    count.textContent = `${pad(i + 1)} / ${pad(slides.length)}`;
  };
  $('.seg-prev', seg).addEventListener('click', () => show(i - 1));
  $('.seg-next', seg).addEventListener('click', () => show(i + 1));
  items.forEach((b, k) => b.addEventListener('click', () => show(k)));
}

// ----- abas (métodos de pagamento) -----
$$('[role="tablist"]').forEach(list => {
  const tabs = $$('[role="tab"]', list);
  const select = t => tabs.forEach(x => {
    const on = x === t;
    x.setAttribute('aria-selected', on);
    x.tabIndex = on ? 0 : -1;
    document.getElementById(x.getAttribute('aria-controls')).hidden = !on;
  });
  tabs.forEach((t, k) => {
    t.addEventListener('click', () => select(t));
    t.addEventListener('keydown', e => {
      const d = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
      if (!d) return;
      const n = tabs[(k + d + tabs.length) % tabs.length];
      select(n); n.focus();
    });
  });
});

// links do menu/rodapé que abrem a aba ou o segmento certo
$$('[data-tab]').forEach(a => a.addEventListener('click', () => document.getElementById(a.dataset.tab).click()));
$$('[data-seg]').forEach(a => a.addEventListener('click', () => $$('.seg-item')[a.dataset.seg].click()));

// ----- como funciona: seção fixa, etapa muda conforme a rolagem -----
const stepsSec = $('[data-steps]');
if (stepsSec) {
  const pinned = matchMedia('(min-width: 960px) and (min-height: 760px)'); // mesmo breakpoint do CSS
  const steps = $$('.step', stepsSec), panels = $$('.journey-panel', stepsSec), tabs = $$('.journey-tab', stepsSec);
  const bar = $('.journey-bar i', stepsSec);
  let cur = -1, queued = false;
  const set = n => {
    if (n === cur) return;
    cur = n;
    steps.forEach((s, k) => s.classList.toggle('is-active', k === n));
    panels.forEach((p, k) => { p.hidden = k !== n; });
    tabs.forEach((t, k) => { t.classList.toggle('is-active', k <= n); t.setAttribute('aria-current', k === n); });
  };
  const progress = () => {
    const r = stepsSec.getBoundingClientRect();
    return Math.min(Math.max(-r.top / (r.height - innerHeight), 0), .999);
  };
  const update = () => {
    queued = false;
    if (!pinned.matches) { bar.style.transform = ''; return set(0); }
    const p = progress();
    set(Math.floor(p * steps.length));
    bar.style.transform = `scaleX(${Math.max(p, .02)})`;
  };
  addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(update); } }, { passive: true });
  pinned.addEventListener('change', update);
  tabs.forEach((t, k) => t.addEventListener('click', () => {
    if (!pinned.matches) return set(k);
    const r = stepsSec.getBoundingClientRect();
    scrollTo({ top: scrollY + r.top + (r.height - innerHeight) * (k + .5) / steps.length, behavior: reduce ? 'auto' : 'smooth' });
  }));
  update();
}

// ----- formulário em etapas → mensagem pronta no WhatsApp -----
const form = $('#lead-form');
if (form) {
  const steps = $$('.form-step', form), marks = $$('.stepper li', form);
  const back = $('[data-back]', form), next = $('[data-next]', form), submit = $('[data-submit]', form);
  const done = $('.form-done', form), summary = $('.summary', form);
  const last = steps.length - 1;
  let i = 0;

  const fields = () => {
    const d = new FormData(form);
    return $$('[data-label]', form)
      .map(el => [el.dataset.label, String(d.get(el.name) || '').trim()])
      .filter(([, v]) => v);
  };
  const go = n => {
    i = n;
    steps.forEach((s, k) => { s.hidden = k !== i; });
    marks.forEach((m, k) => { m.classList.toggle('is-active', k === i); m.classList.toggle('is-done', k < i); });
    back.hidden = i === 0; next.hidden = i === last; submit.hidden = i !== last;
    if (i === last) {
      summary.replaceChildren(...fields().map(([k, v]) => {
        const row = document.createElement('div'), dt = document.createElement('dt'), dd = document.createElement('dd');
        dt.textContent = k; dd.textContent = v; row.append(dt, dd);
        return row;
      }));
    }
    const first = $('input, select', steps[i]);
    if (first && n > 0) first.focus({ preventScroll: true });
  };
  // valida só os campos da etapa visível (o resto está escondido)
  const valid = () => $$('input, select', steps[i]).every(f => f.reportValidity());

  next.addEventListener('click', () => { if (valid()) go(i + 1); });
  back.addEventListener('click', () => go(i - 1));
  form.addEventListener('submit', e => {
    e.preventDefault();
    if (i < last) { if (valid()) go(i + 1); return; } // Enter no meio do formulário = avançar
    const msg = ['Olá, Wavex! Quero escalar com a Wavex.', '', ...fields().map(([k, v]) => `• ${k}: ${v}`)].join('\n');
    const url = `https://wa.me/${CONFIG.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`;
    $('a', done).href = url;
    done.hidden = false;
    window.open(url, '_blank', 'noopener');
  });
  go(0);
}
