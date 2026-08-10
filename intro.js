(function () {
    'use strict';

    /* ── Config ──────────────────────────────────── */
    var SCENE_DURATION  = 2800; // ms per story scene (total ~8.4s max if un-tapped)
    var TOTAL_SCENES    = 3;
    var isMobile = window.innerWidth <= 768;
    var isLowEndDevice = navigator.hardwareConcurrency <= 2 || navigator.deviceMemory <= 4;
    
    // Otimizado para evitar lentidão em mobile: reduz partículas significativamente
    var PARTICLE_COUNT  = isMobile 
        ? (isLowEndDevice ? 20 : 30)  // Low-end: 20, Standard mobile: 30
        : (window.innerWidth <= 1200 ? 45 : 60);  // Desktop: 45-60

    /* ── State ───────────────────────────────────── */
    var currentScene    = 0;
    var sceneStartTime  = 0;
    var progressRaf     = null;
    var dismissed       = false;
    var canvasRaf       = null;
    var isAudioActive   = false;
    var audioCtx        = null;

    /* Touch Gesture State */
    var touchStartY     = 0;
    var touchCurrentY   = 0;
    var isSwiping       = false;

    /* ── DOM Elements ────────────────────────────── */
    var overlay         = document.getElementById('intro-overlay');
    var canvas          = document.getElementById('intro-canvas');
    var skipBtn         = document.getElementById('intro-skip');
    var enterBtn        = document.getElementById('intro-enter-btn');
    var soundToggleBtn  = document.getElementById('intro-sound-toggle');
    var tapPrev         = document.getElementById('story-tap-prev');
    var tapNext         = document.getElementById('story-tap-next');
    var swipeArea       = document.getElementById('intro-swipe-area');

    if (!overlay) return; // Guard

    /* ── Audio Engine (Web Audio API Synthesizer) ── */
    function initAudio() {
        if (!audioCtx) {
            var AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) audioCtx = new AudioContext();
        }
    }

    function playSoundEffect(type) {
        if (!isAudioActive || !audioCtx) return;
        try {
            if (audioCtx.state === 'suspended') audioCtx.resume();
            
            var osc = audioCtx.createOscillator();
            var gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);

            var now = audioCtx.currentTime;

            if (type === 'tap') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(440, now);
                osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);
                gain.gain.setValueAtTime(0.15, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
                osc.start(now);
                osc.stop(now + 0.12);
            } else if (type === 'dismiss') {
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(220, now);
                osc.frequency.exponentialRampToValueAtTime(880, now + 0.35);
                gain.gain.setValueAtTime(0.2, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
                osc.start(now);
                osc.stop(now + 0.35);
            }
        } catch (e) {
            // Audio context fallback
        }
    }

    function toggleAudio() {
        initAudio();
        isAudioActive = !isAudioActive;
        var soundOffIcon = soundToggleBtn ? soundToggleBtn.querySelector('.sound-off') : null;
        var soundOnIcon = soundToggleBtn ? soundToggleBtn.querySelector('.sound-on') : null;

        if (soundOffIcon && soundOnIcon) {
            if (isAudioActive) {
                soundOffIcon.style.display = 'none';
                soundOnIcon.style.display = 'block';
                playSoundEffect('tap');
            } else {
                soundOffIcon.style.display = 'block';
                soundOnIcon.style.display = 'none';
            }
        }
    }

    /* ── Canvas Particle & Light System ─────────── */
    var ctx = canvas ? canvas.getContext('2d') : null;
    var particles = [];

    function resizeCanvas() {
        if (!canvas) return;
        var rect = canvas.getBoundingClientRect();
        canvas.width = (rect.width || window.innerWidth) * (window.devicePixelRatio || 1);
        canvas.height = (rect.height || window.innerHeight) * (window.devicePixelRatio || 1);
        if (ctx) ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
    }

    function rand(min, max) { return Math.random() * (max - min) + min; }

    function createParticle(x, y, interactive) {
        var width = canvas.width / (window.devicePixelRatio || 1);
        var height = canvas.height / (window.devicePixelRatio || 1);
        return {
            x: x !== undefined ? x : rand(0, width),
            y: y !== undefined ? y : rand(height * 0.2, height + 40),
            size: rand(2, interactive ? 8 : 5),
            speedY: interactive ? rand(-3, 3) : rand(0.5, 2.2),
            speedX: interactive ? rand(-3, 3) : rand(-0.4, 0.4),
            opacity: rand(0.3, interactive ? 0.95 : 0.8),
            hue: rand(200, 240), // Vibrant blue/cyan range
            interactive: !!interactive,
            life: interactive ? 1.0 : rand(0.4, 1.0)
        };
    }

    function initParticles() {
        particles = [];
        for (var i = 0; i < PARTICLE_COUNT; i++) {
            particles.push(createParticle());
        }
    }

    function drawParticles() {
        if (!ctx || !canvas) return;
        var width = canvas.width / (window.devicePixelRatio || 1);
        var height = canvas.height / (window.devicePixelRatio || 1);

        ctx.clearRect(0, 0, width, height);

        // Otimizado: usar cache para gradientes radiais (evita recalcular por partícula)
        var gradientCache = {};

        for (var i = 0; i < particles.length; i++) {
            var p = particles[i];
            p.x += p.speedX;
            p.y -= p.speedY; // Rises upward

            if (p.interactive) {
                p.opacity -= 0.025;  // Um pouco mais rápido no fade
            } else {
                p.opacity -= 0.0018;  // Otimizado para melhor visual
            }

            if (p.y < -20 || p.opacity <= 0 || p.x < -20 || p.x > width + 20) {
                particles[i] = createParticle();
                continue;
            }

            // Glow aura — otimizado com cache
            var cacheKey = p.hue + ':' + p.size;
            if (!gradientCache[cacheKey]) {
                var grad = ctx.createRadialGradient(0, 0, 0, 0, 0, p.size * 3);
                grad.addColorStop(0, 'hsla(' + p.hue + ', 90%, 75%, 1)');
                grad.addColorStop(0.5, 'hsla(' + p.hue + ', 80%, 60%, 0.4)');
                grad.addColorStop(1, 'hsla(' + p.hue + ', 70%, 50%, 0)');
                gradientCache[cacheKey] = grad;
            }

            ctx.save();
            ctx.globalAlpha = p.opacity;
            ctx.translate(p.x, p.y);
            
            ctx.beginPath();
            ctx.arc(0, 0, p.size * 3, 0, Math.PI * 2);
            ctx.fillStyle = gradientCache[cacheKey];
            ctx.fill();

            // Core dot
            ctx.beginPath();
            ctx.arc(0, 0, p.size * 0.7, 0, Math.PI * 2);
            ctx.fillStyle = 'hsla(' + p.hue + ', 100%, 95%, ' + Math.min(p.opacity + 0.2, 1) + ')';
            ctx.fill();
            
            ctx.restore();
        }

        canvasRaf = requestAnimationFrame(drawParticles);
    }

    function addTouchSpark(x, y) {
        if (!canvas) return;
        var rect = canvas.getBoundingClientRect();
        var localX = x - rect.left;
        var localY = y - rect.top;
        for (var i = 0; i < 6; i++) {
            particles.push(createParticle(localX, localY, true));
        }
    }

    /* ── Story Progress & Scene Navigation ────────── */
    function updateProgressBars() {
        if (dismissed) return;
        var now = performance.now();
        var elapsed = now - sceneStartTime;
        var progress = Math.min((elapsed / SCENE_DURATION) * 100, 100);

        for (var i = 0; i < TOTAL_SCENES; i++) {
            var fill = document.getElementById('story-fill-' + i);
            if (!fill) continue;
            if (i < currentScene) {
                fill.style.width = '100%';
            } else if (i === currentScene) {
                fill.style.width = progress + '%';
            } else {
                fill.style.width = '0%';
            }
        }

        if (progress >= 100) {
            if (currentScene < TOTAL_SCENES - 1) {
                goToScene(currentScene + 1);
            } else {
                dismiss(); // Auto dismiss at end of last scene
                return;
            }
        } else {
            progressRaf = requestAnimationFrame(updateProgressBars);
        }
    }

    function goToScene(index) {
        if (index < 0 || index >= TOTAL_SCENES || dismissed) return;
        
        cancelAnimationFrame(progressRaf);

        var prevSceneEl = document.getElementById('story-scene-' + currentScene);
        if (prevSceneEl) prevSceneEl.classList.remove('active');

        currentScene = index;

        var nextSceneEl = document.getElementById('story-scene-' + currentScene);
        if (nextSceneEl) nextSceneEl.classList.add('active');

        sceneStartTime = performance.now();
        playSoundEffect('tap');
        updateProgressBars();
    }

    /* ── Touch Swipe Up & Interaction Listeners ───── */
    function handleTouchStart(e) {
        if (e.touches && e.touches.length > 0) {
            touchStartY = e.touches[0].clientY;
            touchCurrentY = touchStartY;
            isSwiping = true;
            addTouchSpark(e.touches[0].clientX, e.touches[0].clientY);
        }
    }

    function handleTouchMove(e) {
        if (!isSwiping || !e.touches || e.touches.length === 0) return;
        touchCurrentY = e.touches[0].clientY;
        var deltaY = touchStartY - touchCurrentY;

        if (deltaY > 10) {
            // Drag visual feedback: slight slide up
            overlay.style.transform = 'translateY(-' + Math.min(deltaY * 0.4, 80) + 'px)';
        }
    }

    function handleTouchEnd() {
        if (!isSwiping) return;
        isSwiping = false;
        var deltaY = touchStartY - touchCurrentY;

        if (deltaY > 60) {
            // Swipe up threshold reached -> Dismiss!
            dismiss();
        } else {
            // Reset position
            overlay.style.transform = '';
        }
    }

    /* ── Dismiss & Exit Transition ────────────────── */
    function dismiss() {
        if (dismissed) return;
        dismissed = true;

        // Avisa o resto da página (revelação do hero) que a intro está saindo,
        // para a cascata de entrada do hero começar já, por baixo da splash.
        document.dispatchEvent(new CustomEvent('veneza:intro-dismissed'));

        playSoundEffect('dismiss');
        cancelAnimationFrame(progressRaf);
        cancelAnimationFrame(canvasRaf);

        overlay.classList.add('hide');
        document.body.classList.add('intro-done');

        var cleanup = function () {
            overlay.style.display = 'none';
            document.body.style.overflow = '';
        };

        overlay.addEventListener('transitionend', cleanup, { once: true });
        setTimeout(cleanup, 800); // Safety fallback
    }

    /* ── Init & Setup ────────────────────────────── */
    function init() {
        document.body.style.overflow = 'hidden';

        resizeCanvas();
        window.addEventListener('resize', function () {
            resizeCanvas();
            initParticles();
        });

        initParticles();
        drawParticles();

        sceneStartTime = performance.now();
        updateProgressBars();

        // Control button events
        var skipDesktopBtn = document.getElementById('intro-skip-desktop');
        if (skipDesktopBtn) skipDesktopBtn.addEventListener('click', dismiss);
        if (skipBtn) skipBtn.addEventListener('click', dismiss);
        if (enterBtn) enterBtn.addEventListener('click', dismiss);
        if (soundToggleBtn) soundToggleBtn.addEventListener('click', toggleAudio);

        // Auto dismiss timer for desktop fallback
        if (window.innerWidth > 768) {
            setTimeout(dismiss, 3800);
        }

        // Story tap targets
        if (tapPrev) tapPrev.addEventListener('click', function () { goToScene(currentScene - 1); });
        if (tapNext) tapNext.addEventListener('click', function () { goToScene(currentScene + 1); });
        if (swipeArea) swipeArea.addEventListener('click', dismiss);

        // Touch swipe up listeners
        overlay.addEventListener('touchstart', handleTouchStart, { passive: true });
        overlay.addEventListener('touchmove', handleTouchMove, { passive: true });
        overlay.addEventListener('touchend', handleTouchEnd, { passive: true });

        // Keyboard navigation (Left/Right arrows, Space/Enter to dismiss)
        document.addEventListener('keydown', function (e) {
            if (dismissed) return;
            if (e.key === 'ArrowRight') goToScene(currentScene + 1);
            if (e.key === 'ArrowLeft') goToScene(currentScene - 1);
            if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') dismiss();
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

