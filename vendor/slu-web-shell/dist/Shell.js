import { EventBus } from "./core/EventBus.js";
import { GameSession } from "./core/GameSession.js";
import { InputManager } from "./input/InputManager.js";
import { ModeManager } from "./game/Modes.js";
import { ObjectiveManager } from "./game/Objectives.js";
import { ChallengeManager } from "./game/Challenges.js";
import { DifficultyManager } from "./game/Difficulty.js";
import { RewardManager } from "./game/Rewards.js";
import { UnlockManager } from "./game/UnlockManager.js";
import { StatsManager } from "./game/StatsManager.js";
import { ContentRegistry } from "./content/ContentRegistry.js";
export class SLUWebShell {
    options;
    events = new EventBus();
    session = new GameSession();
    input = new InputManager();
    modes = new ModeManager();
    objectives = new ObjectiveManager();
    challenges = new ChallengeManager();
    difficulty = new DifficultyManager();
    rewards = new RewardManager();
    unlocks;
    stats;
    content = new ContentRegistry();
    constructor(options) {
        this.options = options;
        this.unlocks = options.unlocks ?? new UnlockManager();
        this.stats = options.stats ?? new StatsManager();
    }
    get build() { return this.options.build; }
    get renderer() { return this.options.renderer; }
    get settings() { return this.options.settings; }
    async boot() { this.session.start(); this.session.setPhase("title"); await this.renderer.start?.(); }
    pause() { this.session.pause(); this.renderer.suspend?.(); this.events.emit("game:pause", undefined); }
    resume() { this.session.resume(); this.renderer.resume?.(); this.events.emit("game:resume", undefined); }
    async loadLevel(id, payload) { this.session.setPhase("loading"); this.events.emit("level:load", { id, payload }); await this.renderer.loadLevel?.(id, payload); this.session.setPhase("playing"); this.events.emit("level:loaded", { id }); }
    restart() { this.events.emit("game:restart", undefined); }
    quit() { this.events.emit("game:quit", undefined); this.session.setPhase("menu"); }
}
