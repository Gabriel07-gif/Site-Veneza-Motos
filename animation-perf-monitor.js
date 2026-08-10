/* ============================================================
   ANIMATION PERFORMANCE MONITOR
   Detecta devices de baixo desempenho e otimiza animações em tempo real
   para evitar lentidão/travamentos em celulares antigos
   ============================================================ */

(function() {
    'use strict';

    var config = {
        maxFrameTime: 33,  // 33ms = ~30fps threshold
        testDuration: 1000,  // 1s de teste
        minFramesForTest: 20,
        disableAnimationsClass: 'low-perf-device'
    };

    var metrics = {
        frameCount: 0,
        startTime: performance.now(),
        lastFrameTime: performance.now(),
        droppedFrames: 0,
        fps: 60,
        isLowPerf: false
    };

    function performanceTest() {
        var now = performance.now();
        var frameTime = now - metrics.lastFrameTime;
        metrics.lastFrameTime = now;
        metrics.frameCount++;

        if (frameTime > config.maxFrameTime) {
            metrics.droppedFrames++;
        }

        var elapsed = now - metrics.startTime;
        if (elapsed >= config.testDuration && metrics.frameCount >= config.minFramesForTest) {
            var droppedPercent = (metrics.droppedFrames / metrics.frameCount) * 100;
            metrics.fps = (metrics.frameCount / (elapsed / 1000)).toFixed(1);
            
            // Se mais de 15% de frames foram dropados ou FPS < 45, considera low performance
            if (droppedPercent > 15 || metrics.fps < 45) {
                metrics.isLowPerf = true;
                applyLowPerfOptimizations();
            }
            
            return; // Teste finalizado
        }

        requestAnimationFrame(performanceTest);
    }

    function applyLowPerfOptimizations() {
        // Adiciona classe ao documentElement
        document.documentElement.classList.add(config.disableAnimationsClass);

        // Desabilita animações pesadas via CSS
        disableHeavyAnimations();
        
        // Log para debug
        console.warn(
            '[Animation Perf] Low performance detected. FPS: ' + metrics.fps + 
            ', Dropped frames: ' + metrics.droppedFrames + '/' + metrics.frameCount +
            '. Reducing animation complexity.'
        );
    }

    function disableHeavyAnimations() {
        // Injeta CSS para desabilitar animações em elementos específicos
        var styleEl = document.createElement('style');
        styleEl.textContent = `
            html.${config.disableAnimationsClass} .chip-item,
            html.${config.disableAnimationsClass} .bike-shadow,
            html.${config.disableAnimationsClass} .bike-light-beam,
            html.${config.disableAnimationsClass} .hero-bike-frame::before,
            html.${config.disableAnimationsClass} .intro-916-wrapper::before,
            html.${config.disableAnimationsClass} .story-progress-fill::after,
            html.${config.disableAnimationsClass} .cta-logo-glow::before,
            html.${config.disableAnimationsClass} .intro-primary-btn::after,
            html.${config.disableAnimationsClass} .welcome-banner-img,
            html.${config.disableAnimationsClass} .scene-main-title {
                animation: none !important;
            }
            
            html.${config.disableAnimationsClass} .story-scene {
                transition: opacity 0.15s linear !important;
            }
            
            html.${config.disableAnimationsClass} .scene-main-title,
            html.${config.disableAnimationsClass} .scene-subtitle,
            html.${config.disableAnimationsClass} .scene-desc,
            html.${config.disableAnimationsClass} .welcome-banner-frame {
                transition: opacity 0.15s linear !important;
            }
        `;
        document.head.appendChild(styleEl);
    }

    // Iniciar teste apenas em mobile
    function init() {
        if (window.innerWidth <= 768) {
            // Aguarda um frame antes de começar o teste
            requestAnimationFrame(function() {
                requestAnimationFrame(performanceTest);
            });
        }
    }

    // Começar teste quando DOM estiver pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Expor métricas para debug
    window.__animPerfMetrics = metrics;
})();
