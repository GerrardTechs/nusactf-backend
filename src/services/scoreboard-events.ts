import { EventEmitter } from "node:events";
import type { ScoreboardEntry } from "../types/index.js";

export interface ScoreboardUpdateEvent {
  scoreboard: ScoreboardEntry[];
  triggeredByUserId?: string;
  challengeId?: string;
}

class ScoreboardEventBus extends EventEmitter {
  emitUpdate(payload: ScoreboardUpdateEvent): void {
    this.emit("scoreboard:update", payload);
  }

  onUpdate(listener: (payload: ScoreboardUpdateEvent) => void): () => void {
    this.on("scoreboard:update", listener);
    return () => this.off("scoreboard:update", listener);
  }
}

export const scoreboardEvents = new ScoreboardEventBus();
