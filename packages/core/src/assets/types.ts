/** Progress snapshot emitted while an asset is loading. */
export interface AssetProgress {
  /** Bytes or logical units loaded so far. */
  loaded: number;
  /** Total bytes or units when known. */
  total: number | null;
  /** Normalized progress from 0 to 1 when the total is known. */
  ratio: number | null;
}

/** Context provided to an asset loader for cancellation and progress reporting. */
export interface AssetLoadContext {
  /** Aborted when the cache entry is unloaded before completion. */
  readonly signal: AbortSignal;
  /** Reports a new progress snapshot to every subscriber. */
  reportProgress(progress: Omit<AssetProgress, "ratio">): void;
}

/** Backend-specific strategy for loading and disposing one asset type. */
export interface AssetLoader<TAsset> {
  /** Loads one asset from a URL. */
  load(url: string, context: AssetLoadContext): Promise<TAsset>;
  /** Releases every resource owned by a successfully loaded asset. */
  dispose(asset: TAsset): Promise<void> | void;
}

/** Optional callbacks for a load request. */
export interface AssetLoadOptions {
  /** Receives progress updates for both new and already-running requests. */
  onProgress?: (progress: AssetProgress) => void;
}

/** Current state of one cached asset entry. */
export type AssetState = "loading" | "ready";
