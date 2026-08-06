import type { GameObject } from "../GameObject";
import type { Transform } from "./Transform";

/** JSON-safe component metadata. */
export interface SerializedComponent {
  enabled: boolean;
  type: string;
  [key: string]: unknown;
}

/**
 * Base unit of reusable GameObject functionality.
 */
export class Component {
  private attachedGameObject: GameObject | null = null;
  private enabledValue = true;
  private destroyedValue = false;

  /** GameObject that owns this component. */
  public get gameObject(): GameObject {
    if (!this.attachedGameObject) {
      throw new Error(`${this.constructor.name} is not attached to a GameObject.`);
    }
    return this.attachedGameObject;
  }

  /** Transform of the owning GameObject. */
  public get transform(): Transform {
    return this.gameObject.transform;
  }

  /** Whether this component is eligible to run. */
  public get enabled(): boolean {
    return this.enabledValue;
  }

  public set enabled(value: boolean) {
    if (this.destroyedValue) {
      throw new Error(`Cannot enable or disable destroyed ${this.constructor.name}.`);
    }
    if (this.enabledValue === value) {
      return;
    }

    this.enabledValue = value;
    this.attachedGameObject?._refreshLifecycle();
  }

  /** Whether this component has been destroyed. */
  public get destroyed(): boolean {
    return this.destroyedValue;
  }

  /**
   * Removes and destroys this component. Repeated calls are safe.
   */
  public destroy(): void {
    if (this.destroyedValue) {
      return;
    }

    if (this.attachedGameObject) {
      this.attachedGameObject._removeComponentInstance(this);
      return;
    }

    this._finalizeDestroy();
  }

  /** Returns basic JSON-safe metadata. */
  public toJSON(): SerializedComponent {
    return {
      enabled: this.enabled,
      type: this.constructor.name,
    };
  }

  /** @internal Attaches this component exactly once. */
  public _attach(gameObject: GameObject): void {
    if (this.attachedGameObject || this.destroyedValue) {
      throw new Error(`${this.constructor.name} cannot be attached more than once.`);
    }
    this.attachedGameObject = gameObject;
  }

  /** @internal Performs final destruction while ownership is still readable. */
  public _finalizeDestroy(): void {
    if (this.destroyedValue) {
      return;
    }

    this.handleBeforeDestroy();
    this.destroyedValue = true;
    this.attachedGameObject = null;
  }

  /** Hook used by subclasses before ownership is cleared. */
  protected handleBeforeDestroy(): void {}
}
