# PrismAxis.js Roadmap

The roadmap is directional. APIs remain unstable until the runtime, serialization,
and extension boundaries have been exercised by real projects.

## Phase 1: Core MVP

- [x] Engine with start, stop, pause, resume, resize, fixed updates, and destroy
- [x] Scene lifecycle and JSON-safe hierarchy snapshots
- [x] GameObject, Component, Behaviour, tags, and hierarchy
- [x] Transform local/world calculations
- [x] Perspective Camera
- [x] Ambient and Directional Light
- [x] Primitive MeshRenderer and standard material values
- [x] RendererAdapter abstraction
- [x] Three.js renderer package
- [x] Responsive basic-scene example
- [x] Unit tests and CI

## Phase 2: Asset and Rendering

- [ ] glTF/GLB loading
- [ ] Texture loading and lifecycle
- [ ] Material assets and instances
- [ ] Skeletal and property animation
- [ ] Audio sources and listener
- [ ] Resource cache, reference counting, and loading states
- [ ] Asset error and progress events

## Phase 3: Physics

- [ ] Rapier WASM bootstrap
- [ ] Physics world service
- [ ] Rigidbody component
- [ ] Primitive and mesh Colliders
- [ ] Trigger events
- [ ] Raycast and shape queries
- [ ] Fixed-update transform synchronization

## Phase 4: Editor

- [ ] Scene View
- [ ] Game View
- [ ] Hierarchy
- [ ] Inspector and property schemas
- [ ] Asset Browser
- [ ] Console
- [ ] Transform gizmo
- [ ] Selection, commands, and undo/redo

## Phase 5: Build and Ecosystem

- [ ] Prefab
- [ ] Versioned Scene files
- [ ] Plugin API
- [ ] npm package publication
- [ ] PWA export
- [ ] Single-HTML export
- [ ] GitHub Pages deployment
- [ ] Compatibility and migration policy
