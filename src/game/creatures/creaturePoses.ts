import type Phaser from "phaser";
import {
  IMAGINE_ATLAS_KEY,
  hasImagineFrame,
  imagineTexture,
} from "../render/imagineAssets";

export type CreaturePose = "idle" | "encounter" | "battle";

/** Texture key for a pose; idle uses the canonical `spriteKey`. */
export function creaturePoseKey(
  spriteKey: string,
  pose: CreaturePose,
): string {
  if (pose === "idle") {
    return spriteKey;
  }
  return `${spriteKey}-${pose}`;
}

/**
 * Prefer pose-specific Imagine art (as a packed-atlas frame when available,
 * #193); fall back to the base sprite key. Returns texture arguments to
 * spread into `add.image` / `setTexture`.
 */
export function resolveCreaturePoseTexture(
  scene: Phaser.Scene,
  spriteKey: string,
  pose: CreaturePose,
): [string, string | undefined] {
  const key = creaturePoseKey(spriteKey, pose);
  if (hasImagineFrame(scene, key)) {
    return [IMAGINE_ATLAS_KEY, key];
  }
  if (scene.textures.exists(key)) {
    return [key, undefined];
  }
  const idleKey = `${spriteKey}-idle`;
  if (pose !== "idle") {
    if (hasImagineFrame(scene, idleKey)) {
      return [IMAGINE_ATLAS_KEY, idleKey];
    }
    if (scene.textures.exists(idleKey)) {
      return [idleKey, undefined];
    }
  }
  return imagineTexture(scene, spriteKey);
}
