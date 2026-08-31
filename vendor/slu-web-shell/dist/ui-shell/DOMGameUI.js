import { defaultUITheme } from "./types.js";
export class DOMGameUI {
    options;
    screens = new Map();
    active = null;
    focusIndex = 0;
    theme;
    frameHandle = 0;
    constructor(options) {
        this.options = options;
        this.theme = { ...defaultUITheme, ...options.theme };
        this.injectStyles();
    }
    register(models) {
        for (const model of models)
            this.screens.set(model.id, structuredClone(model));
    }
    show(id) {
        const model = this.screens.get(id);
        if (!model)
            throw new Error(`Unknown UI screen: ${id}`);
        this.active = structuredClone(model);
        this.focusIndex = 0;
        this.render();
    }
    updateScreen(id, patch) {
        const current = this.screens.get(id);
        if (!current)
            throw new Error(`Unknown UI screen: ${id}`);
        this.screens.set(id, { ...current, ...structuredClone(patch) });
        if (this.active?.id === id)
            this.show(id);
    }
    startInputLoop() {
        if (!this.options.input || this.frameHandle)
            return;
        const tick = () => {
            const input = this.options.input;
            if (input.wasPressed("ui_down"))
                this.move(1);
            if (input.wasPressed("ui_up"))
                this.move(-1);
            if (input.wasPressed("ui_accept"))
                this.activateFocused();
            if (input.wasPressed("ui_back"))
                this.back();
            this.frameHandle = requestAnimationFrame(tick);
        };
        this.frameHandle = requestAnimationFrame(tick);
    }
    stopInputLoop() {
        if (this.frameHandle)
            cancelAnimationFrame(this.frameHandle);
        this.frameHandle = 0;
    }
    move(delta) {
        const enabled = this.enabledChoices();
        if (!enabled.length)
            return;
        this.focusIndex = (this.focusIndex + delta + enabled.length) % enabled.length;
        this.applyFocus();
    }
    activateFocused() {
        const enabled = this.enabledChoices();
        const choice = enabled[this.focusIndex];
        if (choice && this.active)
            this.options.onActivate?.(this.active.id, choice.dataset.choiceId);
    }
    back() {
        if (!this.active)
            return;
        this.options.onBack?.(this.active.id);
    }
    enabledChoices() {
        return [...this.options.root.querySelectorAll("[data-choice-id]:not(:disabled)")];
    }
    applyFocus() {
        const buttons = this.enabledChoices();
        buttons.forEach((button, i) => {
            button.dataset.focused = String(i === this.focusIndex);
            if (i === this.focusIndex)
                button.focus({ preventScroll: true });
        });
    }
    render() {
        const model = this.active;
        if (!model)
            return;
        const choices = (model.choices ?? []).map((choice) => `
      <button class="slu-choice" data-choice-id="${this.escape(choice.id)}" ${choice.disabled ? "disabled" : ""}>
        <span class="slu-choice-label">${this.escape(choice.label)}</span>
        ${choice.description ? `<span class="slu-choice-desc">${this.escape(choice.description)}</span>` : ""}
      </button>
    `).join("");
        this.options.root.innerHTML = `
      <section class="slu-screen" data-screen-id="${this.escape(model.id)}">
        <div class="slu-panel">
          <header class="slu-header">
            <h1>${this.escape(model.title)}</h1>
            ${model.subtitle ? `<p>${this.escape(model.subtitle)}</p>` : ""}
          </header>
          <div class="slu-choices">${choices}</div>
          ${model.backTarget !== undefined ? `<button class="slu-back" data-back>Back</button>` : ""}
        </div>
      </section>
    `;
        this.options.root.querySelectorAll("[data-choice-id]").forEach((button) => {
            button.addEventListener("click", () => {
                if (this.active)
                    this.options.onActivate?.(this.active.id, button.dataset.choiceId);
            });
        });
        this.options.root.querySelector("[data-back]")?.addEventListener("click", () => this.back());
        this.applyFocus();
    }
    injectStyles() {
        if (document.getElementById("slu-ui-shell-styles"))
            return;
        const style = document.createElement("style");
        style.id = "slu-ui-shell-styles";
        style.textContent = `
      :root { color-scheme: dark; }
      .slu-screen {
        position: fixed; inset: 0; display: grid; place-items: center;
        font-family: ${this.theme.fontFamily}; z-index: 1000;
        background: radial-gradient(circle at 50% 20%, rgba(255,255,255,.07), rgba(0,0,0,.78));
        color: white; padding: 24px; box-sizing: border-box;
      }
      .slu-panel {
        width: min(100%, ${this.theme.maxWidth}px); max-height: 90vh; overflow: auto;
        background: rgba(15,15,20,${this.theme.panelOpacity}); backdrop-filter: blur(18px);
        border: 1px solid rgba(255,255,255,.12); border-radius: ${this.theme.radius}px;
        padding: clamp(22px, 4vw, 48px); box-sizing: border-box;
        box-shadow: 0 30px 90px rgba(0,0,0,.35);
      }
      .slu-header h1 { font-size: clamp(32px, 7vw, 72px); margin: 0 0 8px; letter-spacing: -.04em; }
      .slu-header p { margin: 0 0 30px; opacity: .72; font-size: 17px; }
      .slu-choices { display: grid; gap: 10px; }
      .slu-choice, .slu-back {
        appearance: none; width: 100%; text-align: left; padding: 16px 18px;
        border-radius: 10px; border: 1px solid rgba(255,255,255,.10);
        background: rgba(255,255,255,.04); color: white; cursor: pointer;
        transition: transform .12s ease, background .12s ease, border-color .12s ease;
      }
      .slu-choice:hover, .slu-choice[data-focused="true"], .slu-choice:focus-visible {
        outline: none; transform: translateX(6px); background: rgba(255,255,255,.12);
        border-color: rgba(255,255,255,.36);
      }
      .slu-choice:disabled { opacity: .35; cursor: not-allowed; }
      .slu-choice-label { display: block; font-size: 18px; font-weight: 750; }
      .slu-choice-desc { display: block; opacity: .58; margin-top: 4px; }
      .slu-back { margin-top: 22px; width: auto; opacity: .72; }
    `;
        document.head.appendChild(style);
    }
    escape(value) {
        return value.replace(/[&<>"']/g, (ch) => ({
            "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
        }[ch]));
    }
}
