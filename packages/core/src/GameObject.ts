import { Behaviour } from "./components/Behaviour";
import { Component, type SerializedComponent } from "./components/Component";
import { Transform } from "./components/Transform";
import type { Quaternion } from "./math/Quaternion";
import type { Vector3 } from "./math/Vector3";
import type { Scene } from "./Scene";

let nextGameObjectId = 0;

/** A class reference used to query attached components. */
export type ComponentType<T extends Component = Component> = abstract new (
  ...args: never[]
) => T;

/** JSON-safe GameObject hierarchy. */
export interface SerializedGameObject {
  active: boolean;
  children: SerializedGameObject[];
  components: SerializedComponent[];
  id: string;
  name: string;
  tags: string[];
}

function createGameObjectId(): string {
  nextGameObjectId += 1;
  return `pax-${Date.now().toString(36)}-${nextGameObjectId.toString(36)}`;
}

/**
 * Named entity composed from reusable components.
 */
export class GameObject {
  /** Stable identity for this runtime instance. */
  public readonly id = createGameObjectId();
  /** Transform automatically present on every GameObject. */
  public readonly transform: Transform;

  private activeValue = true;
  private readonly childValues: GameObject[] = [];
  private readonly componentValues: Component[] = [];
  private destroyedValue = false;
  private parentValue: GameObject | null = null;
  private sceneValue: Scene | null = null;
  private readonly tagValues = new Set<string>();

  /** Creates a named GameObject with a Transform. */
  public constructor(public name = "GameObject") {
    this.transform = new Transform();
    this.transform._attach(this);
    this.componentValues.push(this.transform);
  }

  /** Whether this object is locally active. */
  public get active(): boolean {
    return this.activeValue;
  }

  public set active(value: boolean) {
    if (this.destroyedValue) {
      throw new Error(
        `Cannot change active state of destroyed GameObject "${this.name}".`,
      );
    }
    if (this.activeValue === value) {
      return;
    }
    this.activeValue = value;
    this._refreshLifecycle();
  }

  /** Whether this object and all ancestors are active. */
  public get activeInHierarchy(): boolean {
    return this.activeValue && (this.parentValue?.activeInHierarchy ?? true);
  }

  /** Parent GameObject, or null for a root. */
  public get parent(): GameObject | null {
    return this.parentValue;
  }

  /** Child GameObjects in hierarchy order. */
  public get children(): readonly GameObject[] {
    return this.childValues;
  }

  /** Attached components, including Transform. */
  public get components(): readonly Component[] {
    return this.componentValues;
  }

  /** Scene currently containing this object. */
  public get scene(): Scene | null {
    return this.sceneValue;
  }

  /** Whether this GameObject has been destroyed. */
  public get destroyed(): boolean {
    return this.destroyedValue;
  }

  /** Current tags as an immutable snapshot. */
  public get tags(): readonly string[] {
    return [...this.tagValues];
  }

  /** Adds a zero-argument component. */
  public addComponent<T extends Component>(componentType: new () => T): T;
  /** Adds a component initialized with an options object. */
  public addComponent<T extends Component, TOptions>(
    componentType: new (options: TOptions) => T,
    options: TOptions,
  ): T;
  public addComponent<T extends Component, TOptions>(
    componentType: new (options?: TOptions) => T,
    options?: TOptions,
  ): T {
    this.assertAlive();
    if ((componentType as unknown) === Transform) {
      throw new Error("Every GameObject already owns exactly one Transform.");
    }

    const component = new componentType(options);
    component._attach(this);
    this.componentValues.push(component);
    this._refreshLifecycle();
    return component;
  }

  /** Returns the first component assignable to a class, or null. */
  public getComponent<T extends Component>(componentType: ComponentType<T>): T | null {
    return (
      (this.componentValues.find(
        (component): component is T => component instanceof componentType,
      ) as T | undefined) ?? null
    );
  }

  /** Returns every component assignable to a class. */
  public getComponents<T extends Component>(componentType: ComponentType<T>): T[] {
    return this.componentValues.filter(
      (component): component is T => component instanceof componentType,
    );
  }

  /** Removes and destroys a component instance or the first matching type. */
  public removeComponent<T extends Component>(target: T | ComponentType<T>): boolean {
    const component =
      target instanceof Component
        ? target
        : this.componentValues.find((value) => value instanceof target);
    if (!component || component === this.transform) {
      return false;
    }
    return this._removeComponentInstance(component);
  }

