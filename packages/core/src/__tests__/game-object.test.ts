import { describe, expect, it } from "vitest";
import { Component, GameObject, Transform } from "../index";

class MarkerComponent extends Component {
  public readonly value = 42;
}

describe("GameObject component model", () => {
  it("adds a Component", () => {
    const gameObject = new GameObject("Test");
    const component = gameObject.addComponent(MarkerComponent);

    expect(component.gameObject).toBe(gameObject);
    expect(component.transform).toBe(gameObject.transform);
    expect(gameObject.components).toContain(component);
  });

  it("retrieves a Component from the same GameObject", () => {
    const gameObject = new GameObject();
    const component = gameObject.addComponent(MarkerComponent);

    expect(gameObject.getComponent(MarkerComponent)).toBe(component);
    expect(gameObject.getComponents(MarkerComponent)).toEqual([component]);
  });

  it("removes and destroys a Component", () => {
    const gameObject = new GameObject();
    const component = gameObject.addComponent(MarkerComponent);

    expect(gameObject.removeComponent(MarkerComponent)).toBe(true);
    expect(component.destroyed).toBe(true);
    expect(gameObject.getComponent(MarkerComponent)).toBeNull();
    expect(gameObject.removeComponent(Transform)).toBe(false);
  });

  it("maintains Transform parent-child relationships and world position", () => {
    const parent = new GameObject("Parent");
    const child = new GameObject("Child");
    parent.transform.position.set(2, 0, 0);
    child.transform.localPosition.set(1, 0, 0);

    child.setParent(parent, false);

    expect(child.parent).toBe(parent);
    expect(parent.children).toContain(child);
    expect(child.transform.parent).toBe(parent.transform);
    expect(child.transform.getWorldPosition().x).toBeCloseTo(3);

    child.setParent(null, true);
    expect(child.parent).toBeNull();
    expect(child.transform.position.x).toBeCloseTo(3);
  });
});
