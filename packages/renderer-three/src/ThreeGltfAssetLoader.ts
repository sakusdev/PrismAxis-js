import type { AssetLoadContext, AssetLoader } from "@prismaxis/core";
import * as THREE from "three";
import { GLTFLoader, type GLTF } from "three/addons/loaders/GLTFLoader.js";

/** Loaded glTF/GLB document returned by the Three.js backend. */
export type ThreeGltfAsset = GLTF;

/** Options for the Three.js glTF asset loader. */
export interface ThreeGltfAssetLoaderOptions {
  /** Optional preconfigured Three.js LoadingManager. */
  loadingManager?: THREE.LoadingManager;
}

/**
 * AssetManager-compatible glTF/GLB loader backed by Three.js GLTFLoader.
 */
export class ThreeGltfAssetLoader implements AssetLoader<ThreeGltfAsset> {
  private readonly loader: GLTFLoader;

  public constructor(options: ThreeGltfAssetLoaderOptions = {}) {
    this.loader = new GLTFLoader(options.loadingManager);
  }

  public load(url: string, context: AssetLoadContext): Promise<ThreeGltfAsset> {
    return new Promise((resolve, reject) => {
      let settled = false;

      const finishReject = (error: unknown): void => {
        if (settled) {
          return;
        }
        settled = true;
        context.signal.removeEventListener("abort", handleAbort);
        reject(error instanceof Error ? error : new Error(String(error)));
      };
      const handleAbort = (): void => {
        const error = new Error(`Loading glTF asset "${url}" was aborted.`);
        error.name = "AbortError";
        finishReject(error);
      };

      if (context.signal.aborted) {
        handleAbort();
        return;
      }
      context.signal.addEventListener("abort", handleAbort, { once: true });

      this.loader.load(
        url,
        (asset) => {
          if (context.signal.aborted || settled) {
            disposeThreeGltfAsset(asset);
            return;
          }
          settled = true;
          context.signal.removeEventListener("abort", handleAbort);
          resolve(asset);
        },
        (event) => {
          context.reportProgress({
            loaded: event.loaded,
            total: event.lengthComputable && event.total > 0 ? event.total : null,
          });
        },
        finishReject,
      );
    });
  }

  public dispose(asset: ThreeGltfAsset): void {
    disposeThreeGltfAsset(asset);
  }
}

/** Releases geometries, materials, textures, and hierarchy references in a glTF. */
export function disposeThreeGltfAsset(asset: ThreeGltfAsset): void {
  const disposedTextures = new Set<THREE.Texture>();
  const disposedMaterials = new Set<THREE.Material>();
  const disposedGeometries = new Set<THREE.BufferGeometry>();

  asset.scene.traverse((object) => {
    const renderable = object as THREE.Object3D & {
      geometry?: THREE.BufferGeometry;
      material?: THREE.Material | THREE.Material[];
    };

    if (renderable.geometry && !disposedGeometries.has(renderable.geometry)) {
      disposedGeometries.add(renderable.geometry);
      renderable.geometry.dispose();
    }

    const materials = renderable.material
      ? Array.isArray(renderable.material)
        ? renderable.material
        : [renderable.material]
      : [];
    for (const material of materials) {
      if (disposedMaterials.has(material)) {
        continue;
      }
      disposedMaterials.add(material);
      disposeMaterialTextures(material, disposedTextures);
      material.dispose();
    }
  });

  asset.scene.clear();
}

function disposeMaterialTextures(
  material: THREE.Material,
  disposedTextures: Set<THREE.Texture>,
): void {
  for (const value of Object.values(material)) {
    if (!(value instanceof THREE.Texture) || disposedTextures.has(value)) {
      continue;
    }
    disposedTextures.add(value);
    value.dispose();
  }
}
