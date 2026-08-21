import Phaser from "phaser";
import { playEncounterSfx } from "../audio/gameAudio";
import { getCreatureDefinition } from "../creatures/catalog";
import { addToParty, hasCreature } from "../creatures/party";
import { ensureCreatureTextures } from "../creatures/sprites";
import { resolveCreaturePoseTexture } from "../creatures/creaturePoses";
import {
  ENCOUNTER_CREATURE_DISPLAY,
  ensureTrimmedTexture,
  fitContainDisplay,
} from "../render/displaySizes";
import { bindOverlayPixelRatio, DESIGN_SIZE } from "../render/pixelRatio";
import { UNARMED_WANDERER } from "../battle/wandererWeapons";
import {
  BEFRIEND_MISS_TEXT,
  befriendButtonLabel,
  canAttemptBefriend,
  formatGodClaimJoinLine,
  getBefriendChance,
  resolveTideSovereignOutcome,
  TIDE_SOVEREIGN_ID,
} from "../encounters/godSail";
import {
  CAIRN_SOVEREIGN_ID,
  resolveCairnSovereignOutcome,
} from "../encounters/godLand";
import { isVisitorMode } from "../world/worldSession";
import { markCreatureDiscovered } from "../world/worldState";
import { unlockCodexHud } from "../ui/hudChrome";

const PANEL_WIDTH = 460;
const PANEL_HEIGHT = 500;
const PANEL_PADDING = 28;

const TEXT_STYLE = {
  fontFamily: "Source Sans 3, system-ui, sans-serif",
} as const;

export class EncounterScene extends Phaser.Scene {
  private creatureId!: string;
  private actionTaken = false;
  private befriendAttempted = false;
  private missText?: Phaser.GameObjects.Text;
  private befriendBtn?: Phaser.GameObjects.Text;

  constructor() {
    super({ key: "EncounterScene" });
  }

  init(data: { creatureId: string }): void {
    this.creatureId = data.creatureId;
    this.actionTaken = false;
    this.befriendAttempted = false;
  }

  create(): void {
    bindOverlayPixelRatio(this);
    ensureCreatureTextures(this);
    playEncounterSfx(this);
    const def = getCreatureDefinition(this.creatureId);
    if (!def.excludeFromCodex) {
      markCreatureDiscovered(this.creatureId);
    }

    this.cameras.main.fadeIn(160, 255, 255, 255);

    this.add
      .rectangle(0, 0, DESIGN_SIZE, DESIGN_SIZE, 0x1a3048, 0.55)
      .setOrigin(0)
      .setInteractive();

    const panelX = DESIGN_SIZE / 2;
    const panelY = DESIGN_SIZE / 2;
    const panelLeft = panelX - PANEL_WIDTH / 2;
    const innerLeft = panelLeft + PANEL_PADDING;
    const innerWidth = PANEL_WIDTH - PANEL_PADDING * 2;

    const panel = this.add.graphics();
    panel.fillStyle(0xfff8ec, 0.97);
    panel.fillRoundedRect(
      panelX - PANEL_WIDTH / 2,
      panelY - PANEL_HEIGHT / 2,
      PANEL_WIDTH,
      PANEL_HEIGHT,
      22,
    );
    panel.lineStyle(4, 0x6eb8a8, 1);
    panel.strokeRoundedRect(
      panelX - PANEL_WIDTH / 2,
      panelY - PANEL_HEIGHT / 2,
      PANEL_WIDTH,
      PANEL_HEIGHT,
      22,
    );
    panel.lineStyle(2, 0xd8efe8, 0.9);
    panel.strokeRoundedRect(
      panelX - PANEL_WIDTH / 2 + 6,
      panelY - PANEL_HEIGHT / 2 + 6,
      PANEL_WIDTH - 12,
      PANEL_HEIGHT - 12,
      18,
    );

    const pose = resolveCreaturePoseTexture(this, def.spriteKey, "encounter");
    const trimmed = ensureTrimmedTexture(this, ...pose);
    // Sit in the upper panel: leave clear air above the title at panelY+70.
    fitContainDisplay(
      this.add.image(panelX, panelY - 90, ...trimmed).setOrigin(0.5),
      ENCOUNTER_CREATURE_DISPLAY,
    );

    this.addPanelText(
      panelX,
      panelY + 70,
      `A wild ${def.name} appeared!`,
      innerWidth,
      {
        color: "#2a4050",
        fontSize: "22px",
        fontStyle: "bold",
      },
    );

    this.addPanelText(
      panelX,
      panelY + 102,
      `Type: ${def.folkloreType}`,
      innerWidth,
      {
        color: "#5a7888",
        fontSize: "14px",
      },
    );

    const buttonY = panelY + 162;
    const buttonLabels = [
      befriendButtonLabel(getBefriendChance(this.creatureId)),
      "Spar",
      "Flee",
    ] as const;
    const buttonActions = [
      () => this.tryBefriend(),
      () => this.startSpar(),
      () => this.flee(),
    ] as const;
    const buttonSlotWidth = innerWidth / buttonLabels.length;

    buttonLabels.forEach((label, index) => {
      const buttonX = innerLeft + buttonSlotWidth * (index + 0.5);
      const btn = this.addButton(
        buttonX,
        buttonY,
        label,
        buttonActions[index],
        index,
      );
      if (index === 0) {
        this.befriendBtn = btn;
      }
    });
  }

