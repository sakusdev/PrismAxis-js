import type {
  AssetLoader,
  AssetLoadOptions,
  AssetProgress,
  AssetState,
} from "./types";

interface AssetEntry<TAsset> {
  readonly controller: AbortController;
  readonly loader: AssetLoader<TAsset>;
  readonly progressListeners: Set<(progress: AssetProgress) => void>;
  readonly promise: Promise<TAsset>;
  asset: TAsset | null;
  references: number;
  state: AssetState;
}

/**
 * Renderer-independent cache for asynchronous assets.
 *
 * Repeated loads of the same key share one promise and increment a reference
 * count. Call unload once for each successful load request.
 */
export class AssetManager {
  private readonly entries = new Map<string, AssetEntry<unknown>>();
  private destroyedValue = false;

  /** Whether this manager has been permanently destroyed. */
  public get destroyed(): boolean {
    return this.destroyedValue;
  }

  /** Number of loading or ready cache entries. */
  public get size(): number {
    return this.entries.size;
  }

  /** Loads or acquires a cached asset. */
  public load<TAsset>(
    key: string,
    loader: AssetLoader<TAsset>,
    options: AssetLoadOptions = {},
  ): Promise<TAsset> {
    this.assertAlive();
    const normalizedKey = this.normalizeKey(key);
    const existing = this.entries.get(normalizedKey) as AssetEntry<TAsset> | undefined;
    if (existing) {
      if (existing.loader !== loader) {
        throw new Error(
          `Asset key "${normalizedKey}" is already registered with another loader.`,
        );
      }
      existing.references += 1;
      if (options.onProgress) {
        existing.progressListeners.add(options.onProgress);
        void existing.promise.finally(() => {
          existing.progressListeners.delete(options.onProgress as (progress: AssetProgress) => void);
        });
      }
      return existing.promise;
    }

    const controller = new AbortController();
    const progressListeners = new Set<(progress: AssetProgress) => void>();
    if (options.onProgress) {
      progressListeners.add(options.onProgress);
    }

    const entry = {} as AssetEntry<TAsset>;
    const promise = loader
      .load(normalizedKey, {
        signal: controller.signal,
        reportProgress: ({ loaded, total }) => {
          const progress = this.normalizeProgress(loaded, total);
          for (const listener of progressListeners) {
            listener(progress);
          }
        },
      })
      .then((asset) => {
        if (controller.signal.aborted || this.destroyedValue) {
          void loader.dispose(asset);
          throw new DOMException("Asset load was aborted.", "AbortError");
        }
        entry.asset = asset;
        entry.state = "ready";
        return asset;
      })
      .catch((error: unknown) => {
        if (this.entries.get(normalizedKey) === entry) {
          this.entries.delete(normalizedKey);
        }
        throw error;
      })
      .finally(() => {
        progressListeners.clear();
      });

    Object.assign(entry, {
      asset: null,
      controller,
      loader,
      progressListeners,
      promise,
      references: 1,
      state: "loading" as AssetState,
    });
    this.entries.set(normalizedKey, entry as AssetEntry<unknown>);
    return promise;
  }

  /** Returns a ready cached asset without changing its reference count. */
  public get<TAsset>(key: string): TAsset | null {
    const entry = this.entries.get(this.normalizeKey(key));
    return entry?.state === "ready" ? (entry.asset as TAsset) : null;
  }

  /** Returns the state of a cached key, or null when absent. */
  public getState(key: string): AssetState | null {
    return this.entries.get(this.normalizeKey(key))?.state ?? null;
  }

  /** Releases one reference and disposes the entry when it reaches zero. */
  public async unload(key: string): Promise<boolean> {
    const normalizedKey = this.normalizeKey(key);
    const entry = this.entries.get(normalizedKey);
    if (!entry) {
      return false;
    }

    entry.references -= 1;
    if (entry.references > 0) {
      return true;
    }

    this.entries.delete(normalizedKey);
    if (entry.state === "loading") {
      entry.controller.abort();
      try {
        await entry.promise;
      } catch {
        // The caller intentionally released the last reference while loading.
      }
      return true;
    }

    if (entry.asset !== null) {
      await entry.loader.dispose(entry.asset);
      entry.asset = null;
    }
    return true;
  }

  /** Releases every cache entry and prevents future loads. */
  public async destroy(): Promise<void> {
    if (this.destroyedValue) {
      return;
    }
    this.destroyedValue = true;
    const entries = [...this.entries.entries()];
    this.entries.clear();

    await Promise.all(
      entries.map(async ([, entry]) => {
        if (entry.state === "loading") {
          entry.controller.abort();
          try {
            await entry.promise;
          } catch {
            // Expected for aborted or failed requests during destruction.
          }
          return;
        }
        if (entry.asset !== null) {
          await entry.loader.dispose(entry.asset);
          entry.asset = null;
        }
      }),
    );
  }

  private normalizeKey(key: string): string {
    const normalized = key.trim();
    if (!normalized) {
      throw new Error("Asset keys cannot be empty.");
    }
    return normalized;
  }

  private normalizeProgress(loaded: number, total: number | null): AssetProgress {
    const safeLoaded = Number.isFinite(loaded) ? Math.max(0, loaded) : 0;
    const safeTotal =
      total !== null && Number.isFinite(total) && total > 0 ? total : null;
    return {
      loaded: safeLoaded,
      total: safeTotal,
      ratio: safeTotal === null ? null : Math.min(1, safeLoaded / safeTotal),
    };
  }

  private assertAlive(): void {
    if (this.destroyedValue) {
      throw new Error("AssetManager has been destroyed.");
    }
  }
}
