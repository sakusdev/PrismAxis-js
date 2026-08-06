import { describe, expect, it } from "vitest";
import { Behaviour, GameObject, Scene } from "../index";

class LifecycleProbe extends Behaviour {
  public awakeCalls = 0;
  public destroyCalls = 0;
  public disableCalls = 0;
  public enableCalls = 0;
  public fixedUpdateCalls = 0;
  public lateUpdateCalls = 0;
  public startCalls = 0;
  public updateCalls = 0;

  public override awake(): void {
    this.awakeCalls += 1;
  }

  public override start(): void {
    this.startCalls += 1;
  }

  public override update(_deltaTime: number): void {
    this.updateCalls += 1;
  }

  public override fixedUpdate(_fixedDeltaTime: number): void {
    this.fixedUpdateCalls += 1;
  }

  public override lateUpdate(_deltaTime: number): void {
    this.lateUpdateCalls += 1;
  }

  public override onEnable(): void {
    this.enableCalls += 1;
  }

  public override onDisable(): void {
    this.disableCalls += 1;
  }

  public override onDestroy(): void {
    this.destroyCalls += 1;
  }
}

class RemoveTarget extends Behaviour {
  public target: GameObject | null = null;

  public override update(): void {
    if (this.target?.scene) {
      this.target.scene.remove(this.target);
    }
  }
}

function createInitializedProbe(): {
  gameObject: GameObject;
  probe: LifecycleProbe;
  scene: Scene;
} {
  const scene = new Scene();
  const gameObject = new GameObject();
  const probe = gameObject.addComponent(LifecycleProbe);
  scene.add(gameObject);
  scene.initialize();
  return { gameObject, probe, scene };
}

describe("Behaviour lifecycle", () => {
  it("does not update an inactive GameObject", () => {
    const { gameObject, probe, scene } = createInitializedProbe();
    gameObject.active = false;

    scene.update(1 / 60);

    expect(probe.updateCalls).toBe(0);
    expect(probe.disableCalls).toBe(1);
  });

  it("does not update a disabled Behaviour", () => {
    const { probe, scene } = createInitializedProbe();
    probe.enabled = false;

    scene.update(1 / 60);

    expect(probe.updateCalls).toBe(0);
    expect(probe.disableCalls).toBe(1);
  });

  it("calls awake exactly once", () => {
    const { probe, scene } = createInitializedProbe();

    scene.initialize();
    scene.update(1 / 60);
    scene.update(1 / 60);

    expect(probe.awakeCalls).toBe(1);
  });

  it("calls start exactly once", () => {
    const { probe, scene } = createInitializedProbe();

    scene.update(1 / 60);
    scene.fixedUpdate(1 / 60);
    scene.update(1 / 60);

    expect(probe.startCalls).toBe(1);
  });

  it("dispatches update phases while active", () => {
    const { probe, scene } = createInitializedProbe();

    scene.fixedUpdate(1 / 60);
    scene.update(1 / 60);
    scene.lateUpdate(1 / 60);

    expect(probe.fixedUpdateCalls).toBe(1);
    expect(probe.updateCalls).toBe(1);
    expect(probe.lateUpdateCalls).toBe(1);
  });

  it("calls onDestroy exactly once", () => {
    const { gameObject, probe } = createInitializedProbe();

    gameObject.destroy();
    gameObject.destroy();

    expect(probe.destroyCalls).toBe(1);
    expect(probe.destroyed).toBe(true);
  });

  it("does not update an object removed earlier in the same phase", () => {
    const scene = new Scene();
    const removerObject = new GameObject("Remover");
    const targetObject = new GameObject("Target");
    const remover = removerObject.addComponent(RemoveTarget);
    const target = targetObject.addComponent(LifecycleProbe);
    remover.target = targetObject;
    scene.add(removerObject);
    scene.add(targetObject);
    scene.initialize();

    scene.update(1 / 60);

    expect(target.updateCalls).toBe(0);
    expect(targetObject.scene).toBeNull();
  });
});
