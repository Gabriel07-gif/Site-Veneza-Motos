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
      <img class="vehicle-fs-img" alt="Foto do veículo em tela cheia" />
    </div>
  `;
  document.body.appendChild(overlay);

  const overlayImg = overlay.querySelector(".vehicle-fs-img");
  const closeBtn = overlay.querySelector(".vehicle-fs-close");

  const exitFullscreen = () => {
    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
  };

  const closeOverlay = () => {
    overlay.classList.remove("open");
    exitFullscreen();
  };

  const openOverlay = (src, alt) => {
    overlayImg.src = src;
    overlayImg.alt = alt || "Foto do veículo em tela cheia";
    overlay.classList.add("open");

    if (overlay.requestFullscreen) {
      overlay.requestFullscreen().catch(() => {});
    }
  };

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) closeOverlay();
  });

  closeBtn.addEventListener("click", closeOverlay);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeOverlay();
  });

  carousels.forEach((carousel) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "vehicle-fs-btn";
    btn.setAttribute("aria-label", "Ver foto em tela cheia");
    btn.innerHTML = `<i data-feather="maximize-2"></i><span>Tela cheia</span>`;

    btn.addEventListener("click", () => {
      const activeImg =
        carousel.querySelector(".carousel-item.active img") ||
        carousel.querySelector(".carousel-item img");
      if (!activeImg) return;
      openOverlay(activeImg.currentSrc || activeImg.src, activeImg.alt);
    });

    carousel.appendChild(btn);
  });

  if (typeof feather !== "undefined" && typeof feather.replace === "function") {
    feather.replace();
  }
})();
