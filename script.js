/* ===== Contador animado (Stats Bar) ===== */
function animateCounters() {
    const counters = document.querySelectorAll(".stat-number[data-target]");
    if (!counters.length) return;

    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting || entry.target.dataset.counted) return;
                entry.target.dataset.counted = "true";

                const target = parseInt(entry.target.dataset.target, 10);
                const suffix = entry.target.dataset.suffix || "";
                const duration = 1600;
                const startTime = performance.now();

                const update = (now) => {
                    const elapsed = now - startTime;
                    const progress = Math.min(elapsed / duration, 1);
                    const ease = 1 - Math.pow(1 - progress, 3);
                    const current = Math.round(target * ease);
                    entry.target.textContent = current.toLocaleString("pt-BR") + suffix;
                    if (progress < 1) requestAnimationFrame(update);
                };
                requestAnimationFrame(update);
            });
        },
        { threshold: 0.35 }
    );

    counters.forEach((el) => observer.observe(el));
}

/* ===== Scroll Reveal ===== */
function initScrollReveal() {
    const targets = document.querySelectorAll(
        ".service-card, .vehicle-card, .about-highlights > div, .stat-item, .about-box, .contact-form, .contact-info, .brand-pill"
    );

    targets.forEach((el, i) => {
        if (!el.classList.contains("reveal")) {
            el.classList.add("reveal");
            const delay = (i % 4) * 0.08;
            if (delay > 0) el.style.transitionDelay = delay + "s";
        }
    });

    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add("revealed");
                    observer.unobserve(entry.target);
                }
            });
        },
        { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    );

    document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));
}

/* ===== Mobile Filter Toggle ===== */
function initFilterToggle() {
    const toggleBtn = document.getElementById("filter-toggle-btn");
    const filterPanel = document.getElementById("catalog-filters-panel");
    const countBadge = document.getElementById("filter-count-badge");
    if (!toggleBtn || !filterPanel) return;

    const isSmall = () => window.innerWidth <= 900;

    const updateBadge = () => {
        if (!countBadge) return;
        const checked = filterPanel.querySelectorAll("input[type='checkbox']:checked").length;
        if (checked > 0) {
            countBadge.textContent = checked;
            countBadge.classList.add("visible");
        } else {
            countBadge.classList.remove("visible");
        }
    };

    const setCollapsed = (collapsed) => {
        if (collapsed) {
            filterPanel.classList.add("collapsed");
            toggleBtn.setAttribute("aria-expanded", "false");
        } else {
            filterPanel.classList.remove("collapsed");
            toggleBtn.setAttribute("aria-expanded", "true");
        }
    };

    // Começa fechado em mobile
    if (isSmall()) setCollapsed(true);

    toggleBtn.addEventListener("click", () => {
        const isCollapsed = filterPanel.classList.contains("collapsed");
        setCollapsed(!isCollapsed);
    });

    // Atualiza badge ao alterar filtros
    filterPanel.querySelectorAll("input[type='checkbox']").forEach((cb) => {
        cb.addEventListener("change", updateBadge);
    });

    // Ao girar/redimensionar, abre em desktop
    window.addEventListener(
        "resize",
        () => {
            if (!isSmall()) setCollapsed(false);
        },
        { passive: true }
    );
}

function scrollToSection(id) {
    const el = document.getElementById(id);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 80;
    window.scrollTo({ top, behavior: "smooth" });
}

function filterVehicles(type) {
    const cards = document.querySelectorAll(".vehicle-card");
    const buttons = document.querySelectorAll(".filter-button");

    buttons.forEach((btn) => {
        if (btn.dataset.filter === type) {
            btn.classList.add("active");
        } else {
            btn.classList.remove("active");
        }
    });

    cards.forEach((card) => {
        if (type === "all" || card.dataset.type === type) {
            card.style.display = "flex";
        } else {
            card.style.display = "none";
        }
    });
}

function applyVehicleImages() {
    document.querySelectorAll(".vehicle-card").forEach((card) => {
        const imgEl = card.querySelector(".vehicle-image");
        if (!imgEl) return;

        const imgPath = card.dataset.image || imgEl.dataset.image;
        if (imgPath) {
            imgEl.style.backgroundImage = `url('${imgPath}')`;
            return;
        }

        const fallbackClass = card.dataset.fallbackClass || imgEl.dataset.fallbackClass;
        if (fallbackClass) {
            fallbackClass.split(" ").forEach((cls) => {
                if (cls) imgEl.classList.add(cls);
            });
        }
    });
}

