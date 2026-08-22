/**
 * Pause menu (Esc). Freezes the sim and hosts the same settings editor the
 * debug overlay uses — so tuning is reachable without the developer overlay.
 */
import { World } from './world.js';
import { Input, ACTIONS } from './input.js';
import { SettingsEditor } from './settings.js';

export class PauseMenu {
  constructor() {
    this.el = document.getElementById('pause-menu');
    this.body = document.getElementById('pause-body');
    this.editor = null;

    const resume = document.getElementById('pause-resume');
    if (resume) resume.onclick = () => this.close();
    // clicking the backdrop resumes; clicking the panel must not
    this.el.addEventListener('mousedown', (e) => {
      if (e.target === this.el) this.close();
    });
  }

  toggle() { (World.paused ? this.close() : this.open()); }

  open() {
    World.paused = true;
    // nothing pressed before or during the pause should fire on resume
    Input.clearAll();
    for (const a of ACTIONS) Input.release(a);
    Input.move.x = 0; Input.move.y = 0;
    this.el.classList.remove('hidden');
    if (!this.editor) this.editor = new SettingsEditor(this.body);
    else this.editor.refresh();
  }

  close() {
    World.paused = false;
    Input.clearAll();
    this.el.classList.add('hidden');
  }
}
