import type { SerializedComponent } from "../components/Component";
import type { DirectionalLightNodeDescriptor } from "../renderer/types";
import { Light, type LightOptions } from "./Light";

/**
 * Parallel light source suitable for sunlight.
 */
export class DirectionalLight extends Light {
  public constructor(options: LightOptions = {}) {
    super(options);
  }

  public override getRendererDescriptor(): DirectionalLightNodeDescriptor {
    return {
      kind: "directional-light",
      color: this.color,
      intensity: this.intensity,
    };
  }

  public override toJSON(): SerializedComponent {
    return {
      ...super.toJSON(),
      color: this.color,
      intensity: this.intensity,
    };
  }
}
