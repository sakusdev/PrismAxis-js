import { describe, expect, it } from "vitest";
import { Behaviour, Engine, GameObject } from "../index";
import { FakeRenderer, ManualAnimationFrameScheduler } from "./helpers";

class UpdateProbe extends Behaviour {
  public updateCalls = 0;

  public override update(_deltaTime: number): void {
    this.updateCalls += 1;
  }
}

class DeferredRenderer extends FakeRenderer {
  public finishInitialization: () => void = () => {
    throw new Error("DeferredRenderer.initialize has not been called.");
  };

  public override initialize(): Promise<void> {
    return new Promise((resolve) => {
      this.finishInitialization = resolve;
    });
  }
}

describe("Engine", () => {
  it("does not advance normal updates while paused", async () => {
    const scheduler = new ManualAnimationFrameScheduler();
    const renderer = new FakeRenderer();
    const engine = new Engine({
      autoResize: false,
      canvas: {
        clientHeight: 450,
        clientWidth: 800,
        height: 450,
        width: 800,
      },
      renderer,
      scheduler,
    });
    const gameObject = new GameObject();
    const probe = gameObject.addComponent(UpdateProbe);
    engine.scene.add(gameObject);

    await engine.start();
    scheduler.runFrame(16);
    expect(probe.updateCalls).toBe(1);

    engine.pause();
    scheduler.runFrame(32);
    expect(probe.updateCalls).toBe(1);
    expect(engine.state).toBe("paused");

    engine.destroy();
    expect(renderer.destroyCalls).toBe(1);
  });

  it("releases a renderer that finishes initialization after destroy", async () => {
    const renderer = new DeferredRenderer();
    const engine = new Engine({
      autoResize: false,
      canvas: { height: 1, width: 1 },
      renderer,
      scheduler: new ManualAnimationFrameScheduler(),
    });

    const startPromise = engine.start();
    engine.destroy();
    renderer.finishInitialization();
    await startPromise;

    expect(engine.state).toBe("destroyed");
    expect(renderer.destroyCalls).toBe(1);
  });
});
