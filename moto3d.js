/**
 * moto3d.js — Efeito 3D interativo para a foto da moto
 * CSS perspective + transforms + rAF — sem dependências externas
 */

const IMAGE_PATH = 'moto-hero-3d.png';

function lerp(a, b, t) { return a + (b - a) * t; }

function initMoto3D(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── keyframes CSS (injetados uma vez) ── */
  if (!document.getElementById('_m3d-css')) {
    const s = document.createElement('style');
    s.id = '_m3d-css';
    s.textContent = `
      @keyframes _m3dGlow {
        0%,100%{opacity:.65} 50%{opacity:1}
      }
      @keyframes _m3dPart {
        0%,100%{transform:translate(0,0) scale(1);opacity:.55}
        50%{transform:translate(var(--pdx,0px),var(--pdy,-14px)) scale(1.2);opacity:.15}
      }
      @media(prefers-reduced-motion:reduce){
        ._m3d-wrap,._m3d-glow,._m3d-part{animation:none!important;}
      }
    `;
    document.head.appendChild(s);
  }

  /* ── glow radial de fundo ── */
  const glow = document.createElement('div');
  glow.className = '_m3d-glow';
  glow.style.cssText = [
    'position:absolute','bottom:0','left:50%','transform:translateX(-50%)',
    'width:88%','height:72%','pointer-events:none',
    'background:radial-gradient(ellipse at 50% 85%,rgba(29,78,216,.28) 0%,rgba(147,197,253,.13) 44%,transparent 70%)',
    'animation:_m3dGlow 3.4s ease-in-out infinite',
  ].join(';');
  container.appendChild(glow);

  /* ── partículas flutuantes ── */
  const pWrap = document.createElement('div');
  pWrap.style.cssText = 'position:absolute;inset:0;overflow:hidden;pointer-events:none;';
  const NP = window.innerWidth < 640 ? 9 : 15;
  for (let i = 0; i < NP; i++) {
    const el  = document.createElement('span');
    el.className = '_m3d-part';
    const sz  = (1.5 + Math.random() * 3.5).toFixed(1);
    const x   = (4   + Math.random() * 88).toFixed(1);
    const y   = (8   + Math.random() * 78).toFixed(1);
    const dy  = -(6  + Math.random() * 12).toFixed(0);
    const dx  = ((Math.random() - .5) * 7).toFixed(1);
    const dur = (2.8 + Math.random() * 3.5).toFixed(2);
    const del = (Math.random() * 4.5).toFixed(2);
    el.style.cssText = [
      'position:absolute','border-radius:50%',
      `width:${sz}px`,`height:${sz}px`,
      `left:${x}%`,`top:${y}%`,
      'background:rgba(147,197,253,.8)',
      `box-shadow:0 0 ${(+sz * 2).toFixed()}px rgba(147,197,253,.5)`,
      `--pdx:${dx}px`,`--pdy:${dy}px`,
      `animation:_m3dPart ${dur}s ${del}s ease-in-out infinite`,
    ].join(';');
    pWrap.appendChild(el);
  }
  container.appendChild(pWrap);

  /* ── sombra elíptica no chão (dinâmica via JS) ── */
  const shadowEl = document.createElement('div');
  shadowEl.style.cssText = [
    'position:absolute','bottom:4%','left:50%','transform:translateX(-50%)',
    'width:54%','height:5%','pointer-events:none',
    'background:radial-gradient(ellipse,rgba(2,6,23,.20) 0%,transparent 70%)',
    'filter:blur(9px)',
  ].join(';');
  container.appendChild(shadowEl);

  /* ── wrapper 3D (recebe os transforms JS) ── */
  const wrap = document.createElement('div');
  wrap.className = '_m3d-wrap';
  wrap.style.cssText = [
    'position:absolute','inset:0',
    'display:flex','align-items:flex-end','justify-content:center',
    'padding-bottom:5%',
    'transform-style:preserve-3d',
    'will-change:transform',
    'transform-origin:50% 38%',
  ].join(';');

  /* ── imagem da moto ── */
  const img = document.createElement('img');
  img.src      = IMAGE_PATH;
  img.alt      = 'Moto Veneza interativa';
  img.draggable = false;
  img.style.cssText = [
    'max-height:84%','max-width:93%',
    'object-fit:contain',
    'filter:drop-shadow(0 16px 32px rgba(29,78,216,.44))',
    'pointer-events:none',
    'user-select:none',
    '-webkit-user-drag:none',
    'display:block',
  ].join(';');

  img.onerror = () => {
    img.style.display = 'none';
    glow.style.opacity = '1';
    console.info('[moto3d] Adicione moto-hero-3d.png na raiz do projeto.');
  };

  wrap.appendChild(img);
  container.appendChild(wrap);

  /* ── loop de animação ── */
  const target  = { x: 0, y: 0 };
  const current = { x: 0, y: 0 };
  let raf;
  const t0 = performance.now();

  function tick() {
    raf = requestAnimationFrame(tick);

    current.x = lerp(current.x, target.x, 0.065);
    current.y = lerp(current.y, target.y, 0.065);

    if (reducedMotion) return;

    const t      = (performance.now() - t0) * 0.001;
    const floatY = Math.sin(t * 0.52) * 9;
    const rockZ  = Math.sin(t * 0.33) * 0.7;
    const tiltX  = current.x * 14;
    const tiltY  = current.y * 18;

    wrap.style.transform =
      `perspective(900px) translateY(${floatY}px) rotateZ(${rockZ}deg) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;

    const sc = 1 - Math.abs(floatY) * 0.007;
    shadowEl.style.transform = `translateX(-50%) scale(${sc},${(sc*.94).toFixed(3)})`;
  }
  tick();

  /* ── interação: mouse ── */
  function fromPointer(cx, cy) {
    const r = container.getBoundingClientRect();
    target.y =  (cx - r.left - r.width  * .5) / r.width;
    target.x = -(cy - r.top  - r.height * .5) / r.height;
  }
  function onMouse(e) { if (!reducedMotion) fromPointer(e.clientX, e.clientY); }
  function onTouch(e) { if (!reducedMotion && e.touches[0]) fromPointer(e.touches[0].clientX, e.touches[0].clientY); }
  function onLeave()  { target.x = 0; target.y = 0; }

  document.addEventListener('mousemove',   onMouse, { passive: true });
  container.addEventListener('touchmove',  onTouch, { passive: true });
  container.addEventListener('mouseleave', onLeave);

  /* ── interação: giroscópio ── */
  let gyroOff = null;
  function setupGyro() {
    function onOrient(e) {
      if (reducedMotion) return;
      target.y = Math.max(-1, Math.min(1, (e.gamma || 0) / 38));
      target.x = Math.max(-1, Math.min(1, ((e.beta  || 45) - 45) / 38)) * -1;
    }
    window.addEventListener('deviceorientation', onOrient, { passive: true });
    return onOrient;
  }

  if (typeof DeviceOrientationEvent !== 'undefined') {
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      container.addEventListener('click', async () => {
        const p = await DeviceOrientationEvent.requestPermission().catch(() => 'denied');
        if (p === 'granted') gyroOff = setupGyro();
      }, { once: true });
    } else {
      gyroOff = setupGyro();
    }
  }

  /* ── esconder hint ── */
  const hint = container.querySelector('.hero-3d-hint');
  if (hint) {
    const hide = () => hint.classList.add('hero-3d-hint--hidden');
    container.addEventListener('mousemove', hide, { once: true });
    container.addEventListener('touchstart', hide, { once: true, passive: true });
  }

  /* ── cleanup ── */
  return () => {
    cancelAnimationFrame(raf);
    document.removeEventListener('mousemove',   onMouse);
    container.removeEventListener('touchmove',  onTouch);
    container.removeEventListener('mouseleave', onLeave);
    if (gyroOff) window.removeEventListener('deviceorientation', gyroOff);
  };
}

/* ── boot ── */
function boot() { initMoto3D('hero-3d-mount'); }

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
