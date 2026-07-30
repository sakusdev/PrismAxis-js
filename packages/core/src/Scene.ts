import { Behaviour } from "./components/Behaviour";
import type { Component } from "./components/Component";
import type { GameObject, ComponentType, SerializedGameObject } from "./GameObject";

/** JSON-safe Scene structure. */
export interface SerializedScene {
  gameObjects: SerializedGameObject[];
  name: string;
}

/**
 * Owns GameObject roots and dispatches lifecycle phases.
 */
export class Scene {
  private destroyedValue = false;
  private initializedValue = false;
  private readonly roots = new Set<GameObject>();

  /** Creates a scene. */
  public constructor(public name = "Scene") {}

  /** Whether initialize has completed. */
  public get initialized(): boolean {
    return this.initializedValue;
  }

  /** Whether this scene has been destroyed. */
  public get destroyed(): boolean {
    return this.destroyedValue;
  }

  /** Root GameObjects in insertion order. */
  public get gameObjects(): readonly GameObject[] {
    return [...this.roots];
  }

  /** Adds a GameObject hierarchy to this scene. */
  public add(gameObject: GameObject): GameObject {
    this.assertAlive();
    if (gameObject.destroyed) {
      throw new Error("Cannot add a destroyed GameObject to a Scene.");
    }

    let root = gameObject;
    while (root.parent) {
      root = root.parent;
    }
    if (root.scene && root.scene !== this) {
      throw new Error("GameObject already belongs to another Scene.");
    }
    if (root.scene === this) {
      return gameObject;
    }

    this.roots.add(root);
    root._setSceneRecursive(this);
    if (this.initializedValue) {
      root._synchronizeLifecycle(true);
    }
    return gameObject;
  }

  /**
   * Removes a GameObject subtree without destroying it.
   */
  public remove(gameObject: GameObject): boolean {
    this.assertAlive();
    if (gameObject.scene !== this) {
      return false;
    }

    gameObject._synchronizeLifecycle(false);
    if (gameObject.parent) {
      gameObject._detachFromParent();
    } else {
      this.roots.delete(gameObject);
    }
    gameObject._setSceneRecursive(null);
    return true;
  }

  /** Finds the first GameObject with an exact name. */
  public findByName(name: string): GameObject | null {
    return this.getAllGameObjects().find((value) => value.name === name) ?? null;
  }

  /** Finds a GameObject by runtime ID. */
  public findById(id: string): GameObject | null {
    return this.getAllGameObjects().find((value) => value.id === id) ?? null;
  }

  /** Returns every GameObject carrying a tag. */
  public findWithTag(tag: string): GameObject[] {
    return this.getAllGameObjects().filter((value) => value.hasTag(tag));
  }

  /** Returns a pre-order hierarchy snapshot. */
  public getAllGameObjects(): GameObject[] {
    const values: GameObject[] = [];
    const visit = (gameObject: GameObject): void => {
      values.push(gameObject);
      for (const child of gameObject.children) {
        visit(child);
      }
    };
    for (const root of this.roots) {
      visit(root);
    }
    return values;
  }

  /** Returns all matching components in hierarchy order. */
  public getComponents<T extends Component>(componentType: ComponentType<T>): T[] {
    return this.getAllGameObjects().flatMap((gameObject) =>
      gameObject.getComponents(componentType),
    );
  }

  /** Runs Awake and activation reconciliation once. */
  public initialize(): void {
    this.assertAlive();
    if (this.initializedValue) {
      return;
    }
    this.initializedValue = true;
    for (const root of this.roots) {
      root._synchronizeLifecycle(true);
    }
  }

  /** Dispatches variable-rate updates. */
  public update(deltaTime: number): void {
    this.assertInitialized();
    this.dispatchBehaviourPhase("update", deltaTime);
  }

  /** Dispatches fixed simulation updates. */
  public fixedUpdate(fixedDeltaTime: number): void {
    this.assertInitialized();
    this.dispatchBehaviourPhase("fixedUpdate", fixedDeltaTime);
  }

  /** Dispatches post-update callbacks. */
  public lateUpdate(deltaTime: number): void {
    this.assertInitialized();
    this.dispatchBehaviourPhase("lateUpdate", deltaTime);
  }

  /** Destroys every GameObject and prevents further use. */
  public destroy(): void {
    if (this.destroyedValue) {
      return;
    }
    for (const root of [...this.roots]) {
      root.destroy();
    }
    this.roots.clear();
    this.destroyedValue = true;
  }

  /** Converts this scene to JSON-safe hierarchy data. */
  public toJSON(): SerializedScene {
    return {
      gameObjects: [...this.roots].map((root) => root.toJSON()),
      name: this.name,
    };
  }

  /** @internal Reconciles a changed subtree immediately. */
  public _refreshLifecycleFor(gameObject: GameObject): void {
    if (gameObject.scene === this) {
      gameObject._synchronizeLifecycle(this.initializedValue);
    }
  }

  /** @internal Keeps roots consistent after reparenting. */
  public _handleParentChanged(
    gameObject: GameObject,
    _oldParent: GameObject | null,
    newParent: GameObject | null,
  ): void {
    if (gameObject.scene !== this) {
      return;
    }
    if (newParent) {
      this.roots.delete(gameObject);
    } else {
      this.roots.add(gameObject);
    }
    this._refreshLifecycleFor(gameObject);
  }

  /** @internal Removes hierarchy bookkeeping during GameObject.destroy. */
  public _detachGameObjectForDestroy(gameObject: GameObject): void {
    if (gameObject.scene !== this) {
      return;
    }
    if (!gameObject.parent) {
      this.roots.delete(gameObject);
    }
    gameObject._setSceneRecursive(null);
  }

  private dispatchBehaviourPhase(
    phase: "fixedUpdate" | "lateUpdate" | "update",
    deltaTime: number,
  ): void {
    if (!Number.isFinite(deltaTime) || deltaTime < 0) {
      throw new Error(`${phase} deltaTime must be a finite non-negative number.`);
    }

    for (const gameObject of this.getAllGameObjects()) {
      if (gameObject.scene !== this) {
        continue;
      }
      for (const behaviour of gameObject.getComponents(Behaviour)) {
        if (
          behaviour._prepareForUpdate(
            this.initializedValue,
            gameObject.activeInHierarchy,
          )
        ) {
          behaviour[phase](deltaTime);
        }
      }
    }
  }

  private assertInitialized(): void {
    this.assertAlive();
    if (!this.initializedValue) {
      throw new Error(`Scene "${this.name}" must be initialized before updating.`);
    }
  }

  private assertAlive(): void {
    if (this.destroyedValue) {
      throw new Error(`Scene "${this.name}" has been destroyed.`);
    }
  }
}