  private addPanelText(
    x: number,
    y: number,
    content: string,
    width: number,
    style: Phaser.Types.GameObjects.Text.TextStyle,
  ): Phaser.GameObjects.Text {
    const text = this.add
      .text(x, y, content, {
        ...TEXT_STYLE,
        ...style,
        align: "center",
        wordWrap: { width, useAdvancedWrap: true },
      })
      .setOrigin(0.5, 0.5);
    text.setFixedSize(width, 0);
    return text;
  }

  private addButton(
    x: number,
    y: number,
    label: string,
    onClick: () => void,
    index: number,
  ): Phaser.GameObjects.Text {
    const tones = ["#7ed6a8", "#7ec8e8", "#f0c878"] as const;
    const btn = this.add
      .text(x, y, label, {
        color: "#1a3040",
        backgroundColor: tones[index],
        ...TEXT_STYLE,
        fontSize: "16px",
        fontStyle: "bold",
        padding: { x: 14, y: 10 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    btn.on("pointerover", () => btn.setAlpha(0.88));
    btn.on("pointerout", () => btn.setAlpha(1));
    btn.on("pointerdown", onClick);
    return btn;
  }

  private tryBefriend(): void {
    if (
      this.actionTaken ||
      isVisitorMode() ||
      !canAttemptBefriend(this.befriendAttempted)
    ) {
      return;
    }
    this.actionTaken = true;
    this.befriendAttempted = true;

    if (hasCreature(this.creatureId)) {
      this.showResult(
        `${getCreatureDefinition(this.creatureId).name} is already in your party.`,
      );
      return;
    }

    const catchChance = getBefriendChance(this.creatureId);
    if (Math.random() < catchChance) {
      if (this.creatureId === TIDE_SOVEREIGN_ID) {
        const result = resolveTideSovereignOutcome("befriend");
        if (result) {
          this.showResult(
            formatGodClaimJoinLine("Tide Sovereign", "Tide Cleaver", result, false),
          );
        }
      } else if (this.creatureId === CAIRN_SOVEREIGN_ID) {
        const result = resolveCairnSovereignOutcome("befriend");
        if (result) {
          this.showResult(
            formatGodClaimJoinLine("Stone Sovereign", "Cairn Maul", result, false),
          );
        }
      } else {
        addToParty(this.creatureId);
        this.showResult(`${getCreatureDefinition(this.creatureId).name} joined you!`);
      }
    } else {
      this.actionTaken = false;
      this.befriendBtn
        ?.off("pointerover")
        .off("pointerout")
        .disableInteractive()
        .setAlpha(0.5);
      this.showMiss(BEFRIEND_MISS_TEXT);
    }
  }

  private showMiss(message: string): void {
    this.missText?.destroy();
    this.missText = this.addPanelText(
      DESIGN_SIZE / 2,
      DESIGN_SIZE / 2 + 210,
      message,
      PANEL_WIDTH - PANEL_PADDING * 2,
      {
        color: "#2a4050",
        fontSize: "18px",
        fontStyle: "bold",
      },
    );
  }

  private showResult(message: string): void {
    this.missText?.destroy();
    this.missText = undefined;
    const text = this.addPanelText(
      DESIGN_SIZE / 2,
      DESIGN_SIZE / 2 + 210,
      message,
      PANEL_WIDTH - PANEL_PADDING * 2,
      {
        color: "#2a4050",
        fontSize: "18px",
        fontStyle: "bold",
      },
    );
    this.time.delayedCall(900, () => {
      text.destroy();
      this.endEncounter();
    });
  }

  private startSpar(): void {
    if (this.actionTaken || isVisitorMode()) {
      return;
    }
    this.actionTaken = true;

    this.cameras.main.fadeOut(120, 255, 255, 255);
    this.time.delayedCall(130, () => {
      this.scene.launch("BattleScene", {
        wildCreatureId: this.creatureId,
        wandererPartner: UNARMED_WANDERER,
      });
      this.scene.stop("EncounterScene");
    });
  }

  private flee(): void {
    if (this.actionTaken) {
      return;
    }
    this.actionTaken = true;
    if (this.creatureId === TIDE_SOVEREIGN_ID) {
      resolveTideSovereignOutcome("flee");
    } else if (this.creatureId === CAIRN_SOVEREIGN_ID) {
      resolveCairnSovereignOutcome("flee");
    }
    this.endEncounter();
  }

  private endEncounter(): void {
    unlockCodexHud();
    this.cameras.main.fadeOut(140, 255, 255, 255);
    this.time.delayedCall(150, () => {
      this.scene.stop("EncounterScene");
      this.scene.resume("IsometricScene");
    });
  }
}
