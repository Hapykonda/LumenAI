(function () {
  "use strict";

  var ROOT_ID = "lumenai-widget-root";
  var IFRAME_ID = "lumenai-widget-iframe";
  var BACKDROP_ID = "lumenai-widget-backdrop";
  var LAUNCHER_ID = "lumenai-widget-launcher";

  function getScript() {
    return (
      document.currentScript ||
      document.querySelector('script[data-lumenai-widget="true"]') ||
      document.getElementById("lumenai-widget") ||
      document.querySelector('script[src*="widget.js"]') ||
      null
    );
  }

  var SCRIPT = getScript();

  if (!SCRIPT) return;

  function clean(value) {
    return String(value || "").trim();
  }

  function removeTrailingSlash(value) {
    return String(value || "").replace(/\/+$/, "");
  }

  function getScriptOrigin(script) {
    try {
      if (!script || !script.src) return window.location.origin;
      return new URL(script.src, window.location.href).origin;
    } catch (e) {
      return window.location.origin;
    }
  }

  function getConfigFromScript() {
    var key = clean(
      SCRIPT.getAttribute("data-key") ||
        SCRIPT.getAttribute("data-public-key") ||
        SCRIPT.getAttribute("data-business-key")
    );

    var appUrl = clean(SCRIPT.getAttribute("data-app-url")) || getScriptOrigin(SCRIPT);

    var position = clean(SCRIPT.getAttribute("data-position")) || "br";
    var zIndex = Number(clean(SCRIPT.getAttribute("data-z-index")) || "2147483000");
    var preview = clean(SCRIPT.getAttribute("data-preview")) === "1";
    var backdrop = clean(SCRIPT.getAttribute("data-backdrop"));

    appUrl = removeTrailingSlash(appUrl);

    return {
      key: key,
      appUrl: appUrl,
      position: position,
      zIndex: Number.isFinite(zIndex) ? zIndex : 2147483000,
      preview: preview,
      backdrop: backdrop === "false" ? false : true,
    };
  }

  var BOOT = getConfigFromScript();

  if (!BOOT.key) {
    console.warn("[LumenAI] Falta data-key en el script del widget.");
    return;
  }

  if (!BOOT.appUrl) {
    console.warn("[LumenAI] No se pudo detectar data-app-url.");
    return;
  }

  var APP_ORIGIN = "";

  try {
    APP_ORIGIN = new URL(BOOT.appUrl).origin;
  } catch (e) {
    APP_ORIGIN = BOOT.appUrl;
  }

  if (document.getElementById(ROOT_ID)) return;

  function applyStyle(el, styleObj) {
    Object.keys(styleObj).forEach(function (key) {
      el.style[key] = styleObj[key];
    });
  }

  function isMobile() {
    try {
      return window.matchMedia("(max-width: 640px)").matches;
    } catch (e) {
      return window.innerWidth <= 640;
    }
  }

  function normalizePosition(value) {
    var p = String(value || "br").toLowerCase();
    return p === "bl" || p === "tr" || p === "tl" || p === "br" ? p : "br";
  }

  function getEnabled(cfg) {
    if (!cfg) return true;
    if (typeof cfg.widgetEnabled === "boolean") return cfg.widgetEnabled;
    if (typeof cfg.widget_enabled === "boolean") return cfg.widget_enabled;
    if (typeof cfg.enabled === "boolean") return cfg.enabled;
    return true;
  }

  function getPosition(cfg) {
    var p =
      (cfg && cfg.position) ||
      (cfg && cfg.widget_position) ||
      (cfg && cfg.settings && cfg.settings.position) ||
      (cfg && cfg.widget && cfg.widget.position) ||
      BOOT.position ||
      "br";

    return normalizePosition(p);
  }

  function pickPrimary(cfg) {
    return (
      (cfg && cfg.theme && (cfg.theme.primaryColor || cfg.theme.primary)) ||
      (cfg && cfg.widget && cfg.widget.theme && cfg.widget.theme.primaryColor) ||
      (cfg && cfg.primary_color) ||
      (cfg && cfg.primaryColor) ||
      "#00E5FF"
    );
  }

  function pickSecondary(cfg, primary) {
    return (
      (cfg && cfg.theme && (cfg.theme.gradientTo || cfg.theme.secondary)) ||
      (cfg && cfg.widget && cfg.widget.theme && cfg.widget.theme.gradientTo) ||
      (cfg && cfg.gradientTo) ||
      (cfg && cfg.gradient_to) ||
      (cfg && cfg.secondary) ||
      primary ||
      "#1B43FF"
    );
  }

  function hexToRgba(hex, a) {
    var h = String(hex || "").replace("#", "").trim();

    if (h.length === 3) {
      h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    }

    if (!/^[0-9a-fA-F]{6}$/.test(h)) {
      h = "00E5FF";
    }

    var n = parseInt(h, 16);
    var r = (n >> 16) & 255;
    var g = (n >> 8) & 255;
    var b = n & 255;

    return "rgba(" + r + "," + g + "," + b + "," + (a || 0.2) + ")";
  }

  function buildWidgetUrl() {
    var url = BOOT.appUrl + "/widget?key=" + encodeURIComponent(BOOT.key);
    url += "&embed=1";

    if (BOOT.preview) {
      url += "&preview=1";
    }

    try {
      url += "&parentUrl=" + encodeURIComponent(window.location.href);
      url += "&parentReferrer=" + encodeURIComponent(document.referrer || "");
    } catch (e) {}

    return url;
  }

  function buildRootStyle(zIndex) {
    return {
      position: "fixed",
      inset: "0",
      width: "0",
      height: "0",
      zIndex: String(zIndex),
      pointerEvents: "none",
      background: "transparent",
    };
  }

  function buildBackdropStyle(primary, secondary) {
    return {
      position: "fixed",
      inset: "0",
      zIndex: "0",
      pointerEvents: "none",
      opacity: "0",
      transition: "opacity 180ms ease",
      background:
        "radial-gradient(900px 520px at 78% 8%, " +
        hexToRgba(primary, 0.14) +
        ", transparent 60%)," +
        "radial-gradient(900px 520px at 18% 92%, " +
        hexToRgba(secondary, 0.10) +
        ", transparent 62%)," +
        "rgba(0,0,0,0.18)",
      backdropFilter: "blur(14px) saturate(140%)",
      WebkitBackdropFilter: "blur(14px) saturate(140%)",
    };
  }

  function buildIframeStyle(pos) {
    var m = 18;
    var safe = normalizePosition(pos);

    var s = {
      position: "fixed",
      zIndex: "1",
      border: "0",
      margin: "0",
      padding: "0",
      overflow: "hidden",
      background: "transparent",
      width: "0px",
      height: "0px",
      opacity: "0",
      borderRadius: "14px",
      boxShadow: "none",
      pointerEvents: "none",
      colorScheme: "normal",
      display: "block",
      transition:
        "width 220ms cubic-bezier(.2,.9,.2,1), height 220ms cubic-bezier(.2,.9,.2,1), opacity 160ms ease, border-radius 220ms cubic-bezier(.2,.9,.2,1), box-shadow 220ms ease, transform 220ms ease",
      transform: "translateZ(0)",
      top: "",
      right: "",
      bottom: "",
      left: "",
      transformOrigin: "100% 100%",
    };

    if (safe === "bl") {
      s.bottom = m + "px";
      s.left = m + "px";
      s.transformOrigin = "0% 100%";
    } else if (safe === "tr") {
      s.top = m + "px";
      s.right = m + "px";
      s.transformOrigin = "100% 0%";
    } else if (safe === "tl") {
      s.top = m + "px";
      s.left = m + "px";
      s.transformOrigin = "0% 0%";
    } else {
      s.bottom = m + "px";
      s.right = m + "px";
      s.transformOrigin = "100% 100%";
    }

    return s;
  }

  function buildLauncherStyle(pos, primary, secondary) {
    var m = 18;
    var safe = normalizePosition(pos);

    var s = {
      position: "fixed",
      zIndex: "2",
      width: "64px",
      height: "64px",
      border: "1px solid " + hexToRgba(primary, 0.30),
      borderRadius: "14px",
      margin: "0",
      padding: "0",
      overflow: "hidden",
      cursor: "pointer",
      pointerEvents: "auto",
      color: "white",
      display: "grid",
      placeItems: "center",
      opacity: "1",
      transform: "translateZ(0)",
      transition:
        "opacity 160ms ease, transform 180ms cubic-bezier(.2,.9,.2,1), border-color 160ms ease, box-shadow 160ms ease",
      background:
        "radial-gradient(circle at 30% 18%, rgba(255,255,255,.22), transparent 31%)," +
        "linear-gradient(135deg, " +
        hexToRgba(primary, 0.28) +
        ", " +
        hexToRgba(secondary, 0.16) +
        ")," +
        "rgba(4,7,12,.82)",
      boxShadow:
        "0 18px 44px rgba(0,0,0,.36), inset 0 1px 0 rgba(255,255,255,.15), inset 0 -1px 0 rgba(0,0,0,.34)",
      backdropFilter: "blur(12px) saturate(140%)",
      WebkitBackdropFilter: "blur(12px) saturate(140%)",
      top: "",
      right: "",
      bottom: "",
      left: "",
    };

    if (safe === "bl") {
      s.bottom = m + "px";
      s.left = m + "px";
    } else if (safe === "tr") {
      s.top = m + "px";
      s.right = m + "px";
    } else if (safe === "tl") {
      s.top = m + "px";
      s.left = m + "px";
    } else {
      s.bottom = m + "px";
      s.right = m + "px";
    }

    return s;
  }

  function setLauncherVisible(launcher, visible) {
    if (!launcher) return;

    launcher.style.opacity = visible ? "1" : "0";
    launcher.style.pointerEvents = visible ? "auto" : "none";
    launcher.style.transform = visible ? "translateZ(0)" : "translateY(6px) scale(.96)";
  }

  function openShadow(primary, secondary) {
    return (
      "0 24px 80px rgba(0,0,0,0.38), " +
      "0 0 0 1px rgba(255,255,255,0.11), " +
      "0 0 44px " +
      hexToRgba(primary, 0.14) +
      ", " +
      "0 0 54px " +
      hexToRgba(secondary, 0.12)
    );
  }

  function closedShadow() {
    return "0 24px 80px rgba(0,0,0,0.35)";
  }

  function clampSize(value, fallback, min, max) {
    var n = parseInt(String(value || "").replace("px", ""), 10);

    if (!Number.isFinite(n)) return fallback;

    return Math.max(min, Math.min(max, n));
  }

  function showBackdrop(backdrop) {
    if (!BOOT.backdrop) return;

    backdrop.style.pointerEvents = "auto";
    backdrop.style.opacity = "1";
  }

  function hideBackdrop(backdrop) {
    backdrop.style.opacity = "0";

    window.setTimeout(function () {
      backdrop.style.pointerEvents = "none";
    }, 200);
  }

  function resizeIframe(iframe, payload, primary, secondary) {
    var open = Boolean(payload && payload.open);

    if (!open) {
      iframe.dataset.lmnOpen = "false";
      iframe.style.width = "0px";
      iframe.style.height = "0px";
      iframe.style.opacity = "0";
      iframe.style.pointerEvents = "none";
      iframe.style.borderRadius = "14px";
      iframe.style.boxShadow = "none";
      return;
    }

    var requestedWidth = payload && payload.width ? payload.width : open ? "420px" : "64px";
    var requestedHeight = payload && payload.height ? payload.height : open ? "640px" : "64px";
    var requestedRadius = payload && payload.radius ? payload.radius : open ? "14px" : "18px";

    var maxW = Math.max(280, window.innerWidth - 16);
    var maxH = Math.max(360, window.innerHeight - 16);

    var width = clampSize(requestedWidth, open ? 420 : 64, 56, maxW);
    var height = clampSize(requestedHeight, open ? 640 : 64, 56, maxH);

    if (isMobile() && open) {
      width = Math.min(window.innerWidth - 12, width);
      height = Math.min(window.innerHeight - 12, height);
    }

    iframe.dataset.lmnOpen = open ? "true" : "false";
    iframe.style.width = width + "px";
    iframe.style.height = height + "px";
    iframe.style.opacity = "1";
    iframe.style.pointerEvents = "auto";
    iframe.style.borderRadius = requestedRadius;
    iframe.style.boxShadow = open ? openShadow(primary, secondary) : closedShadow();
  }

  function postToIframe(iframe, message) {
    try {
      iframe.contentWindow.postMessage(message, APP_ORIGIN);
    } catch (e) {
      try {
        iframe.contentWindow.postMessage(message, "*");
      } catch (_) {}
    }
  }

  function mount(cfg) {
    if (!getEnabled(cfg)) {
      return;
    }

    var pos = getPosition(cfg);
    var primary = pickPrimary(cfg);
    var secondary = pickSecondary(cfg, primary);

    var root = document.createElement("div");
    root.id = ROOT_ID;
    applyStyle(root, buildRootStyle(BOOT.zIndex));

    var backdrop = document.createElement("div");
    backdrop.id = BACKDROP_ID;
    applyStyle(backdrop, buildBackdropStyle(primary, secondary));

    var iframe = document.createElement("iframe");
    iframe.id = IFRAME_ID;
    iframe.src = buildWidgetUrl();
    iframe.title = "LumenAI Widget";
    iframe.allow = "microphone; clipboard-read; clipboard-write";
    iframe.setAttribute("loading", "eager");
    iframe.setAttribute("allowtransparency", "true");
    iframe.setAttribute("frameborder", "0");
    iframe.dataset.lmnOpen = "false";

    applyStyle(iframe, buildIframeStyle(pos));

    var launcher = document.createElement("button");
    launcher.id = LAUNCHER_ID;
    launcher.type = "button";
    launcher.setAttribute("aria-label", "Abrir chat de LumenAI");
    launcher.title = "Abrir chat de LumenAI";
    applyStyle(launcher, buildLauncherStyle(pos, primary, secondary));
    launcher.innerHTML =
      '<span style="width:50px;height:50px;border-radius:12px;display:grid;place-items:center;border:1px solid rgba(255,255,255,.13);background:linear-gradient(135deg,rgba(255,255,255,.10),rgba(255,255,255,.02)),rgba(2,5,10,.28);box-shadow:inset 0 1px 0 rgba(255,255,255,.13),0 0 24px ' +
      hexToRgba(primary, 0.18) +
      ';"><svg viewBox="0 0 28 28" width="29" height="29" fill="none" aria-hidden="true" style="display:block;color:rgba(255,255,255,.94);filter:drop-shadow(0 0 12px ' +
      hexToRgba(primary, 0.24) +
      ');"><path d="M7.8 18.9c-1.35-1.22-2.1-2.9-2.1-4.78 0-4.02 3.42-7.28 7.64-7.28 4.22 0 7.64 3.26 7.64 7.28 0 4.02-3.42 7.28-7.64 7.28-.86 0-1.7-.13-2.46-.4l-3.05 1.33.27-3.43Z" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round"/><path d="M10.35 13.9h.01M13.34 13.9h.01M16.33 13.9h.01" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M20.5 5.8 23 3.3M22.45 8.95h3.25M18.55 3.75V1.2" stroke="currentColor" stroke-width="1.45" stroke-linecap="round"/></svg></span>';

    root.appendChild(backdrop);
    root.appendChild(iframe);
    root.appendChild(launcher);

    function doMount() {
      if (!document.body) return;
      document.body.appendChild(root);
    }

    if (document.body) {
      doMount();
    } else {
      window.addEventListener("DOMContentLoaded", doMount, { once: true });
    }

    var parentOpen = false;
    var lastOpenAt = 0;

    function openWidget() {
      parentOpen = true;
      lastOpenAt = Date.now();
      setLauncherVisible(launcher, false);
      showBackdrop(backdrop);
      resizeIframe(
        iframe,
        {
          open: true,
          width: isMobile() ? window.innerWidth - 12 + "px" : "420px",
          height: isMobile() ? window.innerHeight - 12 + "px" : "640px",
          radius: "14px",
        },
        primary,
        secondary
      );
      postToIframe(iframe, {
        type: "LUMENAI_WIDGET_TOGGLE",
        open: true,
      });
    }

    function closeWidget() {
      parentOpen = false;
      setLauncherVisible(launcher, true);
      hideBackdrop(backdrop);
      postToIframe(iframe, {
        type: "LUMENAI_WIDGET_TOGGLE",
        open: false,
      });
      resizeIframe(iframe, { open: false }, primary, secondary);
    }

    function closeFromBackdrop() {
      closeWidget();
    }

    launcher.addEventListener("click", openWidget);
    backdrop.addEventListener("click", closeFromBackdrop);
    iframe.addEventListener("load", function () {
      if (parentOpen) {
        postToIframe(iframe, {
          type: "LUMENAI_WIDGET_TOGGLE",
          open: true,
        });
      }
    });

    function onResize() {
      var isOpen = iframe.dataset.lmnOpen === "true";

      resizeIframe(
        iframe,
        {
          open: isOpen,
          width: iframe.style.width || (isOpen ? "420px" : "64px"),
          height: iframe.style.height || (isOpen ? "640px" : "64px"),
          radius: iframe.style.borderRadius || (isOpen ? "14px" : "18px"),
        },
        primary,
        secondary
      );
    }

    function onMessage(event) {
      if (!event || event.origin !== APP_ORIGIN) return;

      var data = event.data || {};

      if (!data || typeof data !== "object") return;

      if (data.type === "LUMENAI_WIDGET_STATE") {
        if (!data.open && parentOpen && Date.now() - lastOpenAt < 700) {
          return;
        }

        if (data.open) {
          parentOpen = true;
          setLauncherVisible(launcher, false);
          showBackdrop(backdrop);
        } else {
          parentOpen = false;
          setLauncherVisible(launcher, true);
          hideBackdrop(backdrop);
        }

        resizeIframe(
          iframe,
          {
            open: Boolean(data.open),
            width: data.open ? iframe.style.width || "420px" : "64px",
            height: data.open ? iframe.style.height || "640px" : "64px",
            radius: data.open ? "14px" : "18px",
          },
          primary,
          secondary
        );

        return;
      }

      if (data.type === "LUMENAI_WIDGET_SIZE") {
        if (!data.open && parentOpen && Date.now() - lastOpenAt < 700) {
          return;
        }

        if (data.open) {
          parentOpen = true;
          setLauncherVisible(launcher, false);
          showBackdrop(backdrop);
        } else {
          parentOpen = false;
          setLauncherVisible(launcher, true);
          hideBackdrop(backdrop);
        }

        resizeIframe(iframe, data, primary, secondary);
      }
    }

    window.addEventListener("message", onMessage);
    window.addEventListener("resize", onResize);

    hideBackdrop(backdrop);

    window.LumenAIWidget = window.LumenAIWidget || {};

    window.LumenAIWidget.open = function () {
      openWidget();
    };

    window.LumenAIWidget.close = function () {
      closeWidget();
    };

    window.LumenAIWidget.toggle = function (open) {
      if (typeof open === "boolean") {
        if (open) openWidget();
        else closeWidget();
        return;
      }

      if (parentOpen) closeWidget();
      else openWidget();
    };

    window.LumenAIWidget.destroy = function () {
      try {
        window.removeEventListener("message", onMessage);
        window.removeEventListener("resize", onResize);
        root.remove();
      } catch (e) {}
    };

    window.LumenAIWidget.setPosition = function (newPos) {
      applyStyle(iframe, buildIframeStyle(normalizePosition(newPos)));
      applyStyle(launcher, buildLauncherStyle(normalizePosition(newPos), primary, secondary));
    };

    window.__LUMENAI_SET_POS__ = window.LumenAIWidget.setPosition;
  }

  function start() {
    var cfgUrl =
      BOOT.appUrl +
      "/api/widget/config?key=" +
      encodeURIComponent(BOOT.key) +
      (BOOT.preview ? "&preview=1" : "");

    fetch(cfgUrl, {
      method: "GET",
      cache: "no-store",
    })
      .then(function (r) {
        if (!r.ok) throw new Error("config fetch failed: " + r.status);
        return r.json();
      })
      .then(function (cfg) {
        mount(cfg);
      })
      .catch(function (e) {
        console.warn("[LumenAI] Config error, usando fallback.", e);

        mount({
          widgetEnabled: true,
          position: BOOT.position || "br",
          primary_color: "#00E5FF",
          gradient_to: "#1B43FF",
        });
      });
  }

  start();
})();
