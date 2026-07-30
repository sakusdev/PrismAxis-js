import type { SerializedComponent } from "../components/Component";
import type {
  MeshNodeDescriptor,
  MeshPrimitive,
  StandardMaterialDescriptor,
} from "../renderer/types";
import { RenderableComponent } from "./RenderableComponent";

/** MeshRenderer initialization values. */
export interface MeshRendererOptions {
  /** Whether the mesh casts backend shadows. */
  castShadow?: boolean;
  /** Z dimension for boxes. */
  depth?: number;
  /** Y dimension for boxes and planes. */
  height?: number;
  /** Standard physically based material values. */
  material?: Partial<StandardMaterialDescriptor>;
  /** Built-in primitive shape. */
  primitive?: MeshPrimitive;
  /** Whether the mesh receives backend shadows. */
  receiveShadow?: boolean;
  /** X dimension, or sphere diameter. */
  width?: number;
}

/**
 * Draws a built-in primitive with a standard physically based material.
 */
export class MeshRenderer extends RenderableComponent {
  public castShadow: boolean;
  public depth: number;
  public height: number;
  public readonly material: StandardMaterialDescriptor;
  public primitive: MeshPrimitive;
  public receiveShadow: boolean;
  public width: number;

  /** Creates a primitive mesh renderer. */
  public constructor(options: MeshRendererOptions = {}) {
    super();
    this.castShadow = options.castShadow ?? false;
    this.depth = options.depth ?? 1;
    this.height = options.height ?? 1;
    this.material = {
      color: options.material?.color ?? "#7c5cff",
      metalness: options.material?.metalness ?? 0,
      roughness: options.material?.roughness ?? 0.7,
    };
    this.primitive = options.primitive ?? "box";
    this.receiveShadow = options.receiveShadow ?? false;
    this.width = options.width ?? 1;
  }

  public override getRendererDescriptor(): MeshNodeDescriptor {
    if (this.width <= 0 || this.height <= 0 || this.depth <= 0) {
      throw new Error("MeshRenderer dimensions must be greater than zero.");
    }
    if (
      this.material.metalness < 0 ||
      this.material.metalness > 1 ||
      this.material.roughness < 0 ||
      this.material.roughness > 1
    ) {
      throw new Error(
        "MeshRenderer material metalness and roughness must be between 0 and 1.",
      );
    }

    return {
      kind: "mesh",
      castShadow: this.castShadow,
      depth: this.depth,
      height: this.height,
      material: { ...this.material },
      primitive: this.primitive,
      receiveShadow: this.receiveShadow,
      width: this.width,
    };
  }

  public override toJSON(): SerializedComponent {
    return {
      ...super.toJSON(),
      castShadow: this.castShadow,
      depth: this.depth,
      height: this.height,
      material: { ...this.material },
      primitive: this.primitive,
      receiveShadow: this.receiveShadow,
      width: this.width,
    };
  }
}
