import Phaser from "phaser";
import { DESIGN_SIZE } from "../render/pixelRatio";
import { ensureCreatureTextures } from "../creatures/sprites";
import { resolveCreaturePoseTexture } from "../creatures/creaturePoses";
import { getCreatureDefinition } from "../creatures/catalog";
import { fitDisplay } from "../render/displaySizes";
import {
  WARD_COLUMNS,
  WARD_LANES,
  WARD_MAX_DEPLOY_COLUMN,
  createWardState,
  deployDefender,
  livingPartyForWard,
  stepWard,
} from "../minigames/wardCrossing";
import {
  MINIGAME_TEXT,
  addMinigameButton,
  bindMinigameQuit,
  bootMinigameOverlay,
  closeMinigameOverlay,
  resolveMinigameEnd,
} from "../minigames/overlay";

const CELL = 78;
const GRID_LEFT = 70;
const GRID_TOP = 88;

export class WardCrossingScene extends Phaser.Scene {
  private state = createWardState();
  private selectedId: string | null = null;
  private statusText!: Phaser.GameObjects.Text;
  private board = new Map<string, Phaser.GameObjects.GameObject[]>();
  private bench: Phaser.GameObjects.GameObject[] = [];
  private closing = { current: false };
  private ticker?: Phaser.Time.TimerEvent;

  constructor() {
    super({ key: "WardCrossingScene" });
  }

  create(): void {
    bootMinigameOverlay(this);
    ensureCreatureTextures(this);
    this.closing = { current: false };
    this.state = createWardState();
    this.selectedId = null;

    this.add
      .text(24, 22, "Ward the Crossing", {
        ...MINIGAME_TEXT,
        color: "#fff8ec",
        fontSize: "22px",
        fontStyle: "bold",
      })
      .setOrigin(0, 0);

    this.statusText = this.add
      .text(24, 52, "Place companions on the left. Hold the right.", {
        ...MINIGAME_TEXT,
        color: "#e8d8c0",
        fontSize: "15px",
        wordWrap: { width: DESIGN_SIZE - 120, useAdvancedWrap: true },
      })
      .setOrigin(0, 0);

    bindMinigameQuit(this, () => this.quit());
    this.drawGrid();
    this.drawBench();
    this.ticker = this.time.addEvent({
      delay: 750,
      loop: true,
      callback: () => this.tick(),
    });
  }

  private cellKey(lane: number, column: number): string {
    return `${lane}:${column}`;
  }

  private cellCenter(lane: number, column: number): { x: number; y: number } {
    return {
      x: GRID_LEFT + column * CELL + CELL / 2,
      y: GRID_TOP + lane * CELL + CELL / 2,
    };
  }

  private drawGrid(): void {
    for (const objects of this.board.values()) {
      for (const object of objects) {
        object.destroy();
      }
    }
    this.board.clear();

    for (let lane = 0; lane < WARD_LANES; lane += 1) {
      for (let column = 0; column < WARD_COLUMNS; column += 1) {
        const { x, y } = this.cellCenter(lane, column);
        const home = column === 0;
        const spawn = column === WARD_COLUMNS - 1;
        const cell = this.add
          .rectangle(
            x,
            y,
            CELL - 8,
            CELL - 8,
            home ? 0x6a4a28 : spawn ? 0x4a3038 : 0x3a4a58,
            0.92,
          )
          .setStrokeStyle(2, 0xd8a05c);
        if (column <= WARD_MAX_DEPLOY_COLUMN) {
          cell.setInteractive({ useHandCursor: true });
          cell.on("pointerdown", () => this.tryDeploy(lane, column));
        }
        const objects: Phaser.GameObjects.GameObject[] = [cell];
        const unit =
          this.state.defenders.find(
            (entry) => entry.lane === lane && entry.column === column,
          ) ??
          this.state.invaders.find(
            (entry) => entry.lane === lane && entry.column === column,
          );
        if (unit) {
          const pose = resolveCreaturePoseTexture(
            this,
            getCreatureDefinition(unit.definitionId).spriteKey,
            "idle",
          );
          const sprite = this.add.image(x, y + 6, ...pose).setOrigin(0.5, 1);
          fitDisplay(sprite, { width: 42, height: 46 });
          const hp = this.add
            .text(x, y + CELL / 2 - 14, `${unit.hp}`, {
              ...MINIGAME_TEXT,
              color: "#fff8ec",
              fontSize: "12px",
              fontStyle: "bold",
            })
            .setOrigin(0.5, 1);
          objects.push(sprite, hp);
        }
        this.board.set(this.cellKey(lane, column), objects);
      }
    }
  }

  private drawBench(): void {
    for (const object of this.bench) {
      object.destroy();
    }
    this.bench = [];
    const hint = this.add
      .text(24, 340, "Companions — tap one, then a left-side tile", {
        ...MINIGAME_TEXT,
        color: "#e8d8c0",
        fontSize: "14px",
      })
      .setOrigin(0, 0);
    this.bench.push(hint);

    livingPartyForWard().forEach((creature, index) => {
      const placed = this.state.defenders.some(
        (unit) => unit.instanceId === creature.instanceId,
      );
      const def = getCreatureDefinition(creature.definitionId);
      const x = 70 + index * 86;
      const y = 430;
      const selected = this.selectedId === creature.instanceId;
      const button = addMinigameButton(
        this,
        x,
        y,
        placed ? `${def.name} (out)` : def.name,
      );
      if (placed) {
        button.setAlpha(0.45).disableInteractive();
      }
      if (selected) {
        button.setBackgroundColor("#ffe8a8");
      }
      button.on("pointerdown", () => {
        if (placed || this.closing.current) {
          return;
        }
        this.selectedId = creature.instanceId;
        this.statusText.setText(`Place ${def.name}.`);
        this.drawBench();
      });
      this.bench.push(button);
    });
  }

  private tryDeploy(lane: number, column: number): void {
    if (this.closing.current || this.state.status !== "playing") {
      return;
    }
    if (!this.selectedId) {
      this.statusText.setText("Choose a companion first.");
      return;
    }
    const before = this.state.defenders.length;
    this.state = deployDefender(this.state, this.selectedId, lane, column);
    if (this.state.defenders.length === before) {
      this.statusText.setText("That tile is not open.");
      return;
    }
    this.selectedId = null;
    this.drawGrid();
    this.drawBench();
  }

  private tick(): void {
    if (this.closing.current || this.state.status !== "playing") {
      return;
    }
    this.state = stepWard(this.state);
    this.drawGrid();
    if (this.state.status !== "playing") {
      this.ticker?.remove();
      resolveMinigameEnd(
        this,
        "ward-crossing",
        this.state.status === "won",
        this.statusText,
        this.closing,
      );
    }
  }

  private quit(): void {
    if (this.closing.current) {
      return;
    }
    this.closing.current = true;
    this.ticker?.remove();
    closeMinigameOverlay(this);
  }
}
