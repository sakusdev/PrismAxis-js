import { describe, expect, it } from "vitest";
import { GameObject, Scene } from "../index";

describe("Scene", () => {
  it("adds, finds, serializes, and removes GameObjects", () => {
    const scene = new Scene("Test Scene");
    const gameObject = new GameObject("Cube").addTag("geometry");

    scene.add(gameObject);

    expect(scene.gameObjects).toEqual([gameObject]);
    expect(scene.findByName("Cube")).toBe(gameObject);
    expect(scene.findById(gameObject.id)).toBe(gameObject);
    expect(scene.findWithTag("geometry")).toEqual([gameObject]);
    expect(scene.toJSON().gameObjects[0]?.name).toBe("Cube");

    expect(scene.remove(gameObject)).toBe(true);
    expect(gameObject.scene).toBeNull();
    expect(scene.gameObjects).toHaveLength(0);
  });
});
