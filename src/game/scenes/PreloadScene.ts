import Phaser from "phaser";
import { preloadGameAudio } from "../audio/gameAudio";
import { preloadImagineAssets } from "../render/imagineAssets";

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: "PreloadScene" });
  }

  preload(): void {
    // ponytail: ignore missing optional Imagine files; procedural ensure* fills gaps
    this.load.on("loaderror", () => {
      /* intentional no-op */
    });
    preloadImagineAssets(this);
    this.load.image(
      "creature-tide-sovereign",
      "assets/creatures/creature-tide-sovereign.png",
    );
    this.load.image(
      "creature-cairn-sovereign",
      "assets/creatures/creature-cairn-sovereign.png",
    );
    this.load.image(
      "creature-horizon-sovereign",
      "assets/creatures/creature-horizon-sovereign.png",
    );
    this.load.image(
      "creature-eclipse-sovereign",
      "assets/creatures/creature-eclipse-sovereign.png",
    );
    preloadGameAudio(this);
  }

  create(): void {
    this.scene.start("IsometricScene");
  }
}
