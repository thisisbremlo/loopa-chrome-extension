(function () {
  const ROOT_ID = "loopa-archive-root";

  const existing = document.getElementById(ROOT_ID);
  if (existing) {
    existing.remove();
    return;
  }

  const api = globalThis.browser ?? globalThis.chrome;
  const archiveUrl = `${api.runtime.getURL("archive/archive.html")}?embed=1`;

  const host = document.createElement("div");
  host.id = ROOT_ID;

  const shadow = host.attachShadow({ mode: "closed" });
  shadow.innerHTML = `
    <style>
      :host { all: initial; }
      .backdrop {
        position: fixed;
        inset: 0;
        z-index: 2147483646;
        background: rgba(0, 0, 0, 0.55);
        backdrop-filter: blur(6px);
      }
      .panel {
        position: fixed;
        top: 16px;
        right: 16px;
        z-index: 2147483647;
        width: min(540px, calc(100vw - 32px));
        height: min(780px, calc(100vh - 32px));
        border-radius: 16px;
        border: 1px solid rgba(255, 255, 255, 0.06);
        box-shadow: 0 24px 80px rgba(0, 0, 0, 0.6);
        overflow: hidden;
        background: #0c0c0c;
      }
      iframe {
        width: 100%;
        height: 100%;
        border: 0;
        display: block;
        background: #0c0c0c;
      }
      @media (max-width: 480px) {
        .panel {
          top: 0;
          right: 0;
          width: 100vw;
          height: 100vh;
          border-radius: 0;
          border: none;
        }
      }
    </style>
    <div class="backdrop" aria-hidden="true"></div>
    <div class="panel" role="dialog" aria-label="Loopa">
      <iframe src="${archiveUrl}" title="Loopa"></iframe>
    </div>
  `;

  shadow.querySelector(".backdrop").addEventListener("click", () => host.remove());

  function onKey(e) {
    if (e.key === "Escape" && document.getElementById(ROOT_ID)) {
      host.remove();
      document.removeEventListener("keydown", onKey);
    }
  }
  document.addEventListener("keydown", onKey);

  function onMessage(event) {
    if (event.data?.type === "loopa-archive-close") {
      host.remove();
      window.removeEventListener("message", onMessage);
    }
  }
  window.addEventListener("message", onMessage);

  document.documentElement.appendChild(host);
})();
