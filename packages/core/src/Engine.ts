import {
  createBrowserAnimationFrameScheduler,
  type AnimationFrameScheduler,
} from "./engine/AnimationFrameScheduler";
import type { GameObject } from "./GameObject";
import type {
  RenderCanvas,
  RendererAdapter,
  RendererNodeHandle,
  RendererParentHandle,
  RendererSceneHandle,
} from "./renderer/types";
import { Camera } from "./rendering/Camera";
import { RenderableComponent } from "./rendering/RenderableComponent";
import { Scene } from "./Scene";

/** Runtime state of an Engine instance. */
export type EngineState =
  "destroyed" | "idle" | "paused" | "running" | "starting" | "stopped";

/** Engine initialization values. */
export interface EngineOptions {
  /** Presentation canvas. */
  canvas: RenderCanvas;
  /** Enables automatic response to window resize events. */
  autoResize?: boolean;
  /** Fixed simulation step in seconds. */
  fixedDeltaTime?: number;
  /** Maximum accepted variable frame delta in seconds. */
  maxDeltaTime?: number;
  /** Prevents a fixed-update spiral after a long frame. */
  maxFixedSteps?: number;
  /** Upper limit for high-DPI rendering cost. */
  maxPixelRatio?: number;
  /** Renderer backend implementation. */
  renderer: RendererAdapter;
  /** Optional scheduler for tests or non-browser hosts. */
  scheduler?: AnimationFrameScheduler;
  /** Optional prebuilt Scene. */
  scene?: Scene;
}

/**
 * Coordinates Scene lifecycle, fixed/variable updates, rendering, and resizing.
 */
export class Engine {
  /** Active Scene. */
  public readonly scene: Scene;
  /** Fixed simulation step in seconds. */
  public readonly fixedDeltaTime: number;

  private accumulator = 0;
  private readonly autoResize: boolean;
  private destroyedRendererGraph = false;
  private frameHandle: number | null = null;
  private readonly gameObjectNodes = new Map<GameObject, RendererNodeHandle>();
  private initializedRenderer = false;
  private lastDeltaTimeValue = 0;
  private lastTimestamp = 0;
  private readonly maxDeltaTime: number;
  private readonly maxFixedSteps: number;
  private readonly maxPixelRatio: number;
  private readonly renderComponentNodes = new Map<
    RenderableComponent,
    RendererNodeHandle
  >();
  private rendererScene: RendererSceneHandle | null = null;
  private resizeListenerAttached = false;
  private stateValue: EngineState = "idle";

  private readonly handleAnimationFrame = (timestamp: number): void => {
    this.frameHandle = null;
    if (this.stateValue !== "running") {
      return;
    }

    const deltaTime = Math.min(
      this.maxDeltaTime,
      Math.max(0, (timestamp - this.lastTimestamp) / 1_000),
    );
    this.lastTimestamp = timestamp;

    try {
      this.advance(deltaTime);
    } catch (error) {
      this.stop();
      throw error;
    }

    if (this.stateValue === "running") {
      this.scheduleNextFrame();
    }
  };

  private readonly handleResize = (): void => {
    this.resize();
  };

  /** Creates an Engine. Renderer allocation is deferred until start. */
  public constructor(private readonly options: EngineOptions) {
    this.scene = options.scene ?? new Scene();
    this.fixedDeltaTime = options.fixedDeltaTime ?? 1 / 60;
    this.autoResize = options.autoResize ?? true;
    this.maxDeltaTime = options.maxDeltaTime ?? 0.1;
    this.maxFixedSteps = options.maxFixedSteps ?? 5;
    this.maxPixelRatio = options.maxPixelRatio ?? 2;
    this.scheduler = options.scheduler ?? createBrowserAnimationFrameScheduler();

    if (this.fixedDeltaTime <= 0) {
      throw new Error("Engine.fixedDeltaTime must be greater than zero.");
    }
    if (this.maxDeltaTime <= 0 || this.maxFixedSteps < 1) {
      throw new Error("Engine delta limits must be positive.");
    }
    if (this.maxPixelRatio <= 0) {
      throw new Error("Engine.maxPixelRatio must be greater than zero.");
    }
  }

  private readonly scheduler: AnimationFrameScheduler;

  /** Current loop state. */
  public get state(): EngineState {
    return this.stateValue;
  }

  /** Most recently processed variable frame delta in seconds. */
  public get deltaTime(): number {
    return this.lastDeltaTimeValue;
  }

