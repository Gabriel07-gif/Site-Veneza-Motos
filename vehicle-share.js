(() => {
  const buttons = document.querySelectorAll(".js-share-vehicle");
  if (!buttons.length) return;

  const getShareData = () => {
    const title = document.querySelector(".detail-card h2")?.textContent?.trim() || document.title;
    const price = document.querySelector(".detail-card .fs-4")?.textContent?.trim() || "";
    const canonical = document.querySelector('link[rel="canonical"]')?.href || window.location.href;
    return {
      title: "Veneza Motos e Veículos",
      text: price ? `Olha essa moto na Veneza Motos: ${title} - ${price}` : `Olha essa moto na Veneza Motos: ${title}`,
      url: canonical,
    };
  };

  const showFeedback = (btn, message) => {
    const original = btn.innerHTML;
    const iconMarkup = btn.querySelector("svg")
      ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`
      : `<i data-feather="check" class="text-light"></i>`;
    const labelEl = btn.querySelector("span");
    if (labelEl) {
      const icon = btn.querySelector("svg, i");
      if (icon) icon.outerHTML = iconMarkup;
      labelEl.textContent = message;
    } else {
      btn.innerHTML = `<i data-feather="check" class="text-light"></i> ${message}`;
    }
    if (typeof feather !== "undefined" && typeof feather.replace === "function") {
      feather.replace();
    }
    setTimeout(() => {
      btn.innerHTML = original;
      if (typeof feather !== "undefined" && typeof feather.replace === "function") {
        feather.replace();
      }
    }, 2000);
  };

  const copyFallback = async (btn, data) => {
    const shareText = `${data.text} ${data.url}`;
    try {
      await navigator.clipboard.writeText(shareText);
      showFeedback(btn, "Copiado!");
    } catch (e) {
      window.prompt("Copie o link para compartilhar:", shareText);
    }
  };

  buttons.forEach((btn) => {
    btn.addEventListener("click", async () => {
      const data = getShareData();
      if (navigator.share) {
        try {
          await navigator.share(data);
        } catch (e) {
          // usuário cancelou o compartilhamento; nada a fazer
        }
      } else {
        copyFallback(btn, data);
      }
    });
  });
})();
