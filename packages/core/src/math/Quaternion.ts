import { Vector3, type Vector3Like } from "./Vector3";

/**
 * A structural quaternion value.
 */
export interface QuaternionLike {
  /** X component. */
  x: number;
  /** Y component. */
  y: number;
  /** Z component. */
  z: number;
  /** Scalar component. */
  w: number;
}

/**
 * Lightweight mutable quaternion using XYZ Euler order.
 */
export class Quaternion implements QuaternionLike {
  /** Creates a quaternion. */
  public constructor(
    public x = 0,
    public y = 0,
    public z = 0,
    public w = 1,
  ) {}

  /** Sets all components. */
  public set(x: number, y: number, z: number, w: number): this {
    this.x = x;
    this.y = y;
    this.z = z;
    this.w = w;
    return this;
  }

  /** Copies another quaternion. */
  public copy(value: QuaternionLike): this {
    return this.set(value.x, value.y, value.z, value.w);
  }

  /** Returns an independent copy. */
  public clone(): Quaternion {
    return new Quaternion(this.x, this.y, this.z, this.w);
  }

  /** Normalizes this quaternion. */
  public normalize(): this {
    const magnitude = Math.hypot(this.x, this.y, this.z, this.w);
    if (magnitude === 0) {
      return this.set(0, 0, 0, 1);
    }

    const inverse = 1 / magnitude;
    return this.set(
      this.x * inverse,
      this.y * inverse,
      this.z * inverse,
      this.w * inverse,
    );
  }

  /** Multiplies this quaternion by another quaternion. */
  public multiply(value: QuaternionLike): this {
    const ax = this.x;
    const ay = this.y;
    const az = this.z;
    const aw = this.w;
    const bx = value.x;
    const by = value.y;
    const bz = value.z;
    const bw = value.w;

    return this.set(
      ax * bw + aw * bx + ay * bz - az * by,
      ay * bw + aw * by + az * bx - ax * bz,
      az * bw + aw * bz + ax * by - ay * bx,
      aw * bw - ax * bx - ay * by - az * bz,
    );
  }

  /** Inverts this quaternion. */
  public invert(): this {
    const squaredLength =
      this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w;
    if (squaredLength === 0) {
      throw new Error("Cannot invert a zero-length Quaternion.");
    }

    return this.set(
      -this.x / squaredLength,
      -this.y / squaredLength,
      -this.z / squaredLength,
      this.w / squaredLength,
    );
  }

  /** Sets this quaternion from XYZ Euler angles in radians. */
  public setFromEuler(euler: Vector3Like): this {
    const x = euler.x / 2;
    const y = euler.y / 2;
    const z = euler.z / 2;
    const c1 = Math.cos(x);
    const c2 = Math.cos(y);
    const c3 = Math.cos(z);
    const s1 = Math.sin(x);
    const s2 = Math.sin(y);
    const s3 = Math.sin(z);

    return this.set(
      s1 * c2 * c3 + c1 * s2 * s3,
      c1 * s2 * c3 - s1 * c2 * s3,
      c1 * c2 * s3 + s1 * s2 * c3,
      c1 * c2 * c3 - s1 * s2 * s3,
    );
  }

  /** Writes the equivalent XYZ Euler angles in radians. */
  public toEuler(target = new Vector3()): Vector3 {
    const x = this.x;
    const y = this.y;
    const z = this.z;
    const w = this.w;
    const m11 = 1 - 2 * (y * y + z * z);
    const m12 = 2 * (x * y - w * z);
    const m13 = 2 * (x * z + w * y);
    const m22 = 1 - 2 * (x * x + z * z);
    const m23 = 2 * (y * z - w * x);
    const m32 = 2 * (y * z + w * x);
    const m33 = 1 - 2 * (x * x + y * y);

    const eulerY = Math.asin(Math.max(-1, Math.min(1, m13)));
    if (Math.abs(m13) < 0.9999999) {
      return target.set(Math.atan2(-m23, m33), eulerY, Math.atan2(-m12, m11));
    }

    return target.set(Math.atan2(m32, m22), eulerY, 0);
  }

  /** Returns a rotated copy of a vector. */
  public rotateVector(value: Vector3Like, target = new Vector3()): Vector3 {
    return target.copy(value).applyQuaternion(this);
  }

  /** Converts the quaternion to a JSON-safe object. */
  public toJSON(): QuaternionLike {
    return { x: this.x, y: this.y, z: this.z, w: this.w };
  }
}
