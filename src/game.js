/**
 * The app state machine, and the only owner of "what is happening right now".
 *
 *   BOOT → TITLE → RUN_SETUP → RUN ⇄ PAUSE → DEATH → RESULTS → TITLE
 *
 * Input routes by state: menus consume it, RUN forwards it to the player,
 * PAUSE freezes the sim but not the settings UI. Nothing outside this file
 * decides what state the game is in.
 */
import { TUNING } from './tuning.js';
import { World } from './world.js';
import { Input } from './input.js';
import { Profile } from './profile.js';
import { board } from './board.js';
import { Run, MODES, dailySeed } from './run.js';
import { TitleScreen, SetupScreen, DeathScreen, ResultsScreen, SettingsScreen } from './screens.js';

export const STATE = {
  BOOT: 'BOOT',
  TITLE: 'TITLE',
  RUN_SETUP: 'RUN_SETUP',
  RUN: 'RUN',
  PAUSE: 'PAUSE',
  DEATH: 'DEATH',
  RESULTS: 'RESULTS',
  SETTINGS: 'SETTINGS',
};

export class Game {
  constructor(deps) {
    this.scene = deps.scene;
    this.player = deps.player;
    this.camRig = deps.camRig;
    this.pauseMenu = deps.pauseMenu;
    this.hud = deps.hud;
    this.version = deps.version;

    this.state = STATE.BOOT;
    this.run = null;
    // gate instrumentation
    this.bootAt = performance.now();
    this.timeToCombatMs = null;
    this.lastDeathAt = null;
    this.lastRestartMs = null;
    this.freeSeed = '';
    this.deathTimer = 0;
    this.pendingSummary = null;
    // finishRun awaits the board; without this guard the DEATH branch
    // re-enters it every frame until the await resolves
    this.finishing = false;

    this.screens = {
      [STATE.TITLE]: new TitleScreen(this),
      [STATE.RUN_SETUP]: new SetupScreen(this),
      [STATE.DEATH]: new DeathScreen(this),
      [STATE.RESULTS]: new ResultsScreen(this),
      [STATE.SETTINGS]: new SettingsScreen(this),
    };

    window.addEventListener('keydown', (e) => {
      const target = this.state === STATE.PAUSE ? this.pauseMenu : this.screens[this.state];
      if (target && target.handleKey && target.handleKey(e)) e.preventDefault();
    });
  }

  // ------------------------------------------------------------ transitions

  setState(next) {
    if (this.state === next) return;
    const prev = this.state;
    const prevScreen = this.screens[prev];
    if (prevScreen) prevScreen.hide();
    this.state = next;
    document.body.dataset.state = next;
    const nextScreen = this.screens[next];
    if (nextScreen && next !== STATE.RESULTS) nextScreen.show();
    if (next === STATE.RUN) {
      if (this.timeToCombatMs === null) this.timeToCombatMs = performance.now() - this.bootAt;
      if (this.lastDeathAt !== null) {
        this.lastRestartMs = performance.now() - this.lastDeathAt;
        this.lastDeathAt = null;
      }
    }
    return prev;
  }

  /** In RUN and PAUSE the combat HUD is visible; everywhere else it is not. */
  get inRun() { return this.state === STATE.RUN || this.state === STATE.PAUSE; }

  boot() {
    Profile.load();
    // First boot goes straight into the game rather than parking on a menu.
    if (!Profile.data.tutorialSeen) {
      Profile.setTutorialSeen(true);
      this.startRun(Profile.data.lastMode || 'daily');
    } else {
      this.toTitle();
    }
  }

  toTitle() {
    this.endRunIfAny('abandoned', false);
    this.setState(STATE.TITLE);
  }

  toSetup() { this.setState(STATE.RUN_SETUP); }

  openSettings() { this.setState(STATE.SETTINGS); }

  seedFor(mode) {
    const day = Profile.today();
    if (mode === 'daily') return dailySeed(day);
    if (this.freeSeed) return this.freeSeed;
    return `${mode}-${Math.floor(Math.random() * 1e9).toString(36)}`;
  }

