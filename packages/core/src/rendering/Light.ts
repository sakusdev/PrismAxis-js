import { RenderableComponent } from "./RenderableComponent";

/** Shared light initialization values. */
export interface LightOptions {
  /** CSS-compatible light color. */
  color?: string;
  /** Light strength. */
  intensity?: number;
}

/**
 * Base class for renderer-independent lights.
 */
export abstract class Light extends RenderableComponent {
  public color: string;
  public intensity: number;

  protected constructor(options: LightOptions = {}) {
    super();
    this.color = options.color ?? "#ffffff";
    this.intensity = options.intensity ?? 1;
  }
}
