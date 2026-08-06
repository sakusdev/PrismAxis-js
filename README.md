# PrismAxis.js

> **PrismAxis.js — Build worlds in the browser.**

PrismAxis.js (abbreviated **PAX**) is a TypeScript game-engine foundation for
building web games and interactive 3D applications with Unity-inspired concepts.
It uses Three.js today, but application code works through a renderer-neutral core
instead of depending on Three.js objects directly.

> [!WARNING]
> PrismAxis.js is in early development. Public APIs can change before the first
> stable release.

## Features

- Unity-inspired `Engine`, `Scene`, `GameObject`, `Component`, and `Behaviour`
- `awake`, `start`, `update`, `fixedUpdate`, `lateUpdate`, enable/disable, and
  destruction lifecycle
- Transform hierarchy with local and world-space calculations
- Perspective cameras, ambient/directional lights, and primitive mesh rendering
- Renderer abstraction backed by a separate Three.js adapter
- Fixed-timestep simulation with a bounded accumulator
- Explicit resource destruction and removable browser listeners
- High-DPI limits and responsive mobile-browser output
- Strict TypeScript, Vitest, ESLint, Prettier, and GitHub Actions

## Installation

The packages are not published to npm yet. Install and run the workspace:

```bash
git clone https://github.com/sakusdev/PrismAxis-js.git
cd PrismAxis-js
corepack enable
pnpm install
pnpm dev
```

After the planned npm release, applications will install the runtime packages with:

```bash
pnpm add @prismaxis/core @prismaxis/renderer-three three
```

## Quick Start

```ts
import {
  Behaviour,
  Camera,
  DirectionalLight,
  Engine,
  GameObject,
  MeshRenderer,
} from "@prismaxis/core";
import { ThreeRenderer } from "@prismaxis/renderer-three";

class Rotator extends Behaviour {
  public override update(deltaTime: number): void {
    this.transform.rotate(0, deltaTime, 0);
  }
}

const canvas = document.querySelector<HTMLCanvasElement>("#game");
if (!canvas) {
  throw new Error("Canvas was not found.");
}

const engine = new Engine({
  canvas,
  renderer: new ThreeRenderer({
    antialias: true,
    shadows: true,
  }),
});

const camera = new GameObject("Main Camera");
camera.addComponent(Camera, {
  fieldOfView: 60,
  near: 0.1,
  far: 1_000,
  main: true,
});
camera.transform.position.set(0, 2, 5);
camera.transform.lookAt(0, 0, 0);

const cube = new GameObject("Cube");
cube.addComponent(MeshRenderer, {
  primitive: "box",
  material: {
    color: "#7c5cff",
    metalness: 0.2,
    roughness: 0.6,
  },
});
cube.addComponent(Rotator);

const light = new GameObject("Directional Light");
light.addComponent(DirectionalLight, { intensity: 2 });
light.transform.rotation.set(-0.5, 0.8, 0);

engine.scene.add(camera);
engine.scene.add(cube);
engine.scene.add(light);

void engine.start();
```

## Basic Concepts

| Concept           | Responsibility                                                            |
| ----------------- | ------------------------------------------------------------------------- |
| `Engine`          | Owns the game loop, timing, resize handling, and renderer synchronization |
| `Scene`           | Owns GameObject roots and dispatches lifecycle phases                     |
| `GameObject`      | Named, tagged entity with a Transform and components                      |
| `Component`       | Reusable state or capability attached to a GameObject                     |
| `Behaviour`       | Component with Unity-inspired frame callbacks                             |
| `Transform`       | Local position/rotation/scale plus parent-child world calculations        |
| `RendererAdapter` | Renderer-neutral boundary implemented by backend packages                 |

`position`, `rotation`, and `scale` are local-value aliases in the current MVP.
Use `getWorldPosition`, `getWorldRotation`, `getWorldQuaternion`,
`getWorldScale`, or `getWorldMatrix` for world-space values.

## Monorepo

```text
packages/
  core/             Renderer-independent runtime
  renderer-three/   Three.js backend
  physics-rapier/   Phase 3 placeholder
  editor/           Phase 4 placeholder
examples/
  basic-scene/      Responsive rotating-cube demo
docs/
  architecture.md
  roadmap.md
```

## Development

Node.js 22.12 or later and pnpm 11 are required.

```bash
pnpm install
pnpm dev
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Run the complete local verification sequence with:

```bash
pnpm check
```

## Roadmap

- **Phase 1 — Core MVP:** engine loop, entity/component model, transforms, Three.js
  renderer, and basic scene
- **Phase 2 — Assets and rendering:** glTF/GLB, textures, materials, animation,
  audio, and resource cache
- **Phase 3 — Physics:** Rapier WASM, rigid bodies, colliders, triggers, and
  raycasts
- **Phase 4 — Editor:** Scene/Game views, Hierarchy, Inspector, assets, console,
  and transform gizmos
- **Phase 5 — Build and ecosystem:** prefabs, scene files, plugins, npm packages,
  PWA/single-HTML export, and GitHub Pages

See the detailed [roadmap](docs/roadmap.md) and
[architecture notes](docs/architecture.md).

## License

[MIT](LICENSE) © 2026 sakusdev
