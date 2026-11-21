import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { seedKnowledgeBase } from "@/kb";
import { checkLabels, needsReview } from "@/sync/labels";
import { matchIngredientKeys } from "@/sync/match";
import { applyStoreData } from "@/sync/merge";
import { absoluteUrl, canonicalImage, imageFileName, parseIngredientsPage, parseProductJson } from "@/sync/parse";

const fixture = (f: string) => readFileSync(path.join(__dirname, "..", "fixtures", f), "utf8");
const kb = seedKnowledgeBase();

describe("URL helpers", () => {
  it("normalises Shopify image URLs", () => {
    expect(absoluteUrl("//fuyl.in/cdn/x.png")).toBe("https://fuyl.in/cdn/x.png");
    expect(canonicalImage("//fuyl.in/cdn/shop/files/A.png?v=12&width=600")).toBe("https://fuyl.in/cdn/shop/files/A.png?v=12");
    expect(imageFileName("https://cdn.shopify.com/s/files/1/0/files/ShopPic-5.png?v=99")).toBe("ShopPic-5.png");
  });
});

describe("parseProductJson (real fuyl.in snapshot)", () => {
  const p = parseProductJson(JSON.parse(fixture("fuyl-product.json")));

  it("reads title, handle, URL and prices", () => {
    expect(p.title).toBe("FUYL COMPLETE+");
    expect(p.handle).toBe("fuyl-complete");
    expect(p.url).toBe("https://fuyl.in/products/fuyl-complete");
    expect(p.variants.map((v) => [v.title, v.price])).toEqual([
      ["Pack of 1", 1499],
      ["Pack of 2", 2799],
    ]);
    expect(p.priceFrom).toBe(1499);
    expect(p.description).toContain("15 Sachets");
  });

  it("reads all 10 images with file names", () => {
    expect(p.images).toHaveLength(10);
    expect(p.images.map((i) => i.file)).toEqual(expect.arrayContaining(["ShopPic-5.png", "ShopPic-6.png"]));
    expect(p.images.every((i) => i.src.startsWith("https://"))).toBe(true);
  });

  it("rejects malformed product JSON", () => {
    expect(() => parseProductJson({ product: { title: "x" } })).toThrow();
  });
});

describe("parseIngredientsPage (real fuyl.in snapshot)", () => {
  const items = parseIngredientsPage(fixture("fuyl-ingredients.html"));

  it("finds all 45 ingredient cards", () => {
    expect(items).toHaveLength(45);
  });

  it("splits each card into its three sections as plain text", () => {
    const spinach = items.find((i) => i.title === "SPINACH")!;
    expect(spinach.category).toBe("GREENS & SUPERFOODS");
    expect(spinach.image).toMatch(/^https:\/\/fuyl\.in\/cdn\/shop\/files\/01_SPINACH_SS\.png\?v=\d+$/);
    expect(spinach.about).toMatch(/^A nutrient-dense leafy green/);
    expect(spinach.whatItDoes[0]).toEqual({ heading: "Eye health", text: expect.stringMatching(/^Lutein/) });
    expect(spinach.whyItMatters).toMatch(/leafy greens/);
    for (const i of items) {
      expect(`${i.about}${i.whyItMatters}`, i.title).not.toMatch(/<[a-z]/i);
    }
  });

  it("gives nearly every card an image and an 'about' section", () => {
    expect(items.filter((i) => i.image).length).toBe(45);
    expect(items.filter((i) => i.about).length).toBeGreaterThanOrEqual(44);
  });

  it("returns nothing for unrelated HTML instead of throwing", () => {
    expect(parseIngredientsPage("<html><body><p>Maintenance</p></body></html>")).toEqual([]);
  });
});

describe("matchIngredientKeys", () => {
  const items = parseIngredientsPage(fixture("fuyl-ingredients.html"));

  it("matches every one of the 45 site titles to the knowledge base", () => {
    const unmatched = items.filter((i) => matchIngredientKeys(i.title, kb.ingredients).length === 0).map((i) => i.title);
    expect(unmatched).toEqual([]);
  });

  it("handles the site's naming quirks", () => {
    const m = (t: string) => matchIngredientKeys(t, kb.ingredients);
    expect(m("KSM-66 ASHWAGANDHA")).toEqual(["ashwagandha"]);
    expect(m("FLAX SEED")).toEqual(["flaxseed"]);
    expect(m("MONKFRUIT")).toEqual(["monk-fruit"]);
    expect(m("ALA")).toEqual(["ala"]);
    expect(m("PHGG Sunfiber®")).toEqual(["phgg"]);
    expect(m("VITAMIN K2")).toEqual(["vitamin-k2"]);
    expect(m("BRAHMI")).toEqual(["brahmi"]);
    expect(m("FENUGREEK")).toEqual(["fenugreek"]);
    expect(m("ENZYME BLEND - DIGENZYME")).toEqual(["amylase", "protease", "cellulase", "lipase", "lactase"]);
    expect(m("UNOBTAINIUM")).toEqual([]);
  });

  it("maps 45 cards onto 49 knowledge-base ingredients (enzyme card covers 5)", () => {
    const keys = new Set(items.flatMap((i) => matchIngredientKeys(i.title, kb.ingredients)));
    expect(keys.size).toBe(49);
  });
});

describe("checkLabels", () => {
  const images = parseProductJson(JSON.parse(fixture("fuyl-product.json"))).images;
  const src = (f: string) => images.find((i) => i.file === f)!.src;

  it("treats the first sync as the baseline", () => {
    const checks = checkLabels(images, {});
    expect(checks.map((c) => c.status)).toEqual(["baseline", "baseline"]);
    expect(needsReview(checks)).toBe(false);
  });

  it("is ok when versions match what an admin acknowledged", () => {
    const checks = checkLabels(images, { "ShopPic-5.png": src("ShopPic-5.png"), "ShopPic-6.png": src("ShopPic-6.png") });
    expect(checks.map((c) => c.status)).toEqual(["ok", "ok"]);
  });

  it("flags a replaced or removed label image", () => {
    const acknowledged = { "ShopPic-5.png": src("ShopPic-5.png").replace(/v=\d+/, "v=1"), "ShopPic-6.png": src("ShopPic-6.png") };
    const changed = checkLabels(images, acknowledged);
    expect(changed[0].status).toBe("changed");
    expect(needsReview(changed)).toBe(true);
    const missing = checkLabels(images.filter((i) => i.file !== "ShopPic-6.png"), acknowledged);
    expect(missing[1].status).toBe("missing");
  });
});

describe("applyStoreData", () => {
  it("overlays images only, keeping reviewed names, doses and copy", () => {
    const merged = applyStoreData(kb, [
      { matchedKeys: ["vitamin-b12"], image: "https://fuyl.in/b12.png" },
      { matchedKeys: ["amylase", "lipase"], image: "https://fuyl.in/enzymes.png" },
    ]);
    const b12 = merged.ingredients.find((i) => i.key === "vitamin-b12")!;
    const original = kb.ingredients.find((i) => i.key === "vitamin-b12")!;
    expect(b12).toEqual({ ...original, image: "https://fuyl.in/b12.png" });
    expect(merged.ingredients.find((i) => i.key === "lipase")!.image).toBe("https://fuyl.in/enzymes.png");
    expect(kb.ingredients.find((i) => i.key === "vitamin-b12")!.image).toBeUndefined(); // not mutated
  });
});
