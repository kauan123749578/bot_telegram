/** Client-side navigation, live updates and sale notifications for the panel. */
export const panelClientScript = `
<script>
(function () {
  const main = document.querySelector(".content");
  if (!main) return;

  const NAV_PATHS = [
    ["/", "Dashboard"],
    ["/instances", "Instâncias"],
    ["/leads", "Leads"],
    ["/remarketing", "Remarketing"],
    ["/conversations", "Conversas"],
    ["/payments", "Pagamentos"],
    ["/products", "Produtos"],
    ["/media", "Mídias"],
    ["/settings", "Configurações"],
    ["/instances/new", "Nova Instância"]
  ];

  const LS_LAST_SALE = "panelLastSaleId";
  const LS_BELL_SEEN = "panelBellSeenAt";
  let navigating = false;

  function bindForms(root) {
    (root || document).querySelectorAll("form").forEach((f) => {
      if (f.dataset.bound) return;
      f.dataset.bound = "1";
      f.addEventListener("submit", () => {
        const b = f.querySelector('button[type="submit"]');
        if (b) { b.disabled = true; b.textContent = "Salvando..."; }
      });
    });
  }

  function pageTitle(path) {
    if (path.startsWith("/instances/new")) return "Nova Instância";
    if (/^\/instances\/[^/]+\/edit$/.test(path)) return "Editar instância";
    const hit = NAV_PATHS.find(([p]) => p === path);
    return hit ? hit[1] : "BotManager";
  }

  function setActiveNav(path) {
    document.querySelectorAll(".sidebar .nav a[data-nav]").forEach((a) => {
      const href = a.getAttribute("href") || "";
      let active = href === path;
      if (!active && path.startsWith("/instances") && href === "/instances" && path !== "/instances/new") {
        active = true;
      }
      a.classList.toggle("active", active);
    });
  }

  function isInternalNavLink(a) {
    if (!a || a.target === "_blank" || a.hasAttribute("download")) return false;
    const href = a.getAttribute("href");
    if (!href || !href.startsWith("/")) return false;
    if (href.startsWith("/uploads")) return false;
    if (a.closest("form")) return false;
    return true;
  }

  async function loadPage(href, push = true) {
    if (navigating) return;
    navigating = true;
    const path = href.split("?")[0];
    main.style.opacity = "0.6";
    try {
      const res = await fetch(href, {
        headers: { "X-Panel-Partial": "1" },
        credentials: "same-origin"
      });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const html = await res.text();
      const isFullDoc = /<!doctype/i.test(html) || html.includes("<html");
      if (isFullDoc) {
        const doc = new DOMParser().parseFromString(html, "text/html");
        const next = doc.querySelector(".content");
        if (!next) {
          window.location.href = href;
          return;
        }
        main.innerHTML = next.innerHTML;
        const title = doc.querySelector(".topbar h1");
        if (title) {
          const h = document.querySelector(".topbar h1");
          if (h) h.textContent = title.textContent;
        }
      } else {
        main.innerHTML = html;
        const h = document.querySelector(".topbar h1");
        if (h) h.textContent = pageTitle(path);
      }
      setActiveNav(path);
      if (push) history.pushState({ panel: true }, "", href);
      bindForms(main);
      refreshLive(true);
    } catch {
      window.location.href = href;
    } finally {
      main.style.opacity = "1";
      main.style.pointerEvents = "";
      navigating = false;
    }
  }

  document.addEventListener("click", (e) => {
    const a = e.target.closest("a");
    if (!isInternalNavLink(a)) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    loadPage(a.getAttribute("href"));
  });

  window.addEventListener("popstate", () => {
    loadPage(location.pathname + location.search, false);
  });

  bindForms(document);

  /* ——— Toasts & bell ——— */
  const toastRoot = document.getElementById("panel-toasts");
  const bellBtn = document.querySelector(".icon-btn.bell-btn");
  const bellBadge = document.querySelector(".bell-badge");
  const bellMenu = document.getElementById("bell-menu");

  function showToast(title, body) {
    if (!toastRoot) return;
    const el = document.createElement("div");
    el.className = "panel-toast";
    el.innerHTML = '<strong>' + title + '</strong><span>' + body + '</span><button type="button" aria-label="Fechar">×</button>';
    toastRoot.appendChild(el);
    el.querySelector("button").addEventListener("click", () => el.remove());
    setTimeout(() => el.classList.add("show"), 10);
    setTimeout(() => { el.classList.remove("show"); setTimeout(() => el.remove(), 400); }, 8000);
    if (Notification && Notification.permission === "granted") {
      try { new Notification(title, { body }); } catch (_) {}
    }
  }

  if (bellBtn && bellMenu) {
    bellBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      bellMenu.classList.toggle("open");
      sessionStorage.setItem(LS_BELL_SEEN, String(Date.now()));
      if (bellBadge) bellBadge.style.display = "none";
    });
    document.addEventListener("click", () => bellMenu.classList.remove("open"));
  }

  if (Notification && Notification.permission === "default") {
    Notification.requestPermission().catch(() => {});
  }

  function updateBellMenu(sales) {
    if (!bellMenu) return;
    if (!sales || sales.length === 0) {
      bellMenu.innerHTML = '<div class="bell-empty">Nenhuma venda ainda</div>';
      return;
    }
    bellMenu.innerHTML = sales.slice(0, 8).map((s) =>
      '<div class="bell-item"><strong>' + s.title + '</strong><span>' + s.subtitle + '</span><time>' + s.time + '</time></div>'
    ).join("");
  }

  function money(cents) {
    return "R$ " + (cents / 100).toFixed(2).replace(".", ",");
  }

  function applyLive(data) {
    if (!data) return;
    const stats = data.stats;
    if (stats) {
      document.querySelectorAll("[data-live-stat]").forEach((el) => {
        const key = el.getAttribute("data-live-stat");
        if (key === "leads") el.textContent = String(stats.leads);
        if (key === "messagesToday") el.textContent = stats.messagesToday + " msgs hoje";
        if (key === "salesValue") el.textContent = money(stats.salesTotalCents);
        if (key === "salesCount") el.textContent = stats.salesCount + " venda(s)";
        if (key === "activeBots") el.textContent = String(stats.activeBots);
      });
    }
    const feed = document.querySelector("[data-live=activity-feed]");
    if (feed && data.activityHtml) feed.innerHTML = data.activityHtml;
    const top = document.querySelector("[data-live=top-bots]");
    if (top && data.topBotsHtml) top.innerHTML = data.topBotsHtml;
    const chart = document.querySelector("[data-live=sales-chart]");
    if (chart && data.chartSvg) chart.innerHTML = data.chartSvg;
    if (data.bellSales) updateBellMenu(data.bellSales);

    const latest = data.latestSale;
    if (latest && latest.id) {
      const prev = localStorage.getItem(LS_LAST_SALE);
      if (prev && prev !== latest.id) {
        showToast("Venda confirmada!", latest.subtitle);
        if (bellBadge) {
          bellBadge.style.display = "flex";
          bellBadge.textContent = "!";
        }
      }
      localStorage.setItem(LS_LAST_SALE, latest.id);
    }

    const bellSeen = Number(sessionStorage.getItem(LS_BELL_SEEN) || 0);
    if (data.latestSaleAt && new Date(data.latestSaleAt).getTime() > bellSeen && bellBadge) {
      bellBadge.style.display = "flex";
      bellBadge.textContent = "!";
    }
  }

  async function refreshLive(silent) {
    try {
      const res = await fetch("/api/panel/live", { credentials: "same-origin" });
      if (!res.ok) return;
      const data = await res.json();
      applyLive(data);
    } catch (_) {
      if (!silent) console.warn("live refresh failed");
    }
  }

  refreshLive(true);
  setInterval(() => {
    if (document.hidden) return;
    refreshLive(true);
  }, 12000);
})();
</script>`;
