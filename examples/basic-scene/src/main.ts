import {
  AmbientLight,
  Behaviour,
  Camera,
  DirectionalLight,
  Engine,
  GameObject,
  MeshRenderer,
} from "@prismaxis/core";
import { ThreeRenderer } from "@prismaxis/renderer-three";
import "./style.css";

function requireElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Required element #${id} was not found.`);
  }
  return element as T;
}

class Rotator extends Behaviour {
  public override update(deltaTime: number): void {
    this.transform.rotate(deltaTime * 0.35, deltaTime, deltaTime * 0.12);
  }
}

class FpsDisplay extends Behaviour {
  private elapsed = 0;
  private frames = 0;

  public constructor(private readonly output: HTMLElement) {
    super();
  }

  public override update(deltaTime: number): void {
    this.elapsed += deltaTime;
    this.frames += 1;
    if (this.elapsed < 0.4) {
      return;
    }
    this.output.textContent = Math.round(this.frames / this.elapsed).toString();
    this.elapsed = 0;
    this.frames = 0;
  }
}

const canvas = requireElement<HTMLCanvasElement>("game");
const fpsOutput = requireElement<HTMLElement>("fps");
const statusOutput = requireElement<HTMLElement>("status");

const engine = new Engine({
  canvas,
  maxPixelRatio: 2,
  renderer: new ThreeRenderer({
    antialias: true,
    shadows: true,
  }),
});

const camera = new GameObject("Main Camera");
camera.addComponent(Camera, {
  far: 100,
  fieldOfView: 55,
  main: true,
  near: 0.1,
});
camera.transform.position.set(3.8, 2.8, 5.2);
camera.transform.lookAt(0, 0.55, 0);

const cube = new GameObject("PAX Cube").addTag("demo");
cube.transform.position.set(0, 0.75, 0);
cube.addComponent(MeshRenderer, {
  castShadow: true,
  material: {
    color: "#7457ff",
    metalness: 0.25,
    roughness: 0.38,
  },
  primitive: "box",
  receiveShadow: true,
});
cube.addComponent(Rotator);

const ground = new GameObject("Ground");
ground.transform.rotation.set(-Math.PI / 2, 0, 0);
ground.addComponent(MeshRenderer, {
  height: 16,
  material: {
    color: "#111827",
    metalness: 0.08,
    roughness: 0.86,
  },
  primitive: "plane",
  receiveShadow: true,
  width: 16,
});

const ambientLight = new GameObject("Ambient Light");
ambientLight.addComponent(AmbientLight, {
  color: "#a9b8ff",
  intensity: 0.65,
});

const directionalLight = new GameObject("Directional Light");
directionalLight.transform.rotation.set(-0.65, -0.75, 0);
directionalLight.addComponent(DirectionalLight, {
  color: "#fff1dc",
  intensity: 3.2,
});

const runtimeStats = new GameObject("Runtime Stats");
runtimeStats.addComponent(FpsDisplay, fpsOutput);

engine.scene.add(camera);
engine.scene.add(cube);
engine.scene.add(ground);
engine.scene.add(ambientLight);
engine.scene.add(directionalLight);
engine.scene.add(runtimeStats);

function updateStatus(state: string): void {
  statusOutput.textContent = state.toUpperCase();
  statusOutput.dataset.state = state;
}

requireElement<HTMLButtonElement>("start").addEventListener("click", () => {
  void engine.start().then(() => updateStatus(engine.state));
});
requireElement<HTMLButtonElement>("pause").addEventListener("click", () => {
  engine.pause();
  updateStatus(engine.state);
});
requireElement<HTMLButtonElement>("resume").addEventListener("click", () => {
  engine.resume();
  updateStatus(engine.state);
});
requireElement<HTMLButtonElement>("stop").addEventListener("click", () => {
  engine.stop();
  updateStatus(engine.state);
});

window.addEventListener(
  "beforeunload",
  () => {
    engine.destroy();
  },
  { once: true },
);

void engine.start().then(() => updateStatus(engine.state));