  /** Tear down the old run and start a fresh one. This is the restart path. */
  startRun(mode) {
    const id = MODES[mode] ? mode : 'daily';
    this.endRunIfAny('abandoned', false);

    const day = Profile.today();
    this.run = new Run({
      mode: id,
      seed: this.seedFor(id),
      day,
      scene: this.scene,
      player: this.player,
    }).install();

    Profile.setLastMode(id);
    this.setState(STATE.RUN);
  }

  /** Dispose the current run without going to RESULTS. */
  endRunIfAny(reason) {
    if (!this.run) return;
    this.run.dispose();
    this.run = null;
  }

  restart() {
    const mode = this.run ? this.run.mode : (Profile.data.lastMode || 'daily');
    this.startRun(mode);
  }

  togglePause() {
    if (this.state === STATE.RUN) {
      this.setState(STATE.PAUSE);
      this.pauseMenu.open();
    } else if (this.state === STATE.PAUSE) {
      this.pauseMenu.close();
      this.setState(STATE.RUN);
    }
  }

  abandon() {
    if (!this.run) { this.toTitle(); return; }
    this.pauseMenu.close();
    this.run.abandon();
    this.finishRun();
  }

  onPlayerDied() {
    if (this.state !== STATE.RUN) return;
    this.deathTimer = 0;
    this.lastDeathAt = performance.now();
    this.setState(STATE.DEATH);
  }

  /** DEATH → RESULTS: gather the summary, record the best, submit to the board. */
  async finishRun() {
    if (this.finishing) return;
    if (!this.run) { this.toTitle(); return; }
    this.finishing = true;
    const run = this.run;
    const summary = run.summary();
    summary.version = this.version;

    if (run.mode !== 'kata') {
      try {
        summary.pb = Profile.submit(run.mode, run.day, {
        score: summary.score, wave: summary.wave, seed: summary.seed,
          version: this.version, runHash: summary.runHash, at: Date.now(),
        });
      } catch (e) { /* a full quota must never block RESULTS */ }
      try {
        await board.submit({
          name: Profile.data.name, score: summary.score, wave: summary.wave,
          seed: summary.seed, mode: run.mode, day: run.day,
          version: this.version, runHash: summary.runHash,
        });
      } catch (e) { /* a board failure must never block RESULTS */ }
    }

    this.pendingSummary = summary;
    const record = run.record;

    // dispose the run only after the summary and record have been taken
    this.run = null;
    run.dispose();

    this.setState(STATE.RESULTS);
    try {
      await this.screens[STATE.RESULTS].show(summary, record);
    } finally {
      this.finishing = false;
    }
  }

  // ----------------------------------------------------------------- update

  /** Per rendered frame. Returns whether the sim should step this frame. */
  update(realDt) {
    // pause is bindable and works in RUN and PAUSE only
    if (Input.pauseToggleRequested) {
      Input.pauseToggleRequested = false;
      if (this.inRun) this.togglePause();
      else if (this.state === STATE.RESULTS || this.state === STATE.RUN_SETUP ||
               this.state === STATE.SETTINGS) this.toTitle();
    }

    switch (this.state) {
      case STATE.DEATH: {
        this.deathTimer += realDt;
        const R = TUNING.run;
        // skippable: any action button cuts the beat short, so a player who
        // already knows they died is never made to watch it
        const skipped = Input.peek('light') || Input.peek('heavy') ||
          Input.peek('launcher') || Input.peek('jump') || Input.peek('dash');
        if (skipped) Input.clearAll();
        if (skipped || this.deathTimer >= R.deathSilence + R.deathBannerHold) {
          this.finishRun();
        }
        break;
      }
      case STATE.PAUSE:
        this.pauseMenu.update(realDt);
        // the pause menu closing itself (B on the pad) resumes the run
        if (!World.paused) this.setState(STATE.RUN);
        break;
      default: {
        const s = this.screens[this.state];
        if (s && s.update) s.update(realDt);
        break;
      }
    }

    return this.state === STATE.RUN;
  }

  /** One fixed sim step, only while running. */
  simStep(dt) {
    if (!this.run) return;
    this.run.update(dt);
    if (this.run.over && this.state === STATE.RUN) this.onPlayerDied();
  }
}
