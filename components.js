(() => {
  "use strict";

  const WHATSAPP_URL = "https://wa.me/5542998417890";

  const navItems = [
    { label: "Início", href: "index.html", match: ["", "index.html"] },
    { label: "Diagnóstico", href: "diagnostico.html", match: ["diagnostico.html"] },
    { label: "Blog", href: "blog.html", match: ["blog.html"] },
    { label: "Metodologia", href: "index.html#metodologia", match: ["vertice.html"] }
  ];

  const qs = (selector, root = document) => root.querySelector(selector);
  const qsa = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  function currentFile() {
    const file = window.location.pathname.split("/").pop();
    return file || "index.html";
  }

  function isActive(item) {
    const file = currentFile();
    return item.match.includes(file) || (file === "" && item.href === "index.html");
  }

  function navMarkup(className = "vt-nav") {
    return `
      <nav class="${className}" aria-label="Navegação principal">
        ${navItems.map((item) => `
          <a href="${item.href}" class="${isActive(item) ? "active" : ""}">${item.label}</a>
        `).join("")}
      </nav>
    `;
  }

  function whatsappIcon() {
    return `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
      </svg>
    `;
  }

  function renderHeader() {
    const mount = qs("[data-component='header']");
    if (!mount) return;

    mount.innerHTML = `
      <header class="vt-header" id="siteHeader">
        <div class="container vt-header__inner">
          <a href="index.html" class="vt-logo" aria-label="Vértice - página inicial">
            VÉRT<em>I</em>CE
            <span class="vt-logo__tag">Inteligência & Eventos</span>
          </a>
          ${navMarkup()}
          <div class="vt-header__actions">
            <a href="${WHATSAPP_URL}" target="_blank" rel="noopener" class="btn btn-primary">
              ${whatsappIcon()}
              Falar com Guilherme
            </a>
            <button class="vt-menu-btn" type="button" data-mobile-open aria-label="Abrir menu">
              <span></span>
            </button>
          </div>
        </div>
      </header>
      <div class="vt-mobile-nav" id="mobileNav" aria-hidden="true">
        <button class="vt-mobile-nav__close" type="button" data-mobile-close aria-label="Fechar menu">&times;</button>
        <div class="vt-mobile-nav__links">
          ${navItems.map((item) => `<a href="${item.href}" class="${isActive(item) ? "active" : ""}">${item.label}</a>`).join("")}
          <a href="${WHATSAPP_URL}" target="_blank" rel="noopener">WhatsApp</a>
        </div>
      </div>
    `;
  }

  function renderFooter() {
    const mount = qs("[data-component='footer']");
    if (!mount) return;

    mount.innerHTML = `
      <footer class="vt-footer">
        <div class="container">
          <div class="vt-footer__grid">
            <div>
              <div class="vt-footer__logo">VÉRT<em>I</em>CE</div>
              <p class="vt-footer__desc">
                Engenharia de Experiências B2B. Metodologia proprietária em 6 fases, ROI mensurável e comunidade ativa além do palco.
              </p>
            </div>
            <div class="vt-footer__col">
              <h4>Conteúdo</h4>
              <ul>
                <li><a href="blog.html?cat=ia">Tecnologia aplicada</a></li>
                <li><a href="blog.html?cat=agro">Agronegócio</a></li>
                <li><a href="blog.html?cat=eventos">Eventos & CX</a></li>
                <li><a href="blog.html?cat=tech">Tecnologia</a></li>
              </ul>
            </div>
            <div class="vt-footer__col">
              <h4>Vértice</h4>
              <ul>
                <li><a href="vertice.html#metodologia">Metodologia 6 Fases</a></li>
                <li><a href="vertice.html#fundador">Sobre Guilherme</a></li>
                <li><a href="diagnostico.html">Diagnóstico Gratuito</a></li>
                <li><a href="${WHATSAPP_URL}" target="_blank" rel="noopener">WhatsApp</a></li>
              </ul>
            </div>
          </div>
          <div class="vt-footer__bottom">
            <p>© 2026 Vértice Engenharia de Experiências</p>
            <p>Feito com <span class="neon">metodologia</span>, não com improviso.</p>
          </div>
        </div>
      </footer>
    `;
  }

  function setupHeaderScroll() {
    const header = qs("#siteHeader");
    if (!header) return;

    const update = () => header.classList.toggle("is-scrolled", window.scrollY > 36);
    update();
    window.addEventListener("scroll", update, { passive: true });
  }

  function setupMobileNav() {
    const nav = qs("#mobileNav");
    const open = qs("[data-mobile-open]");
    const close = qs("[data-mobile-close]");
    if (!nav || !open || !close) return;

    const setOpen = (isOpen) => {
      nav.classList.toggle("open", isOpen);
      nav.setAttribute("aria-hidden", String(!isOpen));
      document.body.classList.toggle("no-scroll", isOpen);
    };

    open.addEventListener("click", () => setOpen(true));
    close.addEventListener("click", () => setOpen(false));
    qsa("a", nav).forEach((link) => link.addEventListener("click", () => setOpen(false)));
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") setOpen(false);
    });
  }

  function setupReveal() {
    const elements = qsa(".reveal:not(.visible)");
    if (!elements.length) return;

    if (!("IntersectionObserver" in window)) {
      elements.forEach((el) => el.classList.add("visible"));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: "0px 0px -24px 0px" });

    elements.forEach((el) => observer.observe(el));
  }

  function setupScrollProgress() {
    let progress = qs(".scroll-progress");
    if (!progress) {
      progress = document.createElement("div");
      progress.className = "scroll-progress";
      progress.innerHTML = "<div class=\"scroll-progress__bar\"></div>";
      document.body.prepend(progress);
    }

    const bar = qs(".scroll-progress__bar", progress);
    const update = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const pct = max > 0 ? (window.scrollY / max) * 100 : 0;
      bar.style.width = `${Math.min(100, Math.max(0, pct))}%`;
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
  }

  function hydrateLocalConfig() {
    const params = new URLSearchParams(window.location.search);
    const shouldClearKeys = params.get("clear_keys") === "1";
    const legacySheets = localStorage.getItem("vt_sheets_id");
    const sheetsFromUrl = params.get("sheets") || params.get("vt_sheets");

    if (shouldClearKeys) {
      localStorage.removeItem("vt_sheets");
      localStorage.removeItem("vt_sheets_id");
    }

    if (!localStorage.getItem("vt_sheets") && legacySheets) localStorage.setItem("vt_sheets", legacySheets);
    if (sheetsFromUrl) localStorage.setItem("vt_sheets", sheetsFromUrl);

    if (shouldClearKeys || sheetsFromUrl) {
      ["clear_keys", "sheets", "vt_sheets"].forEach((key) => params.delete(key));
      const cleanQuery = params.toString();
      const cleanUrl = `${window.location.pathname}${cleanQuery ? `?${cleanQuery}` : ""}${window.location.hash}`;
      window.history.replaceState({}, document.title, cleanUrl);
    }
  }

  function init() {
    hydrateLocalConfig();
    renderHeader();
    renderFooter();
    setupHeaderScroll();
    setupMobileNav();
    setupReveal();
    setupScrollProgress();
  }

  window.Vertice = {
    init,
    setupReveal,
    get sheetsId() {
      return localStorage.getItem("vt_sheets") || "";
    },
    whatsappUrl: WHATSAPP_URL
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
