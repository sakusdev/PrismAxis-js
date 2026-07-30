import type { SerializedComponent } from "../components/Component";
import type { AmbientLightNodeDescriptor } from "../renderer/types";
import { Light, type LightOptions } from "./Light";

/**
 * Uniform light that illuminates every surface equally.
 */
export class AmbientLight extends Light {
  public constructor(options: LightOptions = {}) {
    super(options);
  }

  public override getRendererDescriptor(): AmbientLightNodeDescriptor {
    return {
      kind: "ambient-light",
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
