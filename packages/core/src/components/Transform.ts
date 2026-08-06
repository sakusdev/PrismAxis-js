import { Quaternion } from "../math/Quaternion";
import { Vector3, type Vector3Like } from "../math/Vector3";
import { Component, type SerializedComponent } from "./Component";

/**
 * Spatial state and hierarchy calculations for a GameObject.
 *
 * In the MVP, `position`, `rotation`, and `scale` are convenient aliases for
 * their local counterparts. World-space values are available through the
 * `getWorld*` methods.
 */
export class Transform extends Component {
  /** Parent-relative position. */
  public readonly localPosition = new Vector3();
  /** Parent-relative XYZ Euler rotation in radians. */
  public readonly localRotation = new Vector3();
  /** Parent-relative scale. */
  public readonly localScale = new Vector3(1, 1, 1);

  /** Alias for `localPosition`. */
  public get position(): Vector3 {
    return this.localPosition;
  }

  /** Alias for `localRotation`. */
  public get rotation(): Vector3 {
    return this.localRotation;
  }

  /** Alias for `localScale`. */
  public get scale(): Vector3 {
    return this.localScale;
  }

  /** Parent Transform, or null for a scene root. */
  public get parent(): Transform | null {
    return this.gameObject.parent?.transform ?? null;
  }

  /** Child transforms in hierarchy order. */
  public get children(): readonly Transform[] {
    return this.gameObject.children.map((child) => child.transform);
  }

  /**
   * Translates in local axes.
   */
  public translate(x: number, y: number, z: number): this;
  public translate(offset: Vector3Like): this;
  public translate(xOrOffset: number | Vector3Like, y?: number, z?: number): this {
    const offset =
      typeof xOrOffset === "number"
        ? new Vector3(xOrOffset, y ?? 0, z ?? 0)
        : new Vector3().copy(xOrOffset);
    offset.applyQuaternion(new Quaternion().setFromEuler(this.localRotation));
    this.localPosition.add(offset);
    return this;
  }

  /** Adds XYZ Euler angles in radians. */
  public rotate(x: number, y: number, z: number): this;
  public rotate(euler: Vector3Like): this;
  public rotate(xOrEuler: number | Vector3Like, y?: number, z?: number): this {
    if (typeof xOrEuler === "number") {
      this.localRotation.x += xOrEuler;
      this.localRotation.y += y ?? 0;
      this.localRotation.z += z ?? 0;
    } else {
      this.localRotation.add(xOrEuler);
    }
    return this;
  }

  /** Rotates the local -Z axis toward a world-space target. */
  public lookAt(x: number, y: number, z: number): this;
  public lookAt(target: Vector3Like): this;
  public lookAt(xOrTarget: number | Vector3Like, y?: number, z?: number): this {
    const target =
      typeof xOrTarget === "number"
        ? new Vector3(xOrTarget, y ?? 0, z ?? 0)
        : new Vector3().copy(xOrTarget);
    const direction = target.subtract(this.getWorldPosition());
    if (direction.length() === 0) {
      return this;
    }

    if (this.parent) {
      direction.applyQuaternion(this.parent.getWorldQuaternion().invert());
    }

    direction.normalize();
    const horizontal = Math.hypot(direction.x, direction.z);
    this.localRotation.set(
      Math.atan2(direction.y, horizontal),
      Math.atan2(-direction.x, -direction.z),
      0,
    );
    return this;
  }

  /** Writes and returns the world-space position. */
  public getWorldPosition(target = new Vector3()): Vector3 {
    target.copy(this.localPosition);
    if (!this.parent) {
      return target;
    }

    target.multiply(this.parent.getWorldScale());
    target.applyQuaternion(this.parent.getWorldQuaternion());
    return target.add(this.parent.getWorldPosition());
  }

  /** Writes and returns the world-space scale. */
  public getWorldScale(target = new Vector3()): Vector3 {
    target.copy(this.localScale);
    return this.parent ? target.multiply(this.parent.getWorldScale()) : target;
  }

  /** Writes and returns the world-space quaternion. */
  public getWorldQuaternion(target = new Quaternion()): Quaternion {
    target.setFromEuler(this.localRotation);
    if (!this.parent) {
      return target;
    }

    return target
      .copy(this.parent.getWorldQuaternion())
      .multiply(new Quaternion().setFromEuler(this.localRotation));
  }

  /** Writes and returns world-space XYZ Euler angles. */
  public getWorldRotation(target = new Vector3()): Vector3 {
    return this.getWorldQuaternion().toEuler(target);
  }

  /**
   * Returns a column-major world matrix as 16 renderer-neutral numbers.
   */
  public getWorldMatrix(): readonly number[] {
    const position = this.getWorldPosition();
    const scale = this.getWorldScale();
    const quaternion = this.getWorldQuaternion();
    const x2 = quaternion.x + quaternion.x;
    const y2 = quaternion.y + quaternion.y;
    const z2 = quaternion.z + quaternion.z;
    const xx = quaternion.x * x2;
    const xy = quaternion.x * y2;
    const xz = quaternion.x * z2;
    const yy = quaternion.y * y2;
    const yz = quaternion.y * z2;
    const zz = quaternion.z * z2;
    const wx = quaternion.w * x2;
    const wy = quaternion.w * y2;
    const wz = quaternion.w * z2;

    return [
      (1 - (yy + zz)) * scale.x,
      (xy + wz) * scale.x,
      (xz - wy) * scale.x,
      0,
      (xy - wz) * scale.y,
      (1 - (xx + zz)) * scale.y,
      (yz + wx) * scale.y,
      0,
      (xz + wy) * scale.z,
      (yz - wx) * scale.z,
      (1 - (xx + yy)) * scale.z,
      0,
      position.x,
      position.y,
      position.z,
      1,
    ];
  }

  /** @internal Restores world transform values after a hierarchy change. */
  public _setWorldTransform(
    worldPosition: Vector3Like,
    worldRotation: Quaternion,
    worldScale: Vector3Like,
  ): void {
    if (!this.parent) {
      this.localPosition.copy(worldPosition);
      worldRotation.toEuler(this.localRotation);
      this.localScale.copy(worldScale);
      return;
    }

    const parentPosition = this.parent.getWorldPosition();
    const parentRotationInverse = this.parent.getWorldQuaternion().invert();
    const parentScale = this.parent.getWorldScale();
    this.localPosition
      .copy(worldPosition)
      .subtract(parentPosition)
      .applyQuaternion(parentRotationInverse)
      .divide(parentScale);
    parentRotationInverse.multiply(worldRotation).toEuler(this.localRotation);
    this.localScale.copy(worldScale).divide(parentScale);
  }

  public override toJSON(): SerializedComponent {
    return {
      ...super.toJSON(),
      localPosition: this.localPosition.toJSON(),
      localRotation: this.localRotation.toJSON(),
      localScale: this.localScale.toJSON(),
    };
  }
}
