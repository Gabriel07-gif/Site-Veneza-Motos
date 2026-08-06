// moto3d.js — Cena 3D interativa da hero (Three.js vendorizado em ./vendor/)
// Canvas transparente sobre o degradê da hero, com luzes de estúdio e
// OrbitControls restrito (rotação horizontal limitada, sem ver por baixo).
// Fallback: se WebGL não estiver disponível, mostra a foto moto-hero-3d.png.

import * as THREE from './vendor/three.module.min.js';
import { OrbitControls } from './vendor/OrbitControls.js';
import { createMotoTrailVenezaModel, configureMotoTrailVenezaRenderer } from './vendor/createMotoModel.js';

const IMAGE_FALLBACK = 'moto-hero-3d.png';

function webglDisponivel() {
    try {
        const canvas = document.createElement('canvas');
        return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'));
    } catch (e) {
        return false;
    }
}

function mostrarFallback(container) {
    const img = document.createElement('img');
    img.className = 'hero-3d-fallback';
    img.src = IMAGE_FALLBACK;
    img.alt = '';
    img.decoding = 'async';
    container.appendChild(img);
}

function esconderHint(container) {
    const hint = container.querySelector('.hero-3d-hint');
    if (!hint) return;
    container.addEventListener('pointerdown', () => {
        hint.classList.add('hero-3d-hint--hidden');
    }, { once: true, passive: true });
}

function initMoto3D(mountId) {
    const container = document.getElementById(mountId);
    if (!container || container.dataset.m3dReady) return;
    container.dataset.m3dReady = '1';

    if (!webglDisponivel()) {
        mostrarFallback(container);
        return;
    }

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ---- Cena, câmara e renderer (canvas transparente) ----
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(
        38,
        container.clientWidth / container.clientHeight,
        0.1,
        100
    );
    camera.position.set(0, 1.1, 4.2);

    let renderer;
    try {
        renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    } catch (e) {
        mostrarFallback(container);
        return;
    }
    renderer.setClearColor(0x000000, 0);
    configureMotoTrailVenezaRenderer(renderer); // ACESFilmic + sRGB (intencao do spec)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight, false);
    renderer.domElement.classList.add('hero-3d-canvas');
    renderer.domElement.setAttribute('aria-hidden', 'true');
    container.appendChild(renderer.domElement);

    // ---- Iluminação de estúdio (intensidades para tone mapping ACES) ----
    scene.add(new THREE.AmbientLight(0xffffff, 0.9));

    const luzPrincipal = new THREE.DirectionalLight(0xffffff, 2.2);
    luzPrincipal.position.set(3, 4, 2.5);
    scene.add(luzPrincipal);

    const luzPreenchimento = new THREE.DirectionalLight(0x93c5fd, 0.7);
    luzPreenchimento.position.set(-3, 2, -2);
    scene.add(luzPreenchimento);

    const luzRecorte = new THREE.DirectionalLight(0xdbeafe, 0.6);
    luzRecorte.position.set(-1, 3, 3);
    scene.add(luzRecorte);

    // ============================================================
    // Modelo procedural da moto gerado pelo pipeline img2threejs
    // (vendor/createMotoModel.js, spec em vendor/img2threejs-spec/).
    // Reconstrução estilizada aproximada de moto-hero-3d.png.
    // ============================================================
    const motoGroup = new THREE.Group();
    const moto = createMotoTrailVenezaModel();
    // enquadrar: escala para preencher a cena e centrar no alvo dos controles
    const MODEL_SCALE = 1.25;
    moto.scale.setScalar(MODEL_SCALE);
    const bounds = new THREE.Box3().setFromObject(moto);
    const centro = bounds.getCenter(new THREE.Vector3());
    moto.position.sub(centro); // centro do modelo na origem do grupo
    motoGroup.add(moto);
    // vista inicial 3/4 frontal-direita, como na foto de referência
    const BASE_YAW = 0.55;
    motoGroup.rotation.y = BASE_YAW;

    motoGroup.position.y = 0.5;
    scene.add(motoGroup);
    camera.lookAt(motoGroup.position);

    // ---- OrbitControls restrito ----
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.copy(motoGroup.position);
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.minDistance = 3.2;          // bloqueia zoom extremo
    controls.maxDistance = 5.5;
    controls.minAzimuthAngle = -0.9;     // rotação horizontal limitada (~±51°)
    controls.maxAzimuthAngle = 0.9;
    controls.minPolarAngle = Math.PI / 3;      // não sobrevoa demasiado
    controls.maxPolarAngle = Math.PI / 2.05;   // nunca vê por baixo da moto
    controls.update();

    // ---- Resize fluido (aspect ratio da câmara acompanha o container) ----
    const onResize = () => {
        const w = container.clientWidth;
        const h = container.clientHeight;
        if (!w || !h) return;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h, false);
    };
    if ('ResizeObserver' in window) {
        new ResizeObserver(onResize).observe(container);
    } else {
        window.addEventListener('resize', onResize, { passive: true });
    }

    // ---- Loop de render, pausado fora do viewport e com a aba oculta ----
    let visivelNoViewport = true;
    let rafId = 0;
    const clock = new THREE.Clock();

    function frame() {
        rafId = requestAnimationFrame(frame);
        const t = clock.getElapsedTime();
        if (!reducedMotion) {
            // leve oscilação idle em torno da pose 3/4; floating do container é CSS
            motoGroup.rotation.y = BASE_YAW + Math.sin(t * 0.4) * 0.1;
        }
        controls.update();
        renderer.render(scene, camera);
    }

    function atualizarLoop() {
        const deveCorrer = visivelNoViewport && !document.hidden;
        if (deveCorrer && !rafId) {
            clock.start();
            frame();
        } else if (!deveCorrer && rafId) {
            cancelAnimationFrame(rafId);
            rafId = 0;
        }
    }

    if ('IntersectionObserver' in window) {
        new IntersectionObserver((entries) => {
            visivelNoViewport = entries[0].isIntersecting;
            atualizarLoop();
        }).observe(container);
    }
    document.addEventListener('visibilitychange', atualizarLoop);

    esconderHint(container);
    atualizarLoop();
}

initMoto3D('hero-3d-mount');
