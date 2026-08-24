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
    this.game = null;          // set by Game once it exists

    const resume = document.getElementById('pause-resume');
    if (resume) resume.onclick = () => this.close();
    const restart = document.getElementById('pause-restart');
    if (restart) restart.onclick = () => { this.close(); this.game?.restart(); };
    const abandon = document.getElementById('pause-abandon');
    if (abandon) abandon.onclick = () => { this.game?.abandon(); };
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
    this.editor.focusFirst();
  }

  /** Called every rendered frame while paused, so a pad can drive the menu. */
  update(dt) {
    if (!World.paused || !this.editor) return;
    if (this.editor.handleGamepad(dt) === 'close') this.close();
  }

  close() {
    World.paused = false;
    Input.clearAll();
    this.el.classList.add('hidden');
  }
}
