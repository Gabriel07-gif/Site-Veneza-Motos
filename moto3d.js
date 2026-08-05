/**
 * moto3d.js — Efeito 3D interativo para a foto da moto
 * CSS perspective + transforms + rAF — sem dependências externas
 */

const IMAGE_PATH = 'moto-hero-3d.png';

function lerp(a, b, t) { return a + (b - a) * t; }

function initMoto3D(containerId) {
  const container = document.getElementById(containerId);
  if (!container || container.dataset.m3dReady) return;
  container.dataset.m3dReady = '1';

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── keyframes CSS ── */
  if (!document.getElementById('_m3d-css')) {
    const s = document.createElement('style');
    s.id = '_m3d-css';
    s.textContent = `
      @keyframes _m3dGlow {
        0%,100%{opacity:.55;transform:translateX(-50%) scaleX(1)}
        50%{opacity:1;transform:translateX(-50%) scaleX(1.1)}
      }
      @keyframes _m3dPart {
        0%,100%{transform:translate(0,0) scale(1);opacity:.75}
        50%{transform:translate(var(--pdx,0px),var(--pdy,-12px)) scale(1.35);opacity:.08}
      }
      ._m3d-img {
        mix-blend-mode: multiply;
      }
      body[data-theme="dark"] ._m3d-img {
        mix-blend-mode: normal;
      }
      @media(prefers-reduced-motion:reduce){
        ._m3d-glow,._m3d-part{animation:none!important;}
      }
    `;
    document.head.appendChild(s);
  }

  /* ── save existing hint before adding elements ── */
  const hint = container.querySelector('.hero-3d-hint');

  /* ── glow que segue o cursor ── */
  const glowCursor = document.createElement('div');
  glowCursor.style.cssText = [
    'position:absolute','inset:0','pointer-events:none','z-index:1',
    'border-radius:inherit','opacity:0','transition:opacity .3s ease',
  ].join(';');
  container.appendChild(glowCursor);

  /* ── glow radial de fundo ── */
  const glowBase = document.createElement('div');
  glowBase.className = '_m3d-glow';
  glowBase.style.cssText = [
    'position:absolute','bottom:-8%','left:50%',
    'width:110%','height:55%','pointer-events:none','z-index:1',
    'background:radial-gradient(ellipse at 50% 100%,rgba(29,78,216,.4) 0%,rgba(99,102,241,.18) 42%,transparent 68%)',
    'filter:blur(4px)',
    'animation:_m3dGlow 3.6s ease-in-out infinite',
  ].join(';');
  container.appendChild(glowBase);

  /* ── partículas flutuantes ── */
  const pWrap = document.createElement('div');
  pWrap.style.cssText = 'position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:2;';
  const NP = window.innerWidth < 640 ? 11 : 22;
  for (let i = 0; i < NP; i++) {
    const el  = document.createElement('span');
    el.className = '_m3d-part';
    const sz  = (1 + Math.random() * 4.5).toFixed(1);
    const x   = (4   + Math.random() * 90).toFixed(1);
    const y   = (5   + Math.random() * 85).toFixed(1);
    const dy  = -(7  + Math.random() * 14).toFixed(0);
    const dx  = ((Math.random() - .5) * 10).toFixed(1);
    const dur = (2.4 + Math.random() * 4.2).toFixed(2);
    const del = (Math.random() * 5.5).toFixed(2);
    const col = Math.random() > .5
      ? 'rgba(99,102,241,.9)' : 'rgba(147,197,253,.9)';
    el.style.cssText = [
      'position:absolute','border-radius:50%',
      `width:${sz}px`,`height:${sz}px`,
      `left:${x}%`,`top:${y}%`,
      `background:${col}`,
      `box-shadow:0 0 ${(+sz * 3).toFixed()}px ${col}`,
      `--pdx:${dx}px`,`--pdy:${dy}px`,
      `animation:_m3dPart ${dur}s ${del}s ease-in-out infinite`,
    ].join(';');
    pWrap.appendChild(el);
  }
  container.appendChild(pWrap);

  /* ── sombra no chão ── */
  const shadowEl = document.createElement('div');
  shadowEl.style.cssText = [
    'position:absolute','bottom:1%','left:50%','transform:translateX(-50%)',
    'width:64%','height:7%','pointer-events:none','z-index:2',
    'background:radial-gradient(ellipse,rgba(2,6,23,.32) 0%,transparent 70%)',
    'filter:blur(11px)',
  ].join(';');
  container.appendChild(shadowEl);

  /* ── wrapper 3D ── */
  const wrap = document.createElement('div');
  wrap.style.cssText = [
    'position:absolute','inset:0',
    'display:flex','align-items:center','justify-content:center',
    'transform-style:preserve-3d',
    'will-change:transform',
    'transform-origin:50% 50%',
    'z-index:3',
  ].join(';');

  /* ── imagem ── */
  const img = document.createElement('img');
  img.className = '_m3d-img';
  img.src      = IMAGE_PATH;
  img.alt      = 'Moto Veneza 3D interativa';
  img.draggable = false;
  img.style.cssText = [
    'height:88%',
    'width:auto',
    'max-width:96%',
    'max-height:88%',
    'object-fit:contain',
    'filter:drop-shadow(0 18px 36px rgba(29,78,216,.55)) drop-shadow(0 0 22px rgba(99,102,241,.4))',
    'pointer-events:none',
    'user-select:none',
    '-webkit-user-drag:none',
    'display:block',
  ].join(';');

  img.onerror = () => {
    img.style.display = 'none';
    glowBase.style.opacity = '1';
    console.info('[moto3d] Adicione moto-hero-3d.png na raiz do projeto.');
  };

  wrap.appendChild(img);
  container.appendChild(wrap);

  /* ── estado ── */
  const target  = { x: 0, y: 0 };
  const current = { x: 0, y: 0 };
  let mouseNX = 0.5, mouseNY = 0.5;
  let raf;
  const t0 = performance.now();

  function tick() {
    raf = requestAnimationFrame(tick);
    current.x = lerp(current.x, target.x, 0.07);
    current.y = lerp(current.y, target.y, 0.07);

    if (!reducedMotion) {
      const t      = (performance.now() - t0) * 0.001;
      const floatY = Math.sin(t * 0.48) * 10;
      const rockZ  = Math.sin(t * 0.29) * 1.1;
      const tiltX  = current.x * 18;
      const tiltY  = current.y * 24;

      wrap.style.transform =
        `perspective(1100px) translateY(${floatY}px) rotateZ(${rockZ}deg) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;

      const sc   = 0.82 + 0.18 * (1 - Math.abs(floatY) / 10);
      const scX  = sc * (1 + Math.abs(current.y) * 0.12);
      shadowEl.style.transform = `translateX(-50%) scaleX(${+scX.toFixed(3)}) scaleY(${+(sc * 0.75).toFixed(3)})`;

      /* glow que segue o cursor */
      const gx = (mouseNX * 100).toFixed(1);
      const gy = (mouseNY * 100).toFixed(1);
      glowCursor.style.background =
        `radial-gradient(circle at ${gx}% ${gy}%, rgba(99,102,241,.14) 0%, transparent 58%)`;
      glowCursor.style.opacity = '1';
    }
  }
  tick();

  /* ── interação ── */
  function fromPointer(cx, cy) {
    const r = container.getBoundingClientRect();
    mouseNX = (cx - r.left) / r.width;
    mouseNY = (cy - r.top)  / r.height;
    target.y = Math.max(-1, Math.min(1, (cx - r.left - r.width  * .5) / (r.width  * .5)));
    target.x = Math.max(-1, Math.min(1,-(cy - r.top  - r.height * .5) / (r.height * .5)));
  }

  function onMouse(e) { if (!reducedMotion) fromPointer(e.clientX, e.clientY); }
  function onTouch(e) { if (!reducedMotion && e.touches[0]) fromPointer(e.touches[0].clientX, e.touches[0].clientY); }
  function onLeave()  { target.x = 0; target.y = 0; mouseNX = 0.5; mouseNY = 0.5; }

  document.addEventListener('mousemove',   onMouse, { passive: true });
  container.addEventListener('touchmove',  onTouch, { passive: true });
  container.addEventListener('mouseleave', onLeave);

  /* ── giroscópio ── */
  let gyroHandler = null;
  function setupGyro() {
    gyroHandler = (e) => {
      if (reducedMotion) return;
      target.y = Math.max(-1, Math.min(1, (e.gamma || 0) / 35));
      target.x = Math.max(-1, Math.min(1, ((e.beta  || 45) - 45) / 35)) * -1;
    };
    window.addEventListener('deviceorientation', gyroHandler, { passive: true });
  }

  if (typeof DeviceOrientationEvent !== 'undefined') {
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      container.addEventListener('click', async () => {
        const p = await DeviceOrientationEvent.requestPermission().catch(() => 'denied');
        if (p === 'granted') setupGyro();
      }, { once: true });
    } else {
      setupGyro();
    }
  }

  /* ── hint ── */
  if (hint) {
    const hideHint = () => hint.classList.add('hero-3d-hint--hidden');
    container.addEventListener('mousemove',  hideHint, { once: true });
    container.addEventListener('touchstart', hideHint, { once: true, passive: true });
  }

  /* ── cleanup ── */
  return () => {
    cancelAnimationFrame(raf);
    document.removeEventListener('mousemove',   onMouse);
    container.removeEventListener('touchmove',  onTouch);
    container.removeEventListener('mouseleave', onLeave);
    if (gyroHandler) window.removeEventListener('deviceorientation', gyroHandler);
  };
}

/* ── boot ── */
function boot() { initMoto3D('hero-3d-mount'); }

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
