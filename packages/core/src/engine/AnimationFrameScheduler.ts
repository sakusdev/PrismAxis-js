/** Platform boundary used by Engine's animation loop. */
export interface AnimationFrameScheduler {
  /** Cancels a previously requested callback. */
  cancelAnimationFrame(handle: number): void;
  /** Returns a monotonic timestamp in milliseconds. */
  now(): number;
  /** Requests a callback and returns its handle. */
  requestAnimationFrame(callback: (timestamp: number) => void): number;
}

/** Creates a scheduler backed by browser animation-frame APIs. */
export function createBrowserAnimationFrameScheduler(): AnimationFrameScheduler {
  return {
    cancelAnimationFrame(handle): void {
      globalThis.cancelAnimationFrame(handle);
    },
    now(): number {
      return globalThis.performance?.now() ?? Date.now();
    },
    requestAnimationFrame(callback): number {
      if (typeof globalThis.requestAnimationFrame !== "function") {
        throw new Error(
          "requestAnimationFrame is unavailable. Supply EngineOptions.scheduler in non-browser environments.",
        );
      }
      return globalThis.requestAnimationFrame(callback);
    },
  };
}
