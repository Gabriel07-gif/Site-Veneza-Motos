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

// ---- Materiais partilhados (4 no total — menos trocas de estado na GPU) ----
// Cores da referência real: azul gloss (carenagens/tanque/para-lama),
// preto fosco (pneus/banco/plásticos), prata metálica (motor/raios/forquilha).
function criarMateriaisPartilhados() {
    return {
        azul: new THREE.MeshStandardMaterial({ color: 0x1a4f8a, roughness: 0.2, metalness: 0.1 }),
        preto: new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.9, metalness: 0.0 }),
        prata: new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.3, metalness: 0.8 }),
        farol: new THREE.MeshStandardMaterial({
            color: 0xf1f5f9, roughness: 0.15, metalness: 0.0,
            emissive: 0xdbeafe, emissiveIntensity: 0.5
        })
    };
}

const GRUPO_MATERIAL = {
    azul: ['front-fender', 'fuel-tank', 'headlight-cowl', 'tail-panel-r', 'tail-panel-l'],
    preto: ['tire-front', 'tire-rear', 'seat', 'seat-pillion', 'handlebar',
            'shroud-r', 'shroud-l', 'windscreen', 'mirror-r', 'mirror-l',
            'mirror-stalk-r', 'mirror-stalk-l', 'fork-gaiter-r', 'fork-gaiter-l',
            'chain-guard', 'cylinder-block', 'rear-fender', 'root',
            'rep-tread-front', 'rep-tread-rear'],
    farol: ['headlight']
    // tudo o resto (motor, cubos, aros, raios, forquilha, quadro, escape) -> prata
};

function aplicarMateriaisPartilhados(moto) {
    const mats = criarMateriaisPartilhados();
    const porId = new Map();
    for (const [grupo, ids] of Object.entries(GRUPO_MATERIAL)) {
        for (const id of ids) porId.set(id, mats[grupo]);
    }
    const runtime = moto.userData.sculptRuntime || { meshes: {} };
    const idPorMesh = new Map(Object.entries(runtime.meshes).map(([id, m]) => [m, id]));
    const descartados = new Set();

    moto.traverse((obj) => {
        if (!obj.isMesh) return;
        const id = idPorMesh.get(obj) || obj.name; // clusters instanciados usam o nome
        const novo = porId.get(id) || mats.prata;
        const antigo = obj.material;
        obj.material = novo;
        obj.castShadow = false;
        obj.receiveShadow = false;
        if (antigo && antigo !== novo && !descartados.has(antigo)) {
            descartados.add(antigo);
            for (const chave of ['map', 'roughnessMap', 'normalMap', 'aoMap', 'bumpMap', 'displacementMap']) {
                if (antigo[chave]) antigo[chave].dispose();
            }
            antigo.dispose();
        }
    });
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
    // dispositivos fracos: sem antialias e sem oscilação idle (render só sob interação)
    const lowEnd = (navigator.hardwareConcurrency || 8) <= 4
        || (navigator.deviceMemory || 8) <= 2;

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
        renderer = new THREE.WebGLRenderer({ alpha: true, antialias: !lowEnd, powerPreference: 'high-performance' });
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
    const moto = createMotoTrailVenezaModel({ castShadow: false, receiveShadow: false });
    aplicarMateriaisPartilhados(moto);
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

    // ---- Render sob demanda: só desenha quando algo muda ----
    let precisaRender = true; // primeiro frame
    controls.addEventListener('change', () => { precisaRender = true; });

    // ---- Resize fluido (aspect ratio da câmara acompanha o container) ----
    const onResize = () => {
        const w = container.clientWidth;
        const h = container.clientHeight;
        if (!w || !h) return;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h, false);
        precisaRender = true;
    };
    if ('ResizeObserver' in window) {
        new ResizeObserver(onResize).observe(container);
    } else {
        window.addEventListener('resize', onResize, { passive: true });
    }

    // ---- Loop de render, pausado fora do viewport e com a aba oculta ----
    // Oscilação idle só em dispositivos capazes; sem ela, o rAF corre quase
    // sem custo e o render só acontece durante a interação (evento change).
    const oscilacaoAtiva = !reducedMotion && !lowEnd;
    let visivelNoViewport = true;
    let rafId = 0;
    const clock = new THREE.Clock();

    function frame() {
        rafId = requestAnimationFrame(frame);
        if (oscilacaoAtiva) {
            const t = clock.getElapsedTime();
            motoGroup.rotation.y = BASE_YAW + Math.sin(t * 0.4) * 0.1;
            precisaRender = true;
        }
        controls.update(); // dispara 'change' enquanto o damping assenta
        if (precisaRender) {
            precisaRender = false;
            renderer.render(scene, camera);
        }
    }

    function atualizarLoop() {
        const deveCorrer = visivelNoViewport && !document.hidden;
        if (deveCorrer && !rafId) {
            clock.start();
            precisaRender = true; // redesenha ao voltar ao viewport/aba
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
