import type { QuaternionLike } from "./Quaternion";

/**
 * A structural three-dimensional vector value.
 */
export interface Vector3Like {
  /** X-axis value. */
  x: number;
  /** Y-axis value. */
  y: number;
  /** Z-axis value. */
  z: number;
}

/**
 * Lightweight mutable 3D vector used by the renderer-independent core.
 */
export class Vector3 implements Vector3Like {
  /** Creates a vector. */
  public constructor(
    public x = 0,
    public y = 0,
    public z = 0,
  ) {}

  /** Sets all components and returns this vector. */
  public set(x: number, y: number, z: number): this {
    this.x = x;
    this.y = y;
    this.z = z;
    return this;
  }

  /** Copies another vector and returns this vector. */
  public copy(value: Vector3Like): this {
    return this.set(value.x, value.y, value.z);
  }

  /** Returns an independent copy. */
  public clone(): Vector3 {
    return new Vector3(this.x, this.y, this.z);
  }

  /** Adds another vector component-wise. */
  public add(value: Vector3Like): this {
    this.x += value.x;
    this.y += value.y;
    this.z += value.z;
    return this;
  }

  /** Subtracts another vector component-wise. */
  public subtract(value: Vector3Like): this {
    this.x -= value.x;
    this.y -= value.y;
    this.z -= value.z;
    return this;
  }

  /** Multiplies by another vector component-wise. */
  public multiply(value: Vector3Like): this {
    this.x *= value.x;
    this.y *= value.y;
    this.z *= value.z;
    return this;
  }

  /** Divides by another vector component-wise. */
  public divide(value: Vector3Like): this {
    if (value.x === 0 || value.y === 0 || value.z === 0) {
      throw new Error("Cannot divide a Vector3 by a zero component.");
    }

    this.x /= value.x;
    this.y /= value.y;
    this.z /= value.z;
    return this;
  }

  /** Multiplies all components by a scalar. */
  public multiplyScalar(scalar: number): this {
    this.x *= scalar;
    this.y *= scalar;
    this.z *= scalar;
    return this;
  }

  /** Returns the vector magnitude. */
  public length(): number {
    return Math.hypot(this.x, this.y, this.z);
  }

  /** Normalizes this vector when its magnitude is non-zero. */
  public normalize(): this {
    const magnitude = this.length();
    return magnitude === 0 ? this : this.multiplyScalar(1 / magnitude);
  }

  /** Returns the dot product with another vector. */
  public dot(value: Vector3Like): number {
    return this.x * value.x + this.y * value.y + this.z * value.z;
  }

  /** Replaces this vector with its cross product with another vector. */
  public cross(value: Vector3Like): this {
    const x = this.y * value.z - this.z * value.y;
    const y = this.z * value.x - this.x * value.z;
    const z = this.x * value.y - this.y * value.x;
    return this.set(x, y, z);
  }

  /** Rotates this vector by a quaternion. */
  public applyQuaternion(quaternion: QuaternionLike): this {
    const { x, y, z } = this;
    const qx = quaternion.x;
    const qy = quaternion.y;
    const qz = quaternion.z;
    const qw = quaternion.w;

    const ix = qw * x + qy * z - qz * y;
    const iy = qw * y + qz * x - qx * z;
    const iz = qw * z + qx * y - qy * x;
    const iw = -qx * x - qy * y - qz * z;

    this.x = ix * qw + iw * -qx + iy * -qz - iz * -qy;
    this.y = iy * qw + iw * -qy + iz * -qx - ix * -qz;
    this.z = iz * qw + iw * -qz + ix * -qy - iy * -qx;
    return this;
  }

  /** Tests approximate equality. */
  public equals(value: Vector3Like, epsilon = Number.EPSILON): boolean {
    return (
      Math.abs(this.x - value.x) <= epsilon &&
      Math.abs(this.y - value.y) <= epsilon &&
      Math.abs(this.z - value.z) <= epsilon
    );
  }

  /** Converts the vector to a JSON-safe object. */
  public toJSON(): Vector3Like {
    return { x: this.x, y: this.y, z: this.z };
  }
}
