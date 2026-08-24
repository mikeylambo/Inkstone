/**
 * The app state machine, and the only owner of "what is happening right now".
 *
 *   BOOT → TITLE
 *   TITLE → PLAY_SELECT | INKSTONE | ARCHIVE | OPTIONS | CREDITS
 *   PLAY_SELECT → SCROLL_SELECT | RUN_SETUP (kata / daily)
 *   RUN ⇄ PAUSE → DEATH | MISSION_CLEAR → RESULTS → (Again | PLAY_SELECT | TITLE)
 *
 * Reserved states are real states with real screens rather than menu entries
 * that go nowhere: PILGRIMAGE and WAVE_CHOICE both route somewhere walkable,
 * so the whole tree can be driven on a pad today and filling a slot later is
 * a content change rather than a navigation change.
 *
 * Input routes by state: menus consume it, RUN forwards it to the player,
 * PAUSE freezes the sim but not the menu. Nothing outside this file decides
 * what state the game is in.
 */
import { TUNING } from './tuning.js';
import { World } from './world.js';
import { Input } from './input.js';
import { Profile } from './profile.js';
import { board } from './board.js';
import { Run, MODES, dailySeed } from './run.js';
import { scrollById } from './scrolls.js';
import { TitleScreen, SetupScreen, DeathScreen, ResultsScreen, DevTuningScreen } from './screens.js';
import { PlaySelectScreen, ScrollSelectScreen, WaveChoiceScreen } from './ui/play.js';
import { InkstoneScreen, ArchiveScreen, OptionsScreen, CreditsScreen, PlaceholderScreen } from './ui/meta.js';

export const STATE = {
  BOOT: 'BOOT',
  TITLE: 'TITLE',
  PLAY_SELECT: 'PLAY_SELECT',
  SCROLL_SELECT: 'SCROLL_SELECT',
  RUN_SETUP: 'RUN_SETUP',
  RUN: 'RUN',
  PAUSE: 'PAUSE',
  WAVE_CHOICE: 'WAVE_CHOICE',
  DEATH: 'DEATH',
  MISSION_CLEAR: 'MISSION_CLEAR',
  RESULTS: 'RESULTS',
  INKSTONE: 'INKSTONE',
  ARCHIVE: 'ARCHIVE',
  OPTIONS: 'OPTIONS',
  CREDITS: 'CREDITS',
  DEV_TUNING: 'DEV_TUNING',
  /** Reserved. Routes to a styled placeholder; nothing enters it yet. */
  PILGRIMAGE: 'PILGRIMAGE',
};

/** `?dev=1` unlocks the raw tuning editor. Players never see it. */
export function devMode() {
  try { return new URLSearchParams(location.search).get('dev') === '1'; }
  catch (e) { return false; }
}