  /** Initializes resources and begins the animation loop. */
  public async start(): Promise<void> {
    this.assertNotDestroyed();
    if (this.stateValue === "running" || this.stateValue === "starting") {
      return;
    }
    if (this.stateValue === "paused") {
      this.resume();
      return;
    }

    this.stateValue = "starting";
    try {
      if (!this.initializedRenderer) {
        await this.options.renderer.initialize({ canvas: this.options.canvas });
        if (this.hasState("destroyed")) {
          this.options.renderer.destroy();
          return;
        }
        this.initializedRenderer = true;
        this.rendererScene = this.options.renderer.createScene();
      }
    } catch (error) {
      if (!this.hasState("destroyed")) {
        this.stateValue = "stopped";
      }
      throw error;
    }

    if (this.stateValue !== "starting") {
      return;
    }
    if (!this.scene.initialized) {
      this.scene.initialize();
    }
    this.attachResizeListener();
    this.resize();
    this.synchronizeRendererGraph();
    this.stateValue = "running";
    this.lastTimestamp = this.scheduler.now();
    this.scheduleNextFrame();
  }

  /** Pauses updates and rendering while preserving all state. */
  public pause(): void {
    if (this.stateValue !== "running") {
      return;
    }
    this.cancelScheduledFrame();
    this.stateValue = "paused";
  }

  /** Resumes a paused loop without introducing a large delta. */
  public resume(): void {
    this.assertNotDestroyed();
    if (this.stateValue !== "paused") {
      return;
    }
    this.stateValue = "running";
    this.lastTimestamp = this.scheduler.now();
    this.scheduleNextFrame();
  }

  /** Stops the loop. A later start preserves Scene lifecycle history. */
  public stop(): void {
    if (this.stateValue === "destroyed") {
      return;
    }
    this.cancelScheduledFrame();
    this.accumulator = 0;
    this.lastDeltaTimeValue = 0;
    this.stateValue = "stopped";
  }

  /**
   * Advances one frame without scheduling. Useful for controlled hosts and tests.
   */
  public step(deltaTime: number): void {
    this.assertNotDestroyed();
    if (this.stateValue !== "running") {
      return;
    }
    this.advance(Math.min(this.maxDeltaTime, Math.max(0, deltaTime)));
  }

  /** Applies canvas dimensions, high-DPI limits, and camera aspect. */
  public resize(width?: number, height?: number): void {
    this.assertNotDestroyed();
    const resolvedWidth = Math.max(
      1,
      Math.floor(width ?? this.options.canvas.clientWidth ?? this.options.canvas.width),
    );
    const resolvedHeight = Math.max(
      1,
      Math.floor(
        height ?? this.options.canvas.clientHeight ?? this.options.canvas.height,
      ),
    );
    const devicePixelRatio =
      typeof globalThis.devicePixelRatio === "number" ? globalThis.devicePixelRatio : 1;
    const pixelRatio = Math.min(this.maxPixelRatio, devicePixelRatio);

    for (const camera of this.scene.getComponents(Camera)) {
      if (camera.autoAspect) {
        camera.aspect = resolvedWidth / resolvedHeight;
      }
    }
    if (this.initializedRenderer) {
      this.options.renderer.resize(resolvedWidth, resolvedHeight, pixelRatio);
    }
  }

  /** Stops, destroys the Scene, and releases all renderer resources. */
  public destroy(): void {
    if (this.stateValue === "destroyed") {
      return;
    }
    this.stop();
    this.detachResizeListener();
    this.scene.destroy();
    this.destroyRendererGraph();
    if (this.initializedRenderer) {
      this.options.renderer.destroy();
    }
    this.stateValue = "destroyed";
  }

  private advance(deltaTime: number): void {
    if (!Number.isFinite(deltaTime)) {
      throw new Error("Engine deltaTime must be finite.");
    }
    this.lastDeltaTimeValue = deltaTime;
    this.accumulator += deltaTime;

    let fixedSteps = 0;
    while (this.accumulator >= this.fixedDeltaTime && fixedSteps < this.maxFixedSteps) {
      this.scene.fixedUpdate(this.fixedDeltaTime);
      this.accumulator -= this.fixedDeltaTime;
      fixedSteps += 1;
    }
    if (fixedSteps === this.maxFixedSteps) {
      this.accumulator = Math.min(this.accumulator, this.fixedDeltaTime);
    }

    this.scene.update(deltaTime);
    this.scene.lateUpdate(deltaTime);
    this.synchronizeRendererGraph();
    this.render();
  }

  private render(): void {
    if (!this.rendererScene) {
      return;
    }
    const cameras = this.scene
      .getComponents(Camera)
      .filter(
        (camera) =>
          camera.enabled && camera.gameObject.activeInHierarchy && !camera.destroyed,
      );
    const camera = cameras.find((value) => value.main) ?? cameras[0];
    if (!camera) {
      return;
    }

    const cameraNode = this.renderComponentNodes.get(camera);
    if (cameraNode) {
      this.options.renderer.render(this.rendererScene, cameraNode);
    }
  }

