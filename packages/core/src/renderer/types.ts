import type { Vector3Like } from "../math/Vector3";

/** Canvas surface accepted by a renderer adapter. */
export interface RenderCanvas {
  /** Backing-buffer width. */
  width: number;
  /** Backing-buffer height. */
  height: number;
  /** CSS layout width when available. */
  readonly clientWidth?: number;
  /** CSS layout height when available. */
  readonly clientHeight?: number;
}

/** Opaque renderer-owned scene reference. */
export interface RendererSceneHandle {
  readonly rendererSceneHandleBrand: "RendererSceneHandle";
}

/** Opaque renderer-owned node reference. */
export interface RendererNodeHandle {
  readonly rendererNodeHandleBrand: "RendererNodeHandle";
}

/** A renderer parent can be either a scene or another node. */
export type RendererParentHandle = RendererSceneHandle | RendererNodeHandle;

/** Initialization values shared by every renderer backend. */
export interface RendererInitializeOptions {
  /** Canvas where the renderer presents frames. */
  canvas: RenderCanvas;
}

/** Transform values passed to a renderer backend. */
export interface RendererTransform {
  /** Parent-relative position. */
  position: Vector3Like;
  /** Parent-relative XYZ Euler rotation in radians. */
  rotation: Vector3Like;
  /** Parent-relative scale. */
  scale: Vector3Like;
}

/** Supported built-in mesh primitives. */
export type MeshPrimitive = "box" | "plane" | "sphere";

/** Renderer-neutral physically based material values. */
export interface StandardMaterialDescriptor {
  /** CSS-compatible color value. */
  color: string;
  /** Metallic response in the range 0–1. */
  metalness: number;
  /** Surface roughness in the range 0–1. */
  roughness: number;
}

/** Renderer-neutral group node. */
export interface GroupNodeDescriptor {
  readonly kind: "group";
}

/** Renderer-neutral perspective camera. */
export interface PerspectiveCameraNodeDescriptor {
  readonly kind: "perspective-camera";
  aspect: number;
  far: number;
  fieldOfView: number;
  near: number;
}

/** Renderer-neutral ambient light. */
export interface AmbientLightNodeDescriptor {
  readonly kind: "ambient-light";
  color: string;
  intensity: number;
}

/** Renderer-neutral directional light. */
export interface DirectionalLightNodeDescriptor {
  readonly kind: "directional-light";
  color: string;
  intensity: number;
}

/** Renderer-neutral primitive mesh. */
export interface MeshNodeDescriptor {
  readonly kind: "mesh";
  castShadow: boolean;
  depth: number;
  height: number;
  material: StandardMaterialDescriptor;
  primitive: MeshPrimitive;
  receiveShadow: boolean;
  width: number;
}

/** All node types currently understood by the core. */
export type RendererNodeDescriptor =
  | AmbientLightNodeDescriptor
  | DirectionalLightNodeDescriptor
  | GroupNodeDescriptor
  | MeshNodeDescriptor
  | PerspectiveCameraNodeDescriptor;

/**
 * Backend contract used by the core without exposing renderer-specific objects.
 */
export interface RendererAdapter {
  /** Initializes the backend. Called once per adapter instance. */
  initialize(options: RendererInitializeOptions): Promise<void> | void;
  /** Creates a renderer scene. */
  createScene(): RendererSceneHandle;
  /** Releases a renderer scene. */
  destroyScene(scene: RendererSceneHandle): void;
  /** Creates a renderer node from a neutral descriptor. */
  createNode(descriptor: RendererNodeDescriptor): RendererNodeHandle;
  /** Updates a renderer node without replacing its handle. */
  updateNode(node: RendererNodeHandle, descriptor: RendererNodeDescriptor): void;
  /** Attaches a node to a scene or another node. */
  setNodeParent(node: RendererNodeHandle, parent: RendererParentHandle | null): void;
  /** Applies a parent-relative transform to a node. */
  setNodeTransform(node: RendererNodeHandle, transform: RendererTransform): void;
  /** Controls whether a node and its descendants are visible. */
  setNodeVisible(node: RendererNodeHandle, visible: boolean): void;
  /** Releases a node and its renderer-owned resources. */
  destroyNode(node: RendererNodeHandle): void;
  /** Renders a scene through a perspective camera node. */
  render(scene: RendererSceneHandle, camera: RendererNodeHandle): void;
  /** Updates the output size and pixel ratio. */
  resize(width: number, height: number, pixelRatio: number): void;
  /** Releases the complete renderer backend. */
  destroy(): void;
}