function initVehicleImagePreview() {
    const imageEls = document.querySelectorAll("#estoque .vehicle-image");
    if (!imageEls.length) return;

    const overlay = document.createElement("div");
    overlay.className = "vehicle-preview-overlay";
    overlay.setAttribute("aria-hidden", "true");
    overlay.innerHTML = `
        <div class="vehicle-preview-content" role="dialog" aria-modal="true" aria-label="Foto do veículo">
            <button type="button" class="vehicle-preview-close" aria-label="Fechar foto">
                <i data-feather="x"></i>
            </button>
            <button type="button" class="vehicle-preview-nav vehicle-preview-prev" aria-label="Foto anterior">
                <i data-feather="chevron-left"></i>
            </button>
            <img class="vehicle-preview-img" alt="Foto do veículo" decoding="async" />
            <button type="button" class="vehicle-preview-nav vehicle-preview-next" aria-label="Proxima foto">
                <i data-feather="chevron-right"></i>
            </button>
            <div class="vehicle-preview-count" aria-live="polite"></div>
        </div>
    `;
    document.body.appendChild(overlay);

    const overlayImg = overlay.querySelector(".vehicle-preview-img");
    const closeBtn = overlay.querySelector(".vehicle-preview-close");
    const prevBtn = overlay.querySelector(".vehicle-preview-prev");
    const nextBtn = overlay.querySelector(".vehicle-preview-next");
    const countEl = overlay.querySelector(".vehicle-preview-count");
    const defaultAlt = "Foto do veículo";
    let currentImages = [];
    let currentIndex = 0;

    /* ── Preload cache com limite para evitar vazamento de memória. ── */
    const MAX_CACHE_SIZE = 60;
    const imageCache = new Map();
    const preload = (src) => {
        if (!src || imageCache.has(src)) return;
        if (imageCache.size >= MAX_CACHE_SIZE) {
            imageCache.delete(imageCache.keys().next().value);
        }
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

    const parseSources = (value) =>
        (value || "")
            .split(/[,;|]/)
            .map((item) => item.trim())
            .filter(Boolean);

    const buildImageList = (sources, title) => {
        const baseAlt = title ? `Foto de ${title}` : defaultAlt;
        return sources.map((src, index) => ({
            src,
            alt: sources.length > 1 ? `${baseAlt} - ${index + 1}` : baseAlt,
        }));
    };

    const updateNav = () => {
        const hasMany = currentImages.length > 1;
        prevBtn.style.display = hasMany ? "inline-flex" : "none";
        nextBtn.style.display = hasMany ? "inline-flex" : "none";
        countEl.textContent = hasMany ? `${currentIndex + 1} / ${currentImages.length}` : "";
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
            updateNav();
            requestAnimationFrame(() => overlayImg.classList.remove("is-fading"));
        };

        if (instant) {
            apply();
            return;
        }

        overlayImg.classList.add("is-fading");
        window.setTimeout(apply, FADE_MS);
    };

    const exitFullscreen = () => {
        if (document.fullscreenElement && document.exitFullscreen) {
            document.exitFullscreen().catch(() => {});
        }
    };

    const closeOverlay = () => {
        overlay.classList.remove("open");
        overlay.setAttribute("aria-hidden", "true");
        currentImages = [];
        currentIndex = 0;
        exitFullscreen();
    };

    const openOverlay = (images, startIndex = 0) => {
        if (!images.length) return;
        currentImages = images;
        showImageAt(startIndex, true);
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

    imageEls.forEach((imgEl) => {
        const card = imgEl.closest(".vehicle-card");
        const title = card?.querySelector("h3")?.textContent?.trim() || "";
        const label = title ? `Ver fotos de ${title}` : "Ver fotos do veiculo";
        imgEl.setAttribute("role", "button");
        imgEl.setAttribute("tabindex", "0");
        imgEl.setAttribute("aria-label", label);

        const getSources = () => {
            const raw = imgEl.dataset.images || card?.dataset.images || "";
            let sources = parseSources(raw);
            if (!sources.length) {
                const single = imgEl.dataset.image || card?.dataset.image || "";
                if (single) sources = [single];
            }
            return sources;
        };

        // Ao passar o mouse ou focar a miniatura, já aquecemos o cache de
        // imagens: quando o usuário clicar, a abertura é instantânea.
        const warmUp = () => {
            const sources = getSources();
            sources.forEach(preload);
        };
        imgEl.addEventListener("pointerenter", warmUp, { once: true });
        imgEl.addEventListener("focus", warmUp, { once: true });

        const openFromEl = () => {
            const sources = getSources();
            if (!sources.length) return;
            const images = buildImageList(sources, title);
            openOverlay(images, 0);
        };

        imgEl.addEventListener("click", openFromEl);
        imgEl.addEventListener("keydown", (event) => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                openFromEl();
            }
        });
    });
}

