(() => {
  const carousels = document.querySelectorAll(".detail-carousel");
  if (!carousels.length) return;

  const overlay = document.createElement("div");
  overlay.className = "vehicle-fs-overlay";
  overlay.innerHTML = `
    <div class="vehicle-fs-content">
      <button type="button" class="vehicle-fs-close" aria-label="Fechar">
        <i data-feather="x"></i>
      </button>
      <button type="button" class="vehicle-fs-nav vehicle-fs-prev" aria-label="Imagem anterior">
        <i data-feather="chevron-left"></i>
      </button>
      <img class="vehicle-fs-img" alt="Foto do veiculo em tela cheia" />
      <button type="button" class="vehicle-fs-nav vehicle-fs-next" aria-label="Proxima imagem">
        <i data-feather="chevron-right"></i>
      </button>
    </div>
  `;
  document.body.appendChild(overlay);

  const overlayImg = overlay.querySelector(".vehicle-fs-img");
  const closeBtn = overlay.querySelector(".vehicle-fs-close");
  const prevBtn = overlay.querySelector(".vehicle-fs-prev");
  const nextBtn = overlay.querySelector(".vehicle-fs-next");
  const defaultAlt = "Foto do veiculo em tela cheia";
  let currentCarousel = null;
  let currentImages = [];
  let currentIndex = 0;

  const exitFullscreen = () => {
    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
  };

  const closeOverlay = () => {
    overlay.classList.remove("open");
    currentCarousel = null;
    currentImages = [];
    currentIndex = 0;
    exitFullscreen();
  };

  const syncCarousel = (index) => {
    if (!currentCarousel || !window.bootstrap || !window.bootstrap.Carousel) return;
    const instance = window.bootstrap.Carousel.getOrCreateInstance(currentCarousel);
    if (instance && typeof instance.to === "function") {
      instance.to(index);
    }
  };

  const showImageAt = (index) => {
    if (!currentImages.length) return;
    const total = currentImages.length;
    currentIndex = ((index % total) + total) % total;
    const { src, alt } = currentImages[currentIndex];
    overlayImg.src = src;
    overlayImg.alt = alt || defaultAlt;
    syncCarousel(currentIndex);
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

    showImageAt(activeIndex >= 0 ? activeIndex : 0);
    overlay.classList.add("open");

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

  carousels.forEach((carousel) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "vehicle-fs-btn";
    btn.setAttribute("aria-label", "Ver foto em tela cheia");
    btn.innerHTML = `<i data-feather="maximize-2"></i><span>Tela cheia</span>`;

    btn.addEventListener("click", () => {
      openOverlay(carousel);
    });

    carousel.appendChild(btn);
  });

  if (typeof feather !== "undefined" && typeof feather.replace === "function") {
    feather.replace();
  }
})();
