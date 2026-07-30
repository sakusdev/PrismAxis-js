import { Component } from "./Component";

/**
 * Component with Unity-inspired frame lifecycle callbacks.
 */
export class Behaviour extends Component {
  private awakeCalled = false;
  private startCalled = false;
  private activeValue = false;

  /** Called once before the behaviour can become active. */
  public awake(): void {}

  /** Called once immediately before the first update. */
  public start(): void {}

  /** Called once per variable-rate frame. */
  public update(_deltaTime: number): void {}

  /** Called on each fixed simulation step. */
  public fixedUpdate(_fixedDeltaTime: number): void {}

  /** Called after all regular updates in a frame. */
  public lateUpdate(_deltaTime: number): void {}

  /** Called whenever this behaviour becomes active. */
  public onEnable(): void {}

  /** Called whenever this behaviour stops being active. */
  public onDisable(): void {}

  /** Called once when this behaviour is destroyed. */
  public onDestroy(): void {}

  /** @internal Synchronizes Awake, OnEnable, and OnDisable state. */
  public _synchronizeLifecycle(
    sceneInitialized: boolean,
    activeInHierarchy: boolean,
  ): void {
    if (this.destroyed) {
      return;
    }

    if (sceneInitialized && !this.awakeCalled) {
      this.awakeCalled = true;
      this.awake();
    }

    const shouldBeActive =
      sceneInitialized && activeInHierarchy && this.enabled && !this.destroyed;
    if (shouldBeActive === this.activeValue) {
      return;
    }

    this.activeValue = shouldBeActive;
    if (shouldBeActive) {
      this.onEnable();
    } else {
      this.onDisable();
    }
  }

  /** @internal Prepares this behaviour for an update callback. */
  public _prepareForUpdate(
    sceneInitialized: boolean,
    activeInHierarchy: boolean,
  ): boolean {
    this._synchronizeLifecycle(sceneInitialized, activeInHierarchy);
    if (!this.activeValue) {
      return false;
    }

    if (!this.startCalled) {
      this.startCalled = true;
      this.start();
      this._synchronizeLifecycle(sceneInitialized, activeInHierarchy);
    }

    return this.activeValue;
  }

  /** @internal Reports whether the behaviour is currently active. */
  public get _lifecycleActive(): boolean {
    return this.activeValue;
  }

  protected override handleBeforeDestroy(): void {
    if (this.activeValue) {
      this.activeValue = false;
      this.onDisable();
    }
    this.onDestroy();
  }
}