// Adiciona <img> real com alt/ lazy nas capas do catalogo para acessibilidade e SEO
function enhanceCatalogImages() {
    document.querySelectorAll(".catalog-card-image").forEach((wrapper) => {
        if (wrapper.querySelector("img")) return;

        const styleBg = wrapper.getAttribute("style") || "";
        const match = styleBg.match(/url\(['"]?([^'")]+)['"]?\)/i);
        const src = match ? match[1] : "";
        if (!src) return;

        const title = wrapper.closest(".catalog-card")?.querySelector("h3")?.textContent?.trim();

        const img = document.createElement("img");
        img.src = src;
        img.alt = title || "Veiculo do catalogo";
        img.loading = "lazy";
        img.decoding = "async";
        wrapper.appendChild(img);
    });
}

// Loga erros globais sem impedir a propagação, para facilitar diagnóstico em produção
window.addEventListener("error", (event) => {
    if (!event) return;
    console.error("Erro não tratado:", event.error || event.message || event);
});

// Loga rejeições não tratadas, mas não as bloqueia
window.addEventListener("unhandledrejection", (event) => {
    if (!event) return;
    console.error("Promise rejeitada sem tratamento:", event.reason || event);
});

function isValidCpf(digits) {
    if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) return false;
    let sum = 0;
    for (let i = 0; i < 9; i++) sum += parseInt(digits[i]) * (10 - i);
    let rest = (sum * 10) % 11;
    if (rest >= 10) rest = 0;
    if (rest !== parseInt(digits[9])) return false;
    sum = 0;
    for (let i = 0; i < 10; i++) sum += parseInt(digits[i]) * (11 - i);
    rest = (sum * 10) % 11;
    if (rest >= 10) rest = 0;
    return rest === parseInt(digits[10]);
}

function formatCpfMask(value) {
    const digits = (value || "").replace(/\D/g, "").slice(0, 11);
    const parts = [];
    if (digits.length > 0) parts.push(digits.slice(0, 3));
    if (digits.length > 3) parts.push(digits.slice(3, 6));
    if (digits.length > 6) parts.push(digits.slice(6, 9));
    let formatted = parts.join(".");
    if (digits.length > 9) {
        formatted += "-" + digits.slice(9, 11);
    }
    return formatted;
}

