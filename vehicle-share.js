(() => {
  const btn = document.getElementById("btn-share-vehicle");
  if (!btn) return;

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

  const showFeedback = (message) => {
    const original = btn.innerHTML;
    btn.innerHTML = `<i data-feather="check" class="text-light"></i> ${message}`;
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

  const copyFallback = async (data) => {
    const shareText = `${data.text} ${data.url}`;
    try {
      await navigator.clipboard.writeText(shareText);
      showFeedback("Link copiado!");
    } catch (e) {
      window.prompt("Copie o link para compartilhar:", shareText);
    }
  };

  btn.addEventListener("click", async () => {
    const data = getShareData();
    if (navigator.share) {
      try {
        await navigator.share(data);
      } catch (e) {
        // usuário cancelou o compartilhamento; nada a fazer
      }
    } else {
      copyFallback(data);
    }
  });
})();