  /**
   * Changes the hierarchy parent and optionally preserves world transform.
   */
  public setParent(parent: GameObject | null, worldPositionStays = true): this {
    this.assertAlive();
    if (parent?.destroyed) {
      throw new Error("Cannot parent to a destroyed GameObject.");
    }
    if (parent === this || parent?.isDescendantOf(this)) {
      throw new Error("A GameObject cannot be parented to itself or its descendant.");
    }
    if (this.parentValue === parent) {
      return this;
    }

    const oldScene = this.sceneValue;
    const newScene = parent?.sceneValue ?? oldScene;
    if (parent && oldScene && parent.sceneValue !== oldScene) {
      throw new Error("Cannot parent GameObjects that belong to different scenes.");
    }
    if (parent && oldScene && !parent.sceneValue) {
      throw new Error(
        "Cannot parent a scene object beneath an object outside the scene.",
      );
    }

    let worldPosition: Vector3 | null = null;
    let worldRotation: Quaternion | null = null;
    let worldScale: Vector3 | null = null;
    if (worldPositionStays) {
      worldPosition = this.transform.getWorldPosition();
      worldRotation = this.transform.getWorldQuaternion();
      worldScale = this.transform.getWorldScale();
      if (parent) {
        const parentWorldScale = parent.transform.getWorldScale();
        if (
          parentWorldScale.x === 0 ||
          parentWorldScale.y === 0 ||
          parentWorldScale.z === 0
        ) {
          throw new Error(
            "Cannot preserve world transform beneath a zero-scale parent.",
          );
        }
      }
    }

    const oldParent = this.parentValue;
    this._detachFromParent();
    this.parentValue = parent;
    parent?.childValues.push(this);

    if (!this.sceneValue && parent?.sceneValue) {
      this._setSceneRecursive(parent.sceneValue);
    }
    newScene?._handleParentChanged(this, oldParent, parent);

    if (worldPosition && worldRotation && worldScale) {
      this.transform._setWorldTransform(worldPosition, worldRotation, worldScale);
    }

    this._refreshLifecycle();
    return this;
  }

  /** Adds a non-empty tag. */
  public addTag(tag: string): this {
    const normalized = tag.trim();
    if (!normalized) {
      throw new Error("GameObject tags cannot be empty.");
    }
    this.tagValues.add(normalized);
    return this;
  }

  /** Removes a tag when present. */
  public removeTag(tag: string): boolean {
    return this.tagValues.delete(tag);
  }

  /** Tests whether a tag is present. */
  public hasTag(tag: string): boolean {
    return this.tagValues.has(tag);
  }

  /** Destroys this hierarchy and all attached components. */
  public destroy(): void {
    if (this.destroyedValue) {
      return;
    }

    this._synchronizeLifecycle(false);
    this.sceneValue?._detachGameObjectForDestroy(this);
    this._detachFromParent();

    for (const child of [...this.childValues]) {
      child.destroy();
    }
    for (const component of [...this.componentValues].reverse()) {
      if (component !== this.transform) {
        this._removeComponentInstance(component);
      }
    }

    this.transform._finalizeDestroy();
    this.componentValues.length = 0;
    this.childValues.length = 0;
    this.destroyedValue = true;
  }

  /** Converts the complete hierarchy to JSON-safe data. */
  public toJSON(): SerializedGameObject {
    return {
      active: this.active,
      children: this.childValues.map((child) => child.toJSON()),
      components: this.componentValues.map((component) => component.toJSON()),
      id: this.id,
      name: this.name,
      tags: this.tags.slice(),
    };
  }

  /** @internal Removes a concrete component instance. */
  public _removeComponentInstance(component: Component): boolean {
    const index = this.componentValues.indexOf(component);
    if (index < 0 || component === this.transform) {
      return false;
    }

    this.componentValues.splice(index, 1);
    component._finalizeDestroy();
    this._refreshLifecycle();
    return true;
  }

  /** @internal Requests immediate lifecycle reconciliation. */
  public _refreshLifecycle(): void {
    this.sceneValue?._refreshLifecycleFor(this);
  }

  /** @internal Synchronizes behaviours in this complete subtree. */
  public _synchronizeLifecycle(sceneInitialized: boolean): void {
    for (const behaviour of this.getComponents(Behaviour)) {
      behaviour._synchronizeLifecycle(sceneInitialized, this.activeInHierarchy);
    }
    for (const child of this.childValues) {
      child._synchronizeLifecycle(sceneInitialized);
    }
  }

  /** @internal Assigns a Scene to this complete subtree. */
  public _setSceneRecursive(scene: Scene | null): void {
    if (!scene) {
      this._synchronizeLifecycle(false);
    }
    this.sceneValue = scene;
    for (const child of this.childValues) {
      child._setSceneRecursive(scene);
    }
  }

  /** @internal Detaches without changing scene ownership. */
  public _detachFromParent(): void {
    if (!this.parentValue) {
      return;
    }
    const index = this.parentValue.childValues.indexOf(this);
    if (index >= 0) {
      this.parentValue.childValues.splice(index, 1);
    }
    this.parentValue = null;
  }

  private isDescendantOf(candidateAncestor: GameObject): boolean {
    let cursor = this.parentValue;
    while (cursor) {
      if (cursor === candidateAncestor) {
        return true;
      }
      cursor = cursor.parentValue;
    }
    return false;
  }

  private assertAlive(): void {
    if (this.destroyedValue) {
      throw new Error(`GameObject "${this.name}" has been destroyed.`);
    }
  }
}
