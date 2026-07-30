import { Component } from "../components/Component";
import type { RendererNodeDescriptor } from "../renderer/types";

/**
 * Base class for components represented by a renderer node.
 */
export abstract class RenderableComponent extends Component {
  /** Returns the current renderer-neutral node description. */
  public abstract getRendererDescriptor(): RendererNodeDescriptor;
}
