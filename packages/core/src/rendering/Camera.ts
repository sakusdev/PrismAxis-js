import type { PerspectiveCameraNodeDescriptor } from "../renderer/types";
import type { SerializedComponent } from "../components/Component";
import { RenderableComponent } from "./RenderableComponent";

/** Perspective camera initialization values. */
export interface CameraOptions {
  /** Width-to-height ratio. */
  aspect?: number;
  /** Whether Engine.resize updates aspect automatically. */
  autoAspect?: boolean;
  /** Far clipping distance. */
  far?: number;
  /** Vertical field of view in degrees. */
  fieldOfView?: number;
  /** Marks this as the preferred render camera. */
  main?: boolean;
  /** Near clipping distance. */
  near?: number;
}

/**
 * Renderer-independent perspective camera component.
 */
export class Camera extends RenderableComponent {
  public aspect: number;
  public autoAspect: boolean;
  public far: number;
  public fieldOfView: number;
  public main: boolean;
  public near: number;

  /** Creates a perspective camera. */
  public constructor(options: CameraOptions = {}) {
    super();
    this.aspect = options.aspect ?? 1;
    this.autoAspect = options.autoAspect ?? true;
    this.far = options.far ?? 1_000;
    this.fieldOfView = options.fieldOfView ?? 60;
    this.main = options.main ?? false;
    this.near = options.near ?? 0.1;
  }

  public override getRendererDescriptor(): PerspectiveCameraNodeDescriptor {
    if (this.fieldOfView <= 0 || this.fieldOfView >= 180) {
      throw new Error("Camera.fieldOfView must be between 0 and 180 degrees.");
    }
    if (this.near <= 0 || this.far <= this.near) {
      throw new Error("Camera clipping planes must satisfy 0 < near < far.");
    }
    if (this.aspect <= 0) {
      throw new Error("Camera.aspect must be greater than zero.");
    }

    return {
      kind: "perspective-camera",
      aspect: this.aspect,
      far: this.far,
      fieldOfView: this.fieldOfView,
      near: this.near,
    };
  }

  public override toJSON(): SerializedComponent {
    return {
      ...super.toJSON(),
      aspect: this.aspect,
      autoAspect: this.autoAspect,
      far: this.far,
      fieldOfView: this.fieldOfView,
      main: this.main,
      near: this.near,
    };
  }
}