export class Game {
  constructor(deps) {
    this.scene = deps.scene;
    this.player = deps.player;
    this.camRig = deps.camRig;
    this.pauseMenu = deps.pauseMenu;
    this.hud = deps.hud;
    this.version = deps.version;
    this.dev = devMode();

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
    /** Where OPTIONS should return to — it is reachable from three places. */
    this.optionsReturn = STATE.TITLE;

    this.screens = {
      [STATE.TITLE]: new TitleScreen(this),
      [STATE.PLAY_SELECT]: new PlaySelectScreen(this),
      [STATE.SCROLL_SELECT]: new ScrollSelectScreen(this),
      [STATE.RUN_SETUP]: new SetupScreen(this),
      [STATE.WAVE_CHOICE]: new WaveChoiceScreen(this),
      [STATE.DEATH]: new DeathScreen(this),
      [STATE.RESULTS]: new ResultsScreen(this),
      [STATE.INKSTONE]: new InkstoneScreen(this),
      [STATE.ARCHIVE]: new ArchiveScreen(this),
      [STATE.OPTIONS]: new OptionsScreen(this),
      [STATE.CREDITS]: new CreditsScreen(this),
      [STATE.PILGRIMAGE]: new PlaceholderScreen(this, 'screen-pilgrimage', 'PILGRIMAGE',
        'The long road, and the other half of what this game is for. Not yet walked.'),
    };
    // The tuning editor is only constructed in dev, so a player's build does
    // not even build the DOM for it.
    if (this.dev) this.screens[STATE.DEV_TUNING] = new DevTuningScreen(this);

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
    // RESULTS is shown by finishRun with its summary; everything else is
    // self-sufficient at show() time.
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

  /** In RUN, PAUSE and WAVE_CHOICE the combat HUD is visible. */
  get inRun() {
    return this.state === STATE.RUN || this.state === STATE.PAUSE ||
      this.state === STATE.WAVE_CHOICE;
  }

  boot() {
    Profile.load();
    // First boot asks the three accessibility questions that are painful to
    // discover after the fact, then goes straight into the game rather than
    // parking on a menu.
    if (!Profile.data.tutorialSeen) {
      Profile.setTutorialSeen(true);
      if (!Profile.data.accessibilitySeen) {
        this.toOptions(STATE.TITLE, { essentials: true });
        return;
      }
      this.startRun(Profile.data.lastMode || 'daily');
    } else {
      this.toTitle();
    }
  }

  // ------------------------------------------------------------- navigation

  toTitle() {
    this.endRunIfAny('abandoned', false);
    this.setState(STATE.TITLE);
  }

  toPlaySelect() {
    this.endRunIfAny('abandoned', false);
    this.setState(STATE.PLAY_SELECT);
  }

  toScrollSelect() { this.setState(STATE.SCROLL_SELECT); }
  toPilgrimage() { this.setState(STATE.PILGRIMAGE); }
  toInkstone() { this.setState(STATE.INKSTONE); }
  toArchive() { this.setState(STATE.ARCHIVE); }
  toCredits() { this.setState(STATE.CREDITS); }

  /** RUN_SETUP is the confirm step for the two modes that are not scrolls. */
  toRunSetup(mode) {
    this.screens[STATE.RUN_SETUP].setMode(mode);
    this.setState(STATE.RUN_SETUP);
  }

  /**
   * OPTIONS is reachable from TITLE, from PAUSE and from the dev screen, so it
   * remembers where it came from rather than always dumping you at the title.
   */
  toOptions(returnTo = null, opts = {}) {
    this.optionsReturn = returnTo || (this.state === STATE.BOOT ? STATE.TITLE : this.state);
    if (opts.essentials) Profile.setAccessibilitySeen(true);
    this.setState(STATE.OPTIONS);
  }

  backFromOptions() {
    const back = this.optionsReturn;
    this.optionsReturn = STATE.TITLE;
    if (back === STATE.PAUSE || back === STATE.RUN) { this.setState(STATE.TITLE); return; }
    this.setState(back && this.screens[back] ? back : STATE.TITLE);
  }

  /** Dev only. Silently does nothing in a player build. */
  toDevTuning() {
    if (!this.dev) return;
    this.setState(STATE.DEV_TUNING);
  }

  // ------------------------------------------------------------------- runs

  seedFor(mode) {
    const day = Profile.today();
    if (mode === 'daily') return dailySeed(day);
    if (this.freeSeed) return this.freeSeed;
    return `${mode}-${Math.floor(Math.random() * 1e9).toString(36)}`;
  }

  /** Tear down the old run and start a fresh one. This is the restart path. */
  startRun(mode, opts = {}) {
    const id = MODES[mode] ? mode : 'daily';
    this.endRunIfAny('abandoned', false);

    const day = Profile.today();
    this.run = new Run({
      mode: id,
      seed: opts.seed || this.seedFor(id),
      day,
      scene: this.scene,
      player: this.player,
      version: this.version,
      scroll: opts.scroll || null,
      difficulty: TUNING.difficulty.current,
      modifiers: opts.modifiers || [],
    });
    if (opts.scrollLabel) this.run.config.scrollLabel = opts.scrollLabel;
    this.run.install();

    Profile.setLastMode(id);
    if (opts.scroll) Profile.setLastScroll(opts.scroll);
    this.setState(STATE.RUN);
  }

  /** Start a scroll by id. Free Seed passes the typed seed through. */
  startScroll(id) {
    const s = scrollById(id);
    if (!s || !s.inked || !s.mode) return;
    this.startRun(s.mode, {
      scroll: s.id,
      scrollLabel: s.label,
      seed: s.seedEntry ? (this.freeSeed || undefined) : undefined,
    });
  }

  /** RESULTS "AGAIN" — same scroll if it was one, same mode otherwise. */
  again(summary) {
    if (summary && summary.scroll) this.startScroll(summary.scroll);
    else this.startRun(summary ? summary.mode : (Profile.data.lastMode || 'daily'));
  }

  /** Dispose the current run without going to RESULTS. */
  endRunIfAny(reason) {
    if (!this.run) return;
    this.run.dispose();
    this.run = null;
  }

  restart() {
    if (!this.run) { this.startRun(Profile.data.lastMode || 'daily'); return; }
    const { mode, config } = this.run;
    if (config.scroll) this.startScroll(config.scroll);
    else this.startRun(mode);
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

  /** PAUSE → back to the scroll list, ending the run as abandoned. */
  returnToScrolls() {
    this.pauseMenu.close();
    this.endRunIfAny('abandoned', false);
    this.setState(STATE.PLAY_SELECT);
  }

  onPlayerDied() {
    if (this.state !== STATE.RUN) return;
    this.deathTimer = 0;
    this.lastDeathAt = performance.now();
    this.setState(STATE.DEATH);
  }

  // ------------------------------------------------------------ wave choice

  /** Raised by the sim when a run parks in `choosing`. */
  openWaveChoice(offers) {
    if (this.state !== STATE.RUN) return;
    World.paused = true;
    this.screens[STATE.WAVE_CHOICE].setOffers(offers);
    this.setState(STATE.WAVE_CHOICE);
  }

  resolveWaveChoice(offer) {
    if (this.state !== STATE.WAVE_CHOICE) return;
    World.paused = false;
    if (this.run) this.run.applyWaveChoice(offer);
    this.setState(STATE.RUN);
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
          timeSeconds: summary.timeSeconds, rank: summary.rank?.grade,
          version: this.version, runHash: summary.runHash, at: Date.now(),
        }, run.config.scroll);
      } catch (e) { /* a full quota must never block RESULTS */ }
      try {
        await board.submit({
          name: Profile.data.name, score: summary.score, wave: summary.wave,
          seed: summary.seed, mode: run.mode, day: run.day,
          scroll: run.config.scroll, modifiers: run.config.modifiers,
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
      if (this.state === STATE.RUN || this.state === STATE.PAUSE) this.togglePause();
      else if (this.state !== STATE.WAVE_CHOICE && this.state !== STATE.DEATH &&
               this.state !== STATE.TITLE) this.toTitle();
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
    if (this.run.pendingChoice) {
      this.openWaveChoice(this.run.pendingChoice);
      return;
    }
    if (this.run.over && this.state === STATE.RUN) this.onPlayerDied();
  }
}
