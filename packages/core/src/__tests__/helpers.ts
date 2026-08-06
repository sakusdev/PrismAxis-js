import type {
  AnimationFrameScheduler,
  RendererAdapter,
  RendererInitializeOptions,
  RendererNodeDescriptor,
  RendererNodeHandle,
  RendererParentHandle,
  RendererSceneHandle,
  RendererTransform,
} from "../index";

export class ManualAnimationFrameScheduler implements AnimationFrameScheduler {
  private readonly callbacks = new Map<number, (timestamp: number) => void>();
  private nextHandle = 0;
  private timestamp = 0;

  public cancelAnimationFrame(handle: number): void {
    this.callbacks.delete(handle);
  }

  public now(): number {
    return this.timestamp;
  }

  public requestAnimationFrame(callback: (timestamp: number) => void): number {
    this.nextHandle += 1;
    this.callbacks.set(this.nextHandle, callback);
    return this.nextHandle;
  }

  public runFrame(timestamp: number): void {
    this.timestamp = timestamp;
    const callbacks = [...this.callbacks.values()];
    this.callbacks.clear();
    for (const callback of callbacks) {
      callback(timestamp);
    }
  }
}

export class FakeRenderer implements RendererAdapter {
  public destroyCalls = 0;
  public renderCalls = 0;

  public initialize(_options: RendererInitializeOptions): void {}

  public createScene(): RendererSceneHandle {
    return { rendererSceneHandleBrand: "RendererSceneHandle" };
  }

  public destroyScene(_scene: RendererSceneHandle): void {}

  public createNode(_descriptor: RendererNodeDescriptor): RendererNodeHandle {
    return { rendererNodeHandleBrand: "RendererNodeHandle" };
  }

  public updateNode(
    _node: RendererNodeHandle,
    _descriptor: RendererNodeDescriptor,
  ): void {}

  public setNodeParent(
    _node: RendererNodeHandle,
    _parent: RendererParentHandle | null,
  ): void {}

  public setNodeTransform(
    _node: RendererNodeHandle,
    _transform: RendererTransform,
  ): void {}

  public setNodeVisible(_node: RendererNodeHandle, _visible: boolean): void {}

  public destroyNode(_node: RendererNodeHandle): void {}

  public render(_scene: RendererSceneHandle, _camera: RendererNodeHandle): void {
    this.renderCalls += 1;
  }

  public resize(_width: number, _height: number, _pixelRatio: number): void {}

  public destroy(): void {
    this.destroyCalls += 1;
  }
}
