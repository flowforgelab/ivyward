import { getMaterialName } from "../inventory/materials";
import { appendMaterialVisual } from "./materialIcon";
import { popOverlay, pushOverlay } from "./overlayStack";
import {
  CRAFT_RECIPES,
  getRecipeMaterials,
  patternToMaterialRows,
  type CraftRecipe,
} from "../crafting/recipes";

export type RecipePage = {
  id: string;
  name: string;
  outputItemId: string;
  outputCount: number;
  altarOnly: boolean;
  uniqueOwned: boolean;
  materials: { materialId: string; name: string; count: number }[];
  grid: (string | null)[][];
};

export function listRecipePages(
  recipes: CraftRecipe[] = CRAFT_RECIPES,
): RecipePage[] {
  return recipes.map((recipe) => ({
    id: recipe.id,
    name: recipe.name,
    outputItemId: recipe.outputItemId,
    outputCount: recipe.outputCount,
    altarOnly: Boolean(recipe.altarOnly),
    uniqueOwned: Boolean(recipe.uniqueOwned),
    materials: getRecipeMaterials(recipe).map((m) => ({
      ...m,
      name: getMaterialName(m.materialId),
    })),
    grid: patternToMaterialRows(recipe.pattern),
  }));
}

let recipesOpen = false;
let previouslyFocused: HTMLElement | null = null;

function onRecipesKeyDown(event: KeyboardEvent): void {
  if (!recipesOpen) {
    return;
  }
  if (event.key === "Escape") {
    return;
  }
  event.stopImmediatePropagation();
}

function setBackgroundInert(inert: boolean): void {
  const playfield = document.getElementById("playfield");
  if (playfield) {
    if (inert) {
      playfield.setAttribute("inert", "");
    } else {
      playfield.removeAttribute("inert");
    }
  }
}

function ensureRecipesRoot(): HTMLElement {
  let root = document.getElementById("recipes-overlay");
  if (root) {
    return root;
  }
  root = document.createElement("div");
  root.id = "recipes-overlay";
  root.className = "recipes-overlay";
  root.hidden = true;
  root.innerHTML = `
    <div class="recipes-panel" role="dialog" aria-labelledby="recipes-title">
      <div class="recipes-header">
        <h2 id="recipes-title">Recipes</h2>
        <button type="button" id="recipes-close" class="recipes-close" aria-label="Close">×</button>
      </div>
      <p class="recipes-intro">Shaped 4×4 patterns. Slide them anywhere on the grid; do not rotate. Craft at Moon Shrine, or from Inventory after you own a Portable Moonshrine.</p>
      <div id="recipes-body" class="recipes-body"></div>
    </div>
  `;
  document.getElementById("app")?.appendChild(root);
  root.querySelector("#recipes-close")?.addEventListener("click", closeRecipes);
  root.addEventListener("click", (event) => {
    if (event.target === root) {
      closeRecipes();
    }
  });
  return root;
}

function renderRecipeGrid(grid: (string | null)[][]): HTMLElement {
  const table = document.createElement("div");
  table.className = "recipe-grid";
  table.style.gridTemplateColumns = `repeat(${grid[0]?.length ?? 1}, 1fr)`;
  for (const row of grid) {
    for (const cell of row) {
      const el = document.createElement("span");
      el.className = cell ? "recipe-cell recipe-cell-filled" : "recipe-cell";
      if (cell) {
        appendMaterialVisual(el, cell, { showName: false });
      }
      table.appendChild(el);
    }
  }
  return table;
}

function renderRecipesBody(): void {
  const body = document.getElementById("recipes-body");
  if (!body) {
    return;
  }
  body.replaceChildren();
  for (const page of listRecipePages()) {
    const section = document.createElement("section");
    section.className = "recipe-card";
    const heading = document.createElement("h3");
    const count = page.outputCount > 1 ? ` ×${page.outputCount}` : "";
    heading.textContent = `${page.name}${count}`;
    section.appendChild(heading);
    if (page.altarOnly) {
      const note = document.createElement("p");
      note.className = "recipe-note";
      note.textContent = "Craft only at the Moon Shrine altar. One owned.";
      section.appendChild(note);
    }
    const cost = document.createElement("p");
    cost.className = "recipe-cost";
    cost.textContent = page.materials
      .map((m) => `${m.name}×${m.count}`)
      .join(" + ");
    section.appendChild(cost);
    section.appendChild(renderRecipeGrid(page.grid));
    body.appendChild(section);
  }
}

export function openRecipes(): void {
  const root = ensureRecipesRoot();
  renderRecipesBody();
  previouslyFocused =
    document.activeElement instanceof HTMLElement ? document.activeElement : null;
  root.hidden = false;
  recipesOpen = true;
  setBackgroundInert(true);
  pushOverlay("recipes", closeRecipes);
  window.addEventListener("keydown", onRecipesKeyDown, true);
  const closeBtn = root.querySelector(
    "#recipes-close",
  ) as HTMLButtonElement | null;
  closeBtn?.focus();
}

export function closeRecipes(): void {
  popOverlay("recipes");
  const root = document.getElementById("recipes-overlay");
  if (root) {
    root.hidden = true;
  }
  recipesOpen = false;
  const inventory = document.getElementById("inventory-overlay");
  if (!inventory || inventory.hidden) {
    setBackgroundInert(false);
  }
  window.removeEventListener("keydown", onRecipesKeyDown, true);
  previouslyFocused?.focus();
  previouslyFocused = null;
}

export function toggleRecipes(): void {
  if (recipesOpen) {
    closeRecipes();
  } else {
    openRecipes();
  }
}

export function isRecipesOpen(): boolean {
  return recipesOpen;
}
