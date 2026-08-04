(function () {
    'use strict';

    /* ── Config ──────────────────────────────────── */
    var DURATION       = 3800;   // ms before auto-dismiss
    var PARTICLE_COUNT = window.innerWidth <= 768 ? 25 : 55; // menos partículas no mobile

    /* ── State ───────────────────────────────────── */
    var dismissed = false;
    var raf;

    /* ── DOM ─────────────────────────────────────── */
    var overlay  = document.getElementById('intro-overlay');
    var canvas   = document.getElementById('intro-canvas');
    var skipBtn  = document.getElementById('intro-skip');

    if (!overlay) return; // guard

    /* ── Particle system (canvas) ────────────────── */
    var ctx    = canvas.getContext('2d');
    var particles = [];

    function resize() {
        canvas.width  = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    function rand(min, max) { return Math.random() * (max - min) + min; }

    function createParticle() {
        var size = rand(2, 7);
        return {
            x:     rand(0, canvas.width),
            y:     rand(canvas.height * 0.3, canvas.height + 60),
            size:  size,
            baseSize: size,
            speedY: rand(0.4, 1.6),   // rises upward (negative Y)
            speedX: rand(-0.3, 0.3),
            opacity: rand(0.3, 0.9),
            hue:   rand(200, 230),     // blue palette
            wobble: rand(0, Math.PI * 2),
            wobbleSpeed: rand(0.01, 0.025),
        };
    }

    function initParticles() {
        particles = [];
        for (var i = 0; i < PARTICLE_COUNT; i++) {
            var p = createParticle();
            p.y = rand(0, canvas.height); // spread on first frame
            particles.push(p);
        }
    }

    function drawParticles() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (var i = 0; i < particles.length; i++) {
            var p = particles[i];
            p.wobble += p.wobbleSpeed;
            p.x      += Math.sin(p.wobble) * 0.5 + p.speedX;
            p.y      -= p.speedY;             // antigravity: float UP
            p.opacity -= 0.0008;

            if (p.y < -20 || p.opacity <= 0) {
                particles[i] = createParticle(); // respawn at bottom
                continue;
            }

            // glow circle
            var gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2.5);
            gradient.addColorStop(0,   'hsla(' + p.hue + ',85%,70%,' + p.opacity + ')');
            gradient.addColorStop(0.5, 'hsla(' + p.hue + ',75%,60%,' + (p.opacity * 0.4) + ')');
            gradient.addColorStop(1,   'hsla(' + p.hue + ',70%,50%,0)');

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * 2.5, 0, Math.PI * 2);
            ctx.fillStyle = gradient;
            ctx.fill();

            // core dot
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * 0.6, 0, Math.PI * 2);
            ctx.fillStyle = 'hsla(' + p.hue + ',90%,90%,' + Math.min(p.opacity + 0.3, 1) + ')';
            ctx.fill();
        }
    }

    function loop() {
        drawParticles();
        raf = requestAnimationFrame(loop);
    }

    /* ── Floating rings (DOM) ────────────────────── */
    function spawnRings() {
        var sizes  = [80, 130, 200, 290, 400];
        var delays = [0,  0.8, 1.6, 2.4, 3.2];
        var durs   = [6,  8,   7,   9,   10];

        for (var i = 0; i < sizes.length; i++) {
            (function(size, delay, dur) {
                var ring = document.createElement('div');
                ring.className = 'intro-ring';
                ring.style.cssText = [
                    'width:'  + size + 'px',
                    'height:' + size + 'px',
                    'bottom:' + rand(-30, 20) + 'px',
                    'left:'   + rand(5, 85)   + 'vw',
                    'animation-duration:'  + dur   + 's',
                    'animation-delay:'     + delay + 's',
                ].join(';');
                overlay.appendChild(ring);
            })(sizes[i], delays[i], durs[i]);
        }
    }

    /* ── Dismiss logic ───────────────────────────── */
    function dismiss() {
        if (dismissed) return;
        dismissed = true;
        cancelAnimationFrame(raf);
        overlay.classList.add('hide');
        overlay.addEventListener('animationend', function () {
            overlay.style.display = 'none';
            document.body.style.overflow = '';
        }, { once: true });
    }

    /* ── Init ────────────────────────────────────── */
    function init() {
        document.body.style.overflow = 'hidden'; // freeze scroll during intro

        resize();
        window.addEventListener('resize', function() {
            resize();
            initParticles();
        });

        initParticles();
        spawnRings();
        loop();

        // skip button
        if (skipBtn) skipBtn.addEventListener('click', dismiss);

        // keyboard: Enter or Space
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') dismiss();
        });

        // auto-dismiss
        setTimeout(dismiss, DURATION);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
