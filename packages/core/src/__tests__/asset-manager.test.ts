import { describe, expect, it, vi } from "vitest";
import { AssetManager, type AssetLoader } from "../index";

interface TestAsset {
  readonly url: string;
}

function createLoader(): AssetLoader<TestAsset> & {
  dispose: ReturnType<typeof vi.fn>;
  load: ReturnType<typeof vi.fn>;
} {
  return {
    dispose: vi.fn(),
    load: vi.fn(async (url: string) => ({ url })),
  };
}

describe("AssetManager", () => {
  it("deduplicates concurrent requests and disposes after the last release", async () => {
    const manager = new AssetManager();
    const loader = createLoader();

    const first = manager.load("/models/robot.glb", loader);
    const second = manager.load("/models/robot.glb", loader);

    expect(first).toBe(second);
    expect(loader.load).toHaveBeenCalledTimes(1);
    const asset = await first;
    expect(manager.get<TestAsset>("/models/robot.glb")).toBe(asset);

    await manager.unload("/models/robot.glb");
    expect(loader.dispose).not.toHaveBeenCalled();
    await manager.unload("/models/robot.glb");
    expect(loader.dispose).toHaveBeenCalledOnce();
    expect(manager.size).toBe(0);
  });

  it("normalizes progress and broadcasts it to subscribers", async () => {
    const manager = new AssetManager();
    const reports: number[] = [];
    const loader: AssetLoader<TestAsset> = {
      dispose: vi.fn(),
      async load(url, context) {
        context.reportProgress({ loaded: 5, total: 10 });
        return { url };
      },
    };

    await manager.load("asset", loader, {
      onProgress: (progress) => reports.push(progress.ratio ?? -1),
    });

    expect(reports).toEqual([0.5]);
  });

  it("aborts an in-flight request when its final reference is released", async () => {
    const manager = new AssetManager();
    let observedSignal: AbortSignal | null = null;
    const loader: AssetLoader<TestAsset> = {
      dispose: vi.fn(),
      load(_url, context) {
        observedSignal = context.signal;
        return new Promise((_resolve, reject) => {
          context.signal.addEventListener("abort", () => reject(new Error("aborted")));
        });
      },
    };

    const pending = manager.load("slow", loader);
    await manager.unload("slow");

    expect(observedSignal?.aborted).toBe(true);
    await expect(pending).rejects.toThrow("aborted");
  });
});
