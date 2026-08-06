export { Engine, type EngineOptions, type EngineState } from "./Engine";
export {
  GameObject,
  type ComponentType,
  type SerializedGameObject,
} from "./GameObject";
export { Scene, type SerializedScene } from "./Scene";

export { AssetManager } from "./assets/AssetManager";
export type {
  AssetLoader,
  AssetLoadContext,
  AssetLoadOptions,
  AssetProgress,
  AssetState,
} from "./assets/types";

export { Behaviour } from "./components/Behaviour";
export { Component, type SerializedComponent } from "./components/Component";
export { Transform } from "./components/Transform";

export { Quaternion, type QuaternionLike } from "./math/Quaternion";
export { Vector3, type Vector3Like } from "./math/Vector3";

export { AmbientLight } from "./rendering/AmbientLight";
export { Camera, type CameraOptions } from "./rendering/Camera";
export { DirectionalLight } from "./rendering/DirectionalLight";
export { Light, type LightOptions } from "./rendering/Light";
export { MeshRenderer, type MeshRendererOptions } from "./rendering/MeshRenderer";
export { RenderableComponent } from "./rendering/RenderableComponent";

export {
  createBrowserAnimationFrameScheduler,
  type AnimationFrameScheduler,
} from "./engine/AnimationFrameScheduler";
export type {
  AmbientLightNodeDescriptor,
  DirectionalLightNodeDescriptor,
  GroupNodeDescriptor,
  MeshNodeDescriptor,
  MeshPrimitive,
  PerspectiveCameraNodeDescriptor,
  RenderCanvas,
  RendererAdapter,
  RendererInitializeOptions,
  RendererNodeDescriptor,
  RendererNodeHandle,
  RendererParentHandle,
  RendererSceneHandle,
  RendererTransform,
  StandardMaterialDescriptor,
} from "./renderer/types";
