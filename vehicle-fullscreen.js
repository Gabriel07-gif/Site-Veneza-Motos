(() => {
  const carousels = document.querySelectorAll(".detail-carousel");
  if (!carousels.length) return;

  // Garante que o carrossel nunca gire sozinho: cria/obtém a instância do
  // Bootstrap explicitamente com autoplay desligado e pausa por segurança,
  // independente de como o data-bs-ride foi interpretado.
  carousels.forEach((carouselEl) => {
    if (window.bootstrap && window.bootstrap.Carousel) {
      const instance = window.bootstrap.Carousel.getOrCreateInstance(carouselEl, {
        interval: false,
        ride: false,
        pause: "hover",
      });
      instance.pause();
    }
  });

  const overlay = document.createElement("div");
  overlay.className = "vehicle-fs-overlay";
  overlay.setAttribute("aria-hidden", "true");
  overlay.innerHTML = `
    <div class="vehicle-fs-content" role="dialog" aria-modal="true" aria-label="Foto do veiculo em tela cheia">
      <button type="button" class="vehicle-fs-close" aria-label="Fechar">
        <i data-feather="x"></i>
      </button>
      <button type="button" class="vehicle-fs-nav vehicle-fs-prev" aria-label="Imagem anterior">
        <i data-feather="chevron-left"></i>
      </button>
      <img class="vehicle-fs-img" alt="Foto do veiculo em tela cheia" decoding="async" />
      <button type="button" class="vehicle-fs-nav vehicle-fs-next" aria-label="Proxima imagem">
        <i data-feather="chevron-right"></i>
      </button>
      <div class="vehicle-fs-count" aria-live="polite"></div>
    </div>
  `;
  document.body.appendChild(overlay);

  const overlayImg = overlay.querySelector(".vehicle-fs-img");
  const closeBtn = overlay.querySelector(".vehicle-fs-close");
  const prevBtn = overlay.querySelector(".vehicle-fs-prev");
  const nextBtn = overlay.querySelector(".vehicle-fs-next");
  const countEl = overlay.querySelector(".vehicle-fs-count");
  const defaultAlt = "Foto do veiculo em tela cheia";
  let currentCarousel = null;
  let currentImages = [];
  let currentIndex = 0;
  let openIndexAtStart = 0;

  /* ── Preload cache: fetch + decode images ahead of time so navigation feels instant ── */
  const imageCache = new Map();
  const preload = (src) => {
    if (!src || imageCache.has(src)) return;
    const img = new Image();
    img.decoding = "async";
    img.src = src;
    imageCache.set(src, img);
  };
  const preloadNeighbors = (index) => {
    const total = currentImages.length;
    if (!total) return;
    preload(currentImages[index]?.src);
    preload(currentImages[(index + 1) % total]?.src);
    preload(currentImages[(index - 1 + total) % total]?.src);
  };
  const preloadAllIdle = () => {
    const run = () => currentImages.forEach((item) => preload(item.src));
    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(run, { timeout: 2000 });
    } else {
      setTimeout(run, 300);
    }
  };

  const exitFullscreen = () => {
    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
  };

  /* Sync the underlying Bootstrap carousel only once, when the overlay closes —
     avoids replaying a slide transition on it for every image change while hidden. */
  const syncCarouselOnce = () => {
    if (!currentCarousel || !window.bootstrap || !window.bootstrap.Carousel) return;
    const instance = window.bootstrap.Carousel.getOrCreateInstance(currentCarousel);
    if (instance && typeof instance.to === "function") {
      instance.to(currentIndex);
    }
  };

  const closeOverlay = () => {
    overlay.classList.remove("open");
    overlay.setAttribute("aria-hidden", "true");
    syncCarouselOnce();
    currentCarousel = null;
    currentImages = [];
    currentIndex = 0;
    exitFullscreen();
  };

  const updateCount = () => {
    countEl.textContent = currentImages.length > 1 ? `${currentIndex + 1} / ${currentImages.length}` : "";
  };

  const FADE_MS = 110;

  const showImageAt = (index, instant = false) => {
    if (!currentImages.length) return;
    const total = currentImages.length;
    currentIndex = ((index % total) + total) % total;
    const { src, alt } = currentImages[currentIndex];
    preloadNeighbors(currentIndex);

    const apply = () => {
      overlayImg.src = src;
      overlayImg.alt = alt || defaultAlt;
      updateCount();
      requestAnimationFrame(() => overlayImg.classList.remove("is-fading"));
    };

    if (instant) {
      apply();
      return;
    }

    overlayImg.classList.add("is-fading");
    window.setTimeout(apply, FADE_MS);
  };

  const openOverlay = (carouselEl) => {
    const imgs = Array.from(carouselEl.querySelectorAll(".carousel-item img"));
    if (!imgs.length) return;

    currentCarousel = carouselEl;
    currentImages = imgs.map((img) => ({
      src: img.currentSrc || img.src,
      alt: img.alt || defaultAlt,
    }));
    const activeIndex = imgs.findIndex((img) =>
      img.closest(".carousel-item")?.classList.contains("active")
    );

    openIndexAtStart = activeIndex >= 0 ? activeIndex : 0;
    showImageAt(openIndexAtStart, true);
    overlay.classList.add("open");
    overlay.setAttribute("aria-hidden", "false");
    preloadAllIdle();

    if (overlay.requestFullscreen) {
      overlay.requestFullscreen().catch(() => {});
    }
  };

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) closeOverlay();
  });

  closeBtn.addEventListener("click", closeOverlay);
  prevBtn.addEventListener("click", () => showImageAt(currentIndex - 1));
  nextBtn.addEventListener("click", () => showImageAt(currentIndex + 1));

  document.addEventListener("keydown", (event) => {
    if (!overlay.classList.contains("open")) return;
    if (event.key === "Escape") closeOverlay();
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      showImageAt(currentIndex - 1);
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      showImageAt(currentIndex + 1);
    }
  });

  /* ── Swipe navigation (touch) ── */
  let touchStartX = 0;
  let touchStartY = 0;
  let touchActive = false;

  overlay.addEventListener(
    "touchstart",
    (event) => {
      if (event.touches.length !== 1) return;
      touchActive = true;
      touchStartX = event.touches[0].clientX;
      touchStartY = event.touches[0].clientY;
    },
    { passive: true }
  );

  overlay.addEventListener(
    "touchend",
    (event) => {
      if (!touchActive) return;
      touchActive = false;
      const touch = event.changedTouches[0];
      const dx = touch.clientX - touchStartX;
      const dy = touch.clientY - touchStartY;
      const SWIPE_THRESHOLD = 40;
      if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
        if (dx < 0) showImageAt(currentIndex + 1);
        else showImageAt(currentIndex - 1);
      }
    },
    { passive: true }
  );

  carousels.forEach((carousel) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "vehicle-fs-btn";
    btn.setAttribute("aria-label", "Ver foto em tela cheia");
    btn.innerHTML = `<i data-feather="maximize-2"></i><span>Tela cheia</span>`;

    // Assim que o usuário demonstra intenção (hover/foco), já começamos a
    // pré-carregar as fotos para a abertura em tela cheia ser instantânea.
    const warmUp = () => {
      const imgs = Array.from(carousel.querySelectorAll(".carousel-item img"));
      imgs.forEach((img) => preload(img.currentSrc || img.src));
    };
    btn.addEventListener("pointerenter", warmUp, { once: true });
    btn.addEventListener("focus", warmUp, { once: true });

    btn.addEventListener("click", () => {
      openOverlay(carousel);
    });

    carousel.appendChild(btn);
  });

  if (typeof feather !== "undefined" && typeof feather.replace === "function") {
    feather.replace();
  }
})();