  private synchronizeRendererGraph(): void {
    if (!this.rendererScene || this.destroyedRendererGraph) {
      return;
    }

    const activeGameObjects = new Set(this.scene.getAllGameObjects());
    const activeRenderComponents = new Set<RenderableComponent>();

    for (const gameObject of activeGameObjects) {
      let gameObjectNode = this.gameObjectNodes.get(gameObject);
      if (!gameObjectNode) {
        gameObjectNode = this.options.renderer.createNode({ kind: "group" });
        this.gameObjectNodes.set(gameObject, gameObjectNode);
      }

      const parent: RendererParentHandle = gameObject.parent
        ? this.requireGameObjectNode(gameObject.parent)
        : this.rendererScene;
      this.options.renderer.setNodeParent(gameObjectNode, parent);
      this.options.renderer.setNodeTransform(gameObjectNode, {
        position: gameObject.transform.localPosition,
        rotation: gameObject.transform.localRotation,
        scale: gameObject.transform.localScale,
      });
      this.options.renderer.setNodeVisible(
        gameObjectNode,
        gameObject.activeInHierarchy,
      );

      for (const component of gameObject.components) {
        if (!(component instanceof RenderableComponent) || component.destroyed) {
          continue;
        }
        activeRenderComponents.add(component);
        let componentNode = this.renderComponentNodes.get(component);
        const descriptor = component.getRendererDescriptor();
        if (!componentNode) {
          componentNode = this.options.renderer.createNode(descriptor);
          this.renderComponentNodes.set(component, componentNode);
        } else {
          this.options.renderer.updateNode(componentNode, descriptor);
        }
        this.options.renderer.setNodeParent(componentNode, gameObjectNode);
        this.options.renderer.setNodeVisible(
          componentNode,
          component.enabled && gameObject.activeInHierarchy,
        );
      }
    }

    for (const [component, node] of [...this.renderComponentNodes]) {
      if (!activeRenderComponents.has(component)) {
        this.options.renderer.destroyNode(node);
        this.renderComponentNodes.delete(component);
      }
    }
    for (const [gameObject, node] of [...this.gameObjectNodes]) {
      if (!activeGameObjects.has(gameObject)) {
        this.options.renderer.destroyNode(node);
        this.gameObjectNodes.delete(gameObject);
      }
    }
  }

  private requireGameObjectNode(gameObject: GameObject): RendererNodeHandle {
    const node = this.gameObjectNodes.get(gameObject);
    if (!node) {
      throw new Error(
        `Renderer hierarchy is missing parent GameObject "${gameObject.name}".`,
      );
    }
    return node;
  }

  private destroyRendererGraph(): void {
    if (this.destroyedRendererGraph) {
      return;
    }
    for (const node of this.renderComponentNodes.values()) {
      this.options.renderer.destroyNode(node);
    }
    for (const node of this.gameObjectNodes.values()) {
      this.options.renderer.destroyNode(node);
    }
    this.renderComponentNodes.clear();
    this.gameObjectNodes.clear();
    if (this.rendererScene) {
      this.options.renderer.destroyScene(this.rendererScene);
      this.rendererScene = null;
    }
    this.destroyedRendererGraph = true;
  }

  private scheduleNextFrame(): void {
    if (this.frameHandle === null) {
      this.frameHandle = this.scheduler.requestAnimationFrame(
        this.handleAnimationFrame,
      );
    }
  }

  private cancelScheduledFrame(): void {
    if (this.frameHandle === null) {
      return;
    }
    this.scheduler.cancelAnimationFrame(this.frameHandle);
    this.frameHandle = null;
  }

  private attachResizeListener(): void {
    if (
      !this.autoResize ||
      this.resizeListenerAttached ||
      typeof globalThis.addEventListener !== "function"
    ) {
      return;
    }
    globalThis.addEventListener("resize", this.handleResize);
    this.resizeListenerAttached = true;
  }

  private detachResizeListener(): void {
    if (
      !this.resizeListenerAttached ||
      typeof globalThis.removeEventListener !== "function"
    ) {
      return;
    }
    globalThis.removeEventListener("resize", this.handleResize);
    this.resizeListenerAttached = false;
  }

  private assertNotDestroyed(): void {
    if (this.stateValue === "destroyed") {
      throw new Error("Engine has been destroyed.");
    }
  }

  private hasState(state: EngineState): boolean {
    return this.stateValue === state;
  }
}
