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

function handleFormSubmit(event) {
    event.preventDefault();
    const feedback = document.getElementById("form-feedback");
    if (!feedback) return;
    feedback.textContent =
        "Mensagem enviada! Nossa equipe da Veneza Motos E Veículos entrará em contato em breve.";
    feedback.style.color = "#16a34a";
    event.target.reset();
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
    const label = document.getElementById("theme-toggle-label");
    if (label) {
        label.textContent = theme === "dark" ? "Modo claro" : "Modo escuro";
    }
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

function filterCatalog() {
    const cards = Array.from(document.querySelectorAll(".catalog-card"));
    if (!cards.length) return;

    const byCategory = [];
    if (document.getElementById("filtro-hatch")?.checked) byCategory.push("hatch");
    if (document.getElementById("filtro-suv")?.checked) byCategory.push("suv");
    if (document.getElementById("filtro-seda")?.checked) byCategory.push("seda");
    if (document.getElementById("filtro-luxo")?.checked) byCategory.push("luxo");

    const byTrans = [];
    if (document.getElementById("filtro-auto")?.checked) byTrans.push("auto");
    if (document.getElementById("filtro-manual")?.checked) byTrans.push("manual");

    const byFuel = [];
    if (document.getElementById("filtro-flex")?.checked) byFuel.push("flex");
    if (document.getElementById("filtro-gasolina")?.checked) byFuel.push("gasolina");
    if (document.getElementById("filtro-eletrico")?.checked) byFuel.push("hibrido", "eletrico", "diesel");

    const sortSelect = document.querySelector(".catalog-sort");
    const sortValue = sortSelect?.value || "Mais recentes";

    cards.forEach((card) => {
        const cat = (card.dataset.category || "").toLowerCase();
        const trans = (card.dataset.transmission || "").toLowerCase();
        const fuel = (card.dataset.fuel || "").toLowerCase();

        let visible = true;
        if (byCategory.length && !byCategory.includes(cat)) visible = false;
        if (visible && byTrans.length && !byTrans.some((t) => trans === t || trans === "ambas")) visible = false;
        if (visible && byFuel.length && !byFuel.includes(fuel)) visible = false;

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

document.addEventListener("DOMContentLoaded", () => {
    try {
        const saved = localStorage.getItem(THEME_KEY);
        applyTheme(saved === "dark" ? "dark" : "light");
    } catch (e) {
        applyTheme("light");
    }

    const toggleBtn = document.querySelector("[data-role='theme-toggle']");
    if (toggleBtn) {
        toggleBtn.addEventListener("click", toggleTheme);
    }

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
    ["filtro-hatch","filtro-suv","filtro-seda","filtro-luxo",
     "filtro-auto","filtro-manual",
     "filtro-flex","filtro-gasolina","filtro-eletrico"].forEach((id) => {
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
    filterVehicles("all");
    filterCatalog();

    if (window.feather && typeof window.feather.replace === "function") {
        window.feather.replace();
    }
});
