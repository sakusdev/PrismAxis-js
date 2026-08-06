import type {
  MeshNodeDescriptor,
  RendererAdapter,
  RendererInitializeOptions,
  RendererNodeDescriptor,
  RendererNodeHandle,
  RendererParentHandle,
  RendererSceneHandle,
  RendererTransform,
} from "@prismaxis/core";
import * as THREE from "three";

/** ThreeRenderer configuration values. */
export interface ThreeRendererOptions {
  /** Enables alpha in the drawing buffer. */
  alpha?: boolean;
  /** Enables WebGL antialiasing. */
  antialias?: boolean;
  /** Browser GPU preference hint. */
  powerPreference?: WebGLPowerPreference;
  /** Enables Three.js shadow maps. */
  shadows?: boolean;
}

interface ThreeNodeRecord {
  descriptor: RendererNodeDescriptor;
  object: THREE.Object3D;
}

function createSceneHandle(): RendererSceneHandle {
  return {
    rendererSceneHandleBrand: "RendererSceneHandle",
  };
}

function createNodeHandle(): RendererNodeHandle {
  return {
    rendererNodeHandleBrand: "RendererNodeHandle",
  };
}

/**
 * Three.js implementation of PrismAxis's renderer-neutral adapter.
 */
export class ThreeRenderer implements RendererAdapter {
  private readonly nodeRecords = new Map<RendererNodeHandle, ThreeNodeRecord>();
  private renderer: THREE.WebGLRenderer | null = null;
  private readonly sceneRecords = new Map<RendererSceneHandle, THREE.Scene>();

  /** Creates an uninitialized Three.js adapter. */
  public constructor(private readonly options: ThreeRendererOptions = {}) {}

  public initialize(options: RendererInitializeOptions): void {
    if (this.renderer) {
      throw new Error("ThreeRenderer has already been initialized.");
    }

    this.renderer = new THREE.WebGLRenderer({
      alpha: this.options.alpha ?? false,
      antialias: this.options.antialias ?? true,
      canvas: options.canvas as HTMLCanvasElement,
      powerPreference: this.options.powerPreference ?? "high-performance",
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1;
    this.renderer.shadowMap.enabled = this.options.shadows ?? false;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  }

  public createScene(): RendererSceneHandle {
    this.requireRenderer();
    const handle = createSceneHandle();
    this.sceneRecords.set(handle, new THREE.Scene());
    return handle;
  }

  public destroyScene(scene: RendererSceneHandle): void {
    const threeScene = this.sceneRecords.get(scene);
    if (!threeScene) {
      return;
    }
    threeScene.clear();
    this.sceneRecords.delete(scene);
  }

  public createNode(descriptor: RendererNodeDescriptor): RendererNodeHandle {
    this.requireRenderer();
    const handle = createNodeHandle();
    const object = this.createThreeObject(descriptor);
    this.nodeRecords.set(handle, {
      descriptor: this.cloneDescriptor(descriptor),
      object,
    });
    return handle;
  }

  public updateNode(
    node: RendererNodeHandle,
    descriptor: RendererNodeDescriptor,
  ): void {
    const record = this.requireNode(node);
    if (record.descriptor.kind !== descriptor.kind) {
      throw new Error(
        `Cannot change renderer node kind from ${record.descriptor.kind} to ${descriptor.kind}.`,
      );
    }

    switch (descriptor.kind) {
      case "group":
        break;
      case "perspective-camera": {
        if (!(record.object instanceof THREE.PerspectiveCamera)) {
          throw new Error("Perspective camera handle has an invalid Three.js object.");
        }
        record.object.aspect = descriptor.aspect;
        record.object.far = descriptor.far;
        record.object.fov = descriptor.fieldOfView;
        record.object.near = descriptor.near;
        record.object.updateProjectionMatrix();
        break;
      }
      case "ambient-light": {
        if (!(record.object instanceof THREE.AmbientLight)) {
          throw new Error("Ambient light handle has an invalid Three.js object.");
        }
        record.object.color.set(descriptor.color);
        record.object.intensity = descriptor.intensity;
        break;
      }
      case "directional-light": {
        if (!(record.object instanceof THREE.DirectionalLight)) {
          throw new Error("Directional light handle has an invalid Three.js object.");
        }
        record.object.color.set(descriptor.color);
        record.object.intensity = descriptor.intensity;
        break;
      }
      case "mesh":
        this.updateMesh(record, descriptor);
        break;
    }

    record.descriptor = this.cloneDescriptor(descriptor);
  }

  public setNodeParent(
    node: RendererNodeHandle,
    parent: RendererParentHandle | null,
  ): void {
    const object = this.requireNode(node).object;
    object.removeFromParent();
    if (!parent) {
      return;
    }

    const scene = this.sceneRecords.get(parent as RendererSceneHandle);
    if (scene) {
      scene.add(object);
      return;
    }

    this.requireNode(parent as RendererNodeHandle).object.add(object);
  }

  public setNodeTransform(
    node: RendererNodeHandle,
    transform: RendererTransform,
  ): void {
    const object = this.requireNode(node).object;
    object.position.set(
      transform.position.x,
      transform.position.y,
      transform.position.z,
    );
    object.rotation.set(
      transform.rotation.x,
      transform.rotation.y,
      transform.rotation.z,
      "XYZ",
    );
    object.scale.set(transform.scale.x, transform.scale.y, transform.scale.z);
  }

  public setNodeVisible(node: RendererNodeHandle, visible: boolean): void {
    this.requireNode(node).object.visible = visible;
  }

  public destroyNode(node: RendererNodeHandle): void {
    const record = this.nodeRecords.get(node);
    if (!record) {
      return;
    }
    record.object.removeFromParent();
    this.disposeObject(record.object);
    this.nodeRecords.delete(node);
  }

  public render(scene: RendererSceneHandle, camera: RendererNodeHandle): void {
    const renderer = this.requireRenderer();
    const threeScene = this.requireScene(scene);
    const threeCamera = this.requireNode(camera).object;
    if (!(threeCamera instanceof THREE.PerspectiveCamera)) {
      throw new Error("ThreeRenderer.render requires a perspective camera node.");
    }
    renderer.render(threeScene, threeCamera);
  }

  public resize(width: number, height: number, pixelRatio: number): void {
    const renderer = this.requireRenderer();
    if (width <= 0 || height <= 0 || pixelRatio <= 0) {
      throw new Error("Renderer dimensions and pixel ratio must be positive.");
    }
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height, false);
  }

  public destroy(): void {
    for (const node of [...this.nodeRecords.keys()]) {
      this.destroyNode(node);
    }
    for (const scene of [...this.sceneRecords.keys()]) {
      this.destroyScene(scene);
    }
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer.forceContextLoss();
      this.renderer = null;
    }
  }