function formatPhoneMask(value) {
    const digits = (value || "").replace(/\D/g, "").slice(0, 11);
    if (!digits) return "";
    const ddd = digits.slice(0, 2);
    if (digits.length <= 2) return `(${ddd}`;
    if (digits.length <= 6) return `(${ddd}) ${digits.slice(2)}`;
    if (digits.length <= 10) return `(${ddd}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    return `(${ddd}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

// Mini-vitrine da hero: roda os destaques a cada 5s e pausa em hover/foco.
// Com prefers-reduced-motion a rotação mantém-se, mas sem crossfade (CSS).
function initHeroShowcase() {
    const showcase = document.querySelector("[data-hero-showcase]");
    if (!showcase) return;
    const slides = Array.from(showcase.querySelectorAll(".hero-showcase-slide"));
    const dots = Array.from(showcase.querySelectorAll(".hero-showcase-dot"));
    if (slides.length < 2) return;

    let atual = 0;
    let timer = 0;

    const mostrar = (indice) => {
        atual = (indice + slides.length) % slides.length;
        slides.forEach((slide, i) => slide.classList.toggle("is-active", i === atual));
        dots.forEach((dot, i) => dot.classList.toggle("is-active", i === atual));
    };

    const parar = () => {
        if (timer) {
            clearInterval(timer);
            timer = 0;
        }
    };

    const arrancar = () => {
        if (timer) return;
        timer = setInterval(() => mostrar(atual + 1), 5000);
    };

    dots.forEach((dot, i) => {
        dot.addEventListener("click", () => {
            mostrar(i);
            parar();
            arrancar();
        });
    });

    showcase.addEventListener("mouseenter", parar);
    showcase.addEventListener("mouseleave", arrancar);
    showcase.addEventListener("focusin", parar);
    showcase.addEventListener("focusout", arrancar);
    document.addEventListener("visibilitychange", () => {
        if (document.hidden) parar();
        else arrancar();
    });

    arrancar();
}

function initSimulationFormConstraints() {
    const cpfInput = document.getElementById("cpf-financiamento");
    if (cpfInput) {
        cpfInput.addEventListener("input", () => {
            cpfInput.value = formatCpfMask(cpfInput.value);
        });
    }

    const phoneInput = document.getElementById("celular-financiamento");
    if (phoneInput) {
        phoneInput.addEventListener("input", () => {
            phoneInput.value = formatPhoneMask(phoneInput.value);
        });
    }

    const nameInput = document.getElementById("nome-financiamento");
    if (nameInput) {
        nameInput.addEventListener("input", () => {
            nameInput.value = nameInput.value.replace(/[0-9]/g, "");
        });
    }
}

function initContactFormConstraints() {
    const nomeContato = document.querySelector("#contato #nome");
    if (nomeContato) {
        nomeContato.addEventListener("input", () => {
            nomeContato.value = nomeContato.value.replace(/[0-9]/g, "");
        });
    }

    const telefoneContato = document.querySelector("#contato #telefone");
    if (telefoneContato) {
        telefoneContato.addEventListener("input", () => {
            telefoneContato.value = formatPhoneMask(telefoneContato.value);
        });
    }
}

function openContactModal(vehicleName) {
    const modal = document.getElementById("contact-modal");
    const vehicleEl = document.getElementById("modal-vehicle");
    if (vehicleEl) {
        vehicleEl.textContent = vehicleName
            ? "Veículo de interesse: " + vehicleName
            : "";
    }
    if (modal) {
        modal.classList.add("open");
        modal.setAttribute("aria-hidden", "false");
    }
}

function closeContactModal() {
    const modal = document.getElementById("contact-modal");
    if (modal) {
        modal.classList.remove("open");
        modal.setAttribute("aria-hidden", "true");
    }
}

function handleSimulationFormSubmit(event) {
    event.preventDefault();
    const feedback = document.getElementById("form-feedback-simulacao");
    const form = event.target;

    const getValue = (selector) => {
        const field = form.querySelector(selector);
        return field ? (field.value || "").trim() : "";
    };

    const showError = (message, field) => {
        if (feedback) {
            feedback.textContent = message;
            feedback.style.color = "#dc2626";
        }
        if (field) field.focus();
    };

    const rawNome = getValue("#nome-financiamento");
    const nome = rawNome.replace(/[0-9]/g, "").trim();
    const cpfDigits = getValue("#cpf-financiamento").replace(/\D/g, "");
    const nascimento = getValue("#nascimento-financiamento");
    const celularDigits = getValue("#celular-financiamento").replace(/\D/g, "");
    const cnh = getValue("#cnh-financiamento");
    const renda = getValue("#renda-mensal");
    const entrada = getValue("#entrada-prevista");
    const tipo = getValue("#tipo-veiculo");
    const observacoes = getValue("#observacoes-financiamento");

    if (!nome) {
        showError("Informe o nome completo usando apenas letras.", form.querySelector("#nome-financiamento"));
        return false;
    }
    if (!isValidCpf(cpfDigits)) {
        showError("Informe um CPF válido.", form.querySelector("#cpf-financiamento"));
        return false;
    }
    if (celularDigits.length !== 10 && celularDigits.length !== 11) {
        showError(
            "Informe um número de celular válido, no formato (00) 0000-0000 ou (00) 00000-0000.",
            form.querySelector("#celular-financiamento")
        );
        return false;
    }

    if (!cnh) {
        showError("Informe se possui CNH.", form.querySelector("#cnh-financiamento"));
        return false;
    }

    let nascimentoFormatado = "";
    if (nascimento) {
        const parsed = new Date(nascimento);
        if (!isNaN(parsed.getTime())) {
            nascimentoFormatado = parsed.toLocaleDateString("pt-BR", { timeZone: "UTC" });
        }
    }

    const formattedCpf = formatCpfMask(cpfDigits);
    const formattedCelular = formatPhoneMask(celularDigits);

    const messageParts = [
        "Olá! Gostaria de solicitar uma simulação na Veneza Motos e Veículos.",
        "Nome: " + nome,
        "CPF: " + formattedCpf,
        nascimentoFormatado ? "Data de nascimento: " + nascimentoFormatado : "",
        "Celular: " + formattedCelular,
        "Possui CNH: " + cnh,
        renda ? "Renda mensal aproximada: R$ " + renda : "",
        entrada ? "Entrada prevista: R$ " + entrada : "",
        tipo ? "Tipo de veículo desejado: " + tipo : "",
        observacoes ? "Observações adicionais: " + observacoes : "",
    ].filter(Boolean);

    const whatsappUrl = "https://wa.me/5585986114901?text=" + encodeURIComponent(messageParts.join("\n"));
    window.location.href = whatsappUrl;

    if (feedback) {
        feedback.textContent =
            "Redirecionamos você para o WhatsApp com a sua mensagem. Caso não abra, verifique se o bloqueio de pop-ups está desativado.";
        feedback.style.color = "#16a34a";
    }

    form.reset();
    return false;
}


function handleContactFormSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const feedback = document.getElementById("form-feedback-contato");

    const nome = (form.querySelector("#nome")?.value || "").trim();
    const telefone = (form.querySelector("#telefone")?.value || "").trim();
    const interesse = (form.querySelector("#interesse")?.value || "").trim();
    const mensagem = (form.querySelector("#mensagem")?.value || "").trim();

    if (!nome) {
        if (feedback) {
            feedback.textContent = "Informe seu nome.";
            feedback.style.color = "#dc2626";
        }
        form.querySelector("#nome")?.focus();
        return false;
    }

    const partes = [
        "Olá! Acabei de enviar uma mensagem pelo site da Veneza Motos e Veículos.",
        "Nome: " + nome,
        telefone ? "Telefone/WhatsApp: " + telefone : "",
        interesse ? "Interesse: " + interesse : "",
        mensagem ? "Mensagem: " + mensagem : "",
    ].filter(Boolean);

    const whatsappUrl =
        "https://wa.me/5585986114901?text=" + encodeURIComponent(partes.join("\n"));

    window.location.href = whatsappUrl;

    if (feedback) {
        feedback.textContent =
            "Redirecionamos você para o WhatsApp com a sua mensagem. Caso não abra, verifique se o bloqueio de pop-ups está desativado.";
        feedback.style.color = "#16a34a";
    }

    form.reset();
    return false;
}

const THEME_KEY = "veneza_theme";

// dados administrativos (não exibidos na interface)
window.venezaAdmin = {
    clients: [
        { id: 1, nome: "João Silva", cidade: "Fortaleza/CE" },
        { id: 2, nome: "Maria Oliveira", cidade: "Maracanaú/CE" },
    ],
    vehicles: [
        { id: 1, nome: "BYD Song Pro", tipo: "carro" },
        { id: 2, nome: "Chevrolet Onix", tipo: "carro" },
        { id: 3, nome: "Honda CG 160", tipo: "moto" },
    ],
    addClient(client) {
        const id = Date.now();
        this.clients.push({ id, ...client });
        return id;
    },
    removeClient(id) {
        this.clients = this.clients.filter((c) => c.id !== id);
    },
    addVehicle(vehicle) {
        const id = Date.now();
        this.vehicles.push({ id, ...vehicle });
        return id;
    },
    removeVehicle(id) {
        this.vehicles = this.vehicles.filter((v) => v.id !== id);
    },
};

function applyTheme(theme) {
    const body = document.body;
    if (!body) return;
    body.setAttribute("data-theme", theme);
    const labelText = theme === "dark" ? "Modo claro" : "Modo escuro";
    document.querySelectorAll(".theme-label").forEach((el) => {
        el.textContent = labelText;
    });
}

function toggleTheme() {
    const body = document.body;
    if (!body) return;
    const current = body.getAttribute("data-theme") || "light";
    const next = current === "dark" ? "light" : "dark";
    applyTheme(next);
    try {
        localStorage.setItem(THEME_KEY, next);
    } catch (e) {
        // ignore storage errors
    }
}

// garante que valores de transmissao sejam comparados no mesmo padrao
function normalizeTransmissionValue(value) {
    const lower = (value || "").toLowerCase();
    if (!lower) return "";
    if (lower.startsWith("auto")) return "auto";
    if (lower.startsWith("man")) return "manual";
    if (lower.includes("ambas")) return "ambas";
    return lower;
}

function filterCatalog() {
    const cards = Array.from(document.querySelectorAll(".catalog-card"));
    if (!cards.length) return;

    const byCategory = [];
    if (document.getElementById("filtro-hatch")?.checked) byCategory.push("hatch");
    if (document.getElementById("filtro-suv")?.checked) byCategory.push("suv");
    if (document.getElementById("filtro-seda")?.checked) byCategory.push("seda");
    if (document.getElementById("filtro-moto")?.checked) byCategory.push("moto");

    const byTrans = [];
    if (document.getElementById("filtro-auto")?.checked) byTrans.push("auto");
    if (document.getElementById("filtro-manual")?.checked) byTrans.push("manual");

    const byFuel = [];
    if (document.getElementById("filtro-flex")?.checked) byFuel.push("flex");
    if (document.getElementById("filtro-gasolina")?.checked) byFuel.push("gasolina");

    const byMotoStyle = [];
    if (document.getElementById("filtro-moto-street")?.checked) byMotoStyle.push("street");
    if (document.getElementById("filtro-moto-trail")?.checked) byMotoStyle.push("trail");
    if (document.getElementById("filtro-moto-scooter")?.checked) byMotoStyle.push("scooter");

    const byBrand = [];
    if (document.getElementById("filtro-honda")?.checked) byBrand.push("honda");
    if (document.getElementById("filtro-yamaha")?.checked) byBrand.push("yamaha");

    const requireAbs = !!document.getElementById("filtro-abs")?.checked;

    const yearRanges = [];
    if (document.getElementById("filtro-ano-ate-2013")?.checked) {
        yearRanges.push({ min: 0, max: 2013 });
    }
    if (document.getElementById("filtro-ano-2014-2016")?.checked) {
        yearRanges.push({ min: 2014, max: 2016 });
    }
    if (document.getElementById("filtro-ano-2017-mais")?.checked) {
        yearRanges.push({ min: 2017, max: 3000 });
    }

    const sortSelect = document.querySelector(".catalog-sort");
    const sortValue = sortSelect?.value || "Mais recentes";

    cards.forEach((card) => {
        const cat = (card.dataset.category || "").toLowerCase();
        const trans = normalizeTransmissionValue(card.dataset.transmission);
        const fuel = (card.dataset.fuel || card.dataset.gasolina || "").toLowerCase();
        const motoStyle = (card.dataset.motoStyle || "").toLowerCase();
        const brand = (card.dataset.brand || "").toLowerCase();
        const absFlag = (card.dataset.abs || "").toLowerCase() === "sim";
        const yearRaw = (card.dataset.year || "").toString();
        const yearValue = parseInt(yearRaw.split("/")[0] || "0", 10);

        let visible = true;
        if (byCategory.length && !byCategory.includes(cat)) visible = false;
        if (visible && byTrans.length && !byTrans.some((t) => trans === t || trans === "ambas")) visible = false;
        if (visible && byFuel.length && !byFuel.includes(fuel)) visible = false;
        if (visible && byMotoStyle.length) {
            if (cat === "moto") {
                if (!byMotoStyle.includes(motoStyle)) visible = false;
            } else {
                visible = false;
            }
        }
        if (visible && byBrand.length && !byBrand.includes(brand)) visible = false;
        if (visible && requireAbs && !absFlag) visible = false;
        if (visible && yearRanges.length) {
            const inRange = yearRanges.some((r) => yearValue >= r.min && yearValue <= r.max);
            if (!inRange) visible = false;
        }

        card.style.display = visible ? "flex" : "none";
    });

    // ordenação
    const container = cards[0].parentElement;
    if (!container) return;

    const visibleCards = cards.filter((c) => c.style.display !== "none");
    visibleCards.sort((a, b) => {
        const yearA = parseInt(a.dataset.year || "0", 10);
        const yearB = parseInt(b.dataset.year || "0", 10);
        const priceA = parseFloat(a.dataset.price || "0");
        const priceB = parseFloat(b.dataset.price || "0");

        if (sortValue === "Menor preço") return priceA - priceB;
        if (sortValue === "Maior preço") return priceB - priceA;
        // Mais recentes (padrão)
        return yearB - yearA;
    });

    visibleCards.forEach((card) => container.appendChild(card));
}

function populateSimulationVehicleOptions() {
    const select = document.getElementById("tipo-veiculo");
    if (!select) return;

    const vehicleItems = [];
    const normalizeSpaces = (text) => (text || "").replace(/\s+/g, " ").trim();
    const normalizeYear = (text) => normalizeSpaces(text).replace(/\s*\/\s*/g, "/");
    const addVehicle = (name, year) => {
        const cleanName = normalizeSpaces(name);
        const cleanYear = normalizeYear(year);
        if (!cleanName) return;
        const key = cleanName.toLowerCase() + "|" + cleanYear.toLowerCase();
        if (vehicleItems.some((v) => v.key === key)) return;
        vehicleItems.push({ key, name: cleanName, year: cleanYear });
    };

    const extractYear = (text) => {
        if (!text) return "";
        const match = text.match(/\d{4}(?:\s*\/\s*\d{4})?/);
        return match ? match[0].replace(/\s+/g, " ") : "";
    };

    document.querySelectorAll(".catalog-card").forEach((card) => {
        const name = card.querySelector("h3")?.textContent || "";
        const year = card.dataset.year || extractYear(card.textContent);
        addVehicle(name, year);
    });

    document.querySelectorAll(".vehicle-card").forEach((card) => {
        const name = card.querySelector("h3")?.textContent || "";
        const yearText = card.querySelector(".vehicle-details")?.textContent || card.textContent;
        const year = extractYear(yearText);
        addVehicle(name, year);
    });

    const placeholder =
        select.querySelector("option[value='']")?.textContent || "Selecionar veiculo para simulacao";
    select.innerHTML = "";
    const placeholderOption = document.createElement("option");
    placeholderOption.value = "";
    placeholderOption.textContent = placeholder;
    select.appendChild(placeholderOption);

    vehicleItems
        .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
        .forEach(({ name, year }) => {
            const display = year ? `${name} (${year})` : name;
            const option = document.createElement("option");
            option.value = display;
            option.textContent = display;
            select.appendChild(option);
        });
}

document.addEventListener("DOMContentLoaded", () => {
    try {
        let savedTheme = null;
        try {
            savedTheme = localStorage.getItem(THEME_KEY);
        } catch (e) {
            // storage might estar indisponível; ignora e segue com tema claro
        }
        applyTheme(savedTheme === "dark" ? "dark" : "light");

    // Define lazy-load para imagens que ainda não possuem atributo
    document.querySelectorAll("img:not([loading])").forEach((img) => {
        img.setAttribute("loading", "lazy");
    });

    document.querySelectorAll("[data-role='theme-toggle']").forEach((btn) => {
        btn.addEventListener("click", toggleTheme);
    });

    document.querySelectorAll("[data-scroll-target]").forEach((el) => {
        el.addEventListener("click", (event) => {
            event.preventDefault();
            const target = el.getAttribute("data-scroll-target");
            if (target) scrollToSection(target);
        });
    });

    document.querySelectorAll(".filter-button").forEach((btn) => {
        btn.addEventListener("click", () => {
            const type = btn.dataset.filter || "all";
            filterVehicles(type);
        });
    });

    document.querySelectorAll("[data-vehicle]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const name = btn.getAttribute("data-vehicle");
            openContactModal(name);
        });
    });

    const modalBackdrop = document.querySelector("#contact-modal .modal-backdrop");
    if (modalBackdrop) {
        modalBackdrop.addEventListener("click", closeContactModal);
    }
    const modalClose = document.querySelector("#contact-modal .modal-close");
    if (modalClose) {
        modalClose.addEventListener("click", closeContactModal);
    }
    const modalGoContact = document.getElementById("modal-go-contact");
    if (modalGoContact) {
        modalGoContact.addEventListener("click", () => {
            scrollToSection("contato");
            closeContactModal();
        });
    }

    // filtros e ordenação do catálogo
    [
        "filtro-hatch",
        "filtro-suv",
        "filtro-seda",
        "filtro-luxo",
        "filtro-moto",
        "filtro-auto",
        "filtro-manual",
        "filtro-flex",
        "filtro-gasolina",
        "filtro-eletrico",
        "filtro-moto-street",
        "filtro-moto-trail",
        "filtro-moto-scooter",
        "filtro-honda",
        "filtro-yamaha",
        "filtro-abs",
        "filtro-ano-ate-2013",
        "filtro-ano-2014-2016",
        "filtro-ano-2017-mais",
    ].forEach((id) => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener("change", filterCatalog);
        }
    });
    const sortSelect = document.querySelector(".catalog-sort");
    if (sortSelect) {
        sortSelect.addEventListener("change", filterCatalog);
    }

    const yearEl = document.getElementById("current-year");
    if (yearEl) {
        yearEl.textContent = new Date().getFullYear();
    }
    applyVehicleImages();
    initVehicleImagePreview();
    enhanceCatalogImages();
    populateSimulationVehicleOptions();
    animateCounters();
    initScrollReveal();
    initFilterToggle();
    initHeroShowcase();
    initSimulationFormConstraints();
    initContactFormConstraints();
    const simForm = document.getElementById("form-simulacao");
    if (simForm) {
        simForm.addEventListener("submit", handleSimulationFormSubmit);
    }

    // 🔹 Conecta o formulário de CONTATO ao JavaScript
    const contatoForm = document.querySelector("#contato .contact-form");
    if (contatoForm) {
        contatoForm.addEventListener("submit", handleContactFormSubmit);
    }

    filterVehicles("all");
    filterCatalog();

    // ===== Mobile Navigation Drawer =====
    const navHamburger = document.getElementById("nav-hamburger");
    const mobileNavEl = document.getElementById("mobile-nav");
    const mobileNavBackdropEl = document.getElementById("mobile-nav-backdrop");
    const mobileNavCloseEl = document.getElementById("mobile-nav-close");

    const openMobileNav = () => {
        if (!mobileNavEl) return;
        mobileNavEl.classList.add("open");
        mobileNavEl.setAttribute("aria-hidden", "false");
        mobileNavBackdropEl?.classList.add("visible");
        navHamburger?.setAttribute("aria-expanded", "true");
        document.body.style.overflow = "hidden";
    };

    const closeMobileNav = () => {
        if (!mobileNavEl) return;
        mobileNavEl.classList.remove("open");
        mobileNavEl.setAttribute("aria-hidden", "true");
        mobileNavBackdropEl?.classList.remove("visible");
        navHamburger?.setAttribute("aria-expanded", "false");
        document.body.style.overflow = "";
    };

    if (navHamburger) navHamburger.addEventListener("click", openMobileNav);
    if (mobileNavCloseEl) mobileNavCloseEl.addEventListener("click", closeMobileNav);
    if (mobileNavBackdropEl) mobileNavBackdropEl.addEventListener("click", closeMobileNav);

    document.querySelectorAll(".mobile-nav-links a").forEach((link) => {
        link.addEventListener("click", closeMobileNav);
    });

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && mobileNavEl?.classList.contains("open")) {
            closeMobileNav();
        }
    });

    // ===== Scroll to Top Button =====
    const scrollTopBtn = document.getElementById("scroll-top");
    if (scrollTopBtn) {
        const toggleScrollTopVisibility = () => {
            if (window.scrollY > 450) {
                scrollTopBtn.classList.add("visible");
            } else {
                scrollTopBtn.classList.remove("visible");
            }
        };
        window.addEventListener("scroll", toggleScrollTopVisibility, { passive: true });
        scrollTopBtn.addEventListener("click", () => {
            window.scrollTo({ top: 0, behavior: "smooth" });
        });
    }

    if (window.feather && typeof window.feather.replace === "function") {
        window.feather.replace();
    }

    // Descricoes extras adicionadas via JS para evitar alteracoes diretas no HTML com caracteres especiais
    const aboutList = document.querySelector("#sobre .about-box ul");
    if (aboutList) {
        const li = document.createElement("li");
        li.textContent =
            "Acompanhamento desde a escolha do veículo até a entrega, com explicação de taxas, documentação e garantias.";
        aboutList.appendChild(li);
    }

    const contactHeader = document.querySelector("#contato .section-header");
    if (contactHeader) {
        const extra = document.createElement("p");
        extra.textContent =
            "Envie também sua renda aproximada e se possui veículo na troca para receber uma simulação mais precisa.";
        contactHeader.appendChild(extra);
    }
    // ===== Acessibilidade: aria-label automático para imagens de veículos =====
    document.querySelectorAll('.vehicle-image').forEach(function(el) {
        var card = el.closest('.vehicle-card');
        var h3 = card && card.querySelector('h3');
        if (h3) {
            el.setAttribute('role', 'img');
            el.setAttribute('aria-label', 'Foto do veículo: ' + h3.textContent.trim());
        }
    });

    document.querySelectorAll('.catalog-card-image').forEach(function(el) {
        var card = el.closest('.catalog-card');
        var h3 = card && card.querySelector('h3');
        if (h3) {
            el.setAttribute('role', 'img');
            el.setAttribute('aria-label', 'Foto do veículo: ' + h3.textContent.trim());
        }
    });

    } catch (error) {
        console.error("Erro ao inicializar os scripts da página:", error);
    }
});