  private createThreeObject(descriptor: RendererNodeDescriptor): THREE.Object3D {
    switch (descriptor.kind) {
      case "group":
        return new THREE.Group();
      case "perspective-camera":
        return new THREE.PerspectiveCamera(
          descriptor.fieldOfView,
          descriptor.aspect,
          descriptor.near,
          descriptor.far,
        );
      case "ambient-light":
        return new THREE.AmbientLight(descriptor.color, descriptor.intensity);
      case "directional-light": {
        const light = new THREE.DirectionalLight(
          descriptor.color,
          descriptor.intensity,
        );
        light.position.set(0, 0, 1);
        return light;
      }
      case "mesh": {
        const mesh = new THREE.Mesh(
          this.createGeometry(descriptor),
          this.createMaterial(descriptor),
        );
        mesh.castShadow = descriptor.castShadow;
        mesh.receiveShadow = descriptor.receiveShadow;
        return mesh;
      }
    }
  }

  private updateMesh(record: ThreeNodeRecord, descriptor: MeshNodeDescriptor): void {
    if (!(record.object instanceof THREE.Mesh)) {
      throw new Error("Mesh handle has an invalid Three.js object.");
    }

    const previous = record.descriptor;
    if (
      previous.kind !== "mesh" ||
      previous.primitive !== descriptor.primitive ||
      previous.width !== descriptor.width ||
      previous.height !== descriptor.height ||
      previous.depth !== descriptor.depth
    ) {
      record.object.geometry.dispose();
      record.object.geometry = this.createGeometry(descriptor);
    }

    const material = record.object.material;
    if (!(material instanceof THREE.MeshStandardMaterial)) {
      throw new Error("Mesh handle has an invalid standard material.");
    }
    material.color.set(descriptor.material.color);
    material.metalness = descriptor.material.metalness;
    material.roughness = descriptor.material.roughness;
    material.needsUpdate = true;
    record.object.castShadow = descriptor.castShadow;
    record.object.receiveShadow = descriptor.receiveShadow;
  }

  private createGeometry(descriptor: MeshNodeDescriptor): THREE.BufferGeometry {
    switch (descriptor.primitive) {
      case "box":
        return new THREE.BoxGeometry(
          descriptor.width,
          descriptor.height,
          descriptor.depth,
        );
      case "plane":
        return new THREE.PlaneGeometry(descriptor.width, descriptor.height);
      case "sphere":
        return new THREE.SphereGeometry(descriptor.width / 2, 32, 20);
    }
  }

  private createMaterial(descriptor: MeshNodeDescriptor): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
      color: descriptor.material.color,
      metalness: descriptor.material.metalness,
      roughness: descriptor.material.roughness,
    });
  }

  private disposeObject(object: THREE.Object3D): void {
    object.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) {
        return;
      }
      child.geometry.dispose();
      const materials = Array.isArray(child.material)
        ? child.material
        : [child.material];
      for (const material of materials) {
        material.dispose();
      }
    });
  }

  private cloneDescriptor(descriptor: RendererNodeDescriptor): RendererNodeDescriptor {
    if (descriptor.kind === "mesh") {
      return {
        ...descriptor,
        material: { ...descriptor.material },
      };
    }
    return { ...descriptor };
  }

  private requireRenderer(): THREE.WebGLRenderer {
    if (!this.renderer) {
      throw new Error("ThreeRenderer must be initialized before use.");
    }
    return this.renderer;
  }

  private requireNode(node: RendererNodeHandle): ThreeNodeRecord {
    const record = this.nodeRecords.get(node);
    if (!record) {
      throw new Error("Unknown or destroyed renderer node handle.");
    }
    return record;
  }

  private requireScene(scene: RendererSceneHandle): THREE.Scene {
    const threeScene = this.sceneRecords.get(scene);
    if (!threeScene) {
      throw new Error("Unknown or destroyed renderer scene handle.");
    }
    return threeScene;
  }
}

type WebGLPowerPreference = "default" | "high-performance" | "low-power";
