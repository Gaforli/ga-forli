import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { activePosition, createTowerState, placeTowerBlock, TOWER_CONFIG, type TowerBlock, type TowerCommand, type TowerDebris, type TowerState } from "@contracts/tower-game";

export type GameQuality = "auto" | "high" | "light";
export type RenderStatus = "intro" | "playing" | "paused" | "over";
export type GameResult = { sessionId: string; commands: TowerCommand[]; score: number; perfects: number };

type Callbacks = {
  onScore: (score: number, perfects: number) => void;
  onPerfect: () => void;
  onStone: () => void;
  onFall: () => void;
  onOver: (result: GameResult) => void;
  onPerformance: (fps: number) => void;
};

type DebrisMesh = { mesh: THREE.Mesh; velocity: THREE.Vector3; spin: THREE.Vector3; age: number };

function stoneTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#bda076";
  ctx.fillRect(0, 0, 256, 256);
  let seed = 71;
  const random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  for (let i = 0; i < 11500; i++) {
    const shade = 100 + Math.floor(random() * 110);
    ctx.fillStyle = `rgba(${shade + 25},${shade + 9},${shade - 15},${0.035 + random() * 0.09})`;
    const size = 0.4 + random() * 2.2;
    ctx.fillRect(random() * 256, random() * 256, size * 2.8, size);
  }
  for (let i = 0; i < 24; i++) {
    ctx.strokeStyle = `rgba(74,54,35,${0.035 + random() * 0.06})`;
    ctx.lineWidth = 0.5 + random();
    ctx.beginPath();
    const y = random() * 256;
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(70, y + random() * 9, 160, y - random() * 8, 256, y + random() * 5);
    ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1.8, 1.8);
  return texture;
}

export class TowerRenderer {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(37, 1, 0.1, 180);
  private state: TowerState = createTowerState();
  private commands: TowerCommand[] = [];
  private blockGeometry = new RoundedBoxGeometry(1, 1, 1, 2, 0.035);
  private stoneMaterial: THREE.MeshStandardMaterial;
  private stoneDarkMaterial: THREE.MeshStandardMaterial;
  private texture = stoneTexture();
  private activeMesh: THREE.Mesh;
  private blockMeshes: THREE.Mesh[] = [];
  private debris: DebrisMesh[] = [];
  private towerGroup = new THREE.Group();
  private animation = 0;
  private lastTime = 0;
  private accumulator = 0;
  private status: RenderStatus = "intro";
  private quality: GameQuality = "auto";
  private resizeObserver: ResizeObserver;
  private cameraY = 2;
  private frames = 0;
  private frameTime = 0;
  private dust: THREE.Points;
  private dustPositions = new Float32Array(80 * 3);
  private dustLife = new Float32Array(80);
  private dustCursor = 0;
  private reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  private overCameraTime = 0;

  private container: HTMLElement;
  private sessionId: string;
  private callbacks: Callbacks;

  constructor(container: HTMLElement, sessionId: string, callbacks: Callbacks) {
    this.container = container;
    this.sessionId = sessionId;
    this.callbacks = callbacks;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.className = "tower-canvas";
    this.renderer.domElement.setAttribute("aria-label", "Scena 3D della Torre di Babele");
    container.appendChild(this.renderer.domElement);

    this.scene.background = new THREE.Color("#8d9a9b");
    this.scene.fog = new THREE.FogExp2("#bfa88d", 0.0135);
    this.stoneMaterial = new THREE.MeshStandardMaterial({ map: this.texture, bumpMap: this.texture, bumpScale: 0.035, roughness: 0.91, metalness: 0, color: "#d8bb89" });
    this.stoneDarkMaterial = new THREE.MeshStandardMaterial({ map: this.texture, bumpMap: this.texture, bumpScale: 0.028, roughness: 0.96, color: "#a98c64" });
    this.activeMesh = new THREE.Mesh(this.blockGeometry, this.stoneMaterial);
    this.activeMesh.castShadow = this.activeMesh.receiveShadow = true;
    this.towerGroup.add(this.activeMesh);
    this.scene.add(this.towerGroup);
    this.syncBlocks();
    this.buildEnvironment();

    const dustGeometry = new THREE.BufferGeometry();
    dustGeometry.setAttribute("position", new THREE.BufferAttribute(this.dustPositions, 3));
    this.dust = new THREE.Points(dustGeometry, new THREE.PointsMaterial({ color: "#d9bd8d", size: 0.09, transparent: true, opacity: 0.6, depthWrite: false }));
    this.dust.frustumCulled = false;
    this.scene.add(this.dust);

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();
    this.setQuality("auto");
    this.animation = requestAnimationFrame(this.loop);
  }

  private buildEnvironment() {
    const hemi = new THREE.HemisphereLight("#f3cf94", "#263f4c", 2.05);
    this.scene.add(hemi);
    const sun = new THREE.DirectionalLight("#ffd29a", 4.4);
    sun.position.set(-10, 15, 7);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = sun.shadow.camera.bottom = -9;
    sun.shadow.camera.right = sun.shadow.camera.top = 9;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 45;
    sun.shadow.bias = -0.00025;
    this.scene.add(sun);
    const fill = new THREE.DirectionalLight("#648c9c", 0.75);
    fill.position.set(8, 5, -6);
    this.scene.add(fill);

    const sky = new THREE.Mesh(new THREE.SphereGeometry(110, 24, 12), new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: { top: { value: new THREE.Color("#284d60") }, middle: { value: new THREE.Color("#d59a65") }, bottom: { value: new THREE.Color("#efc789") } },
      vertexShader: "varying vec3 vPos; void main(){vPos=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
      fragmentShader: "varying vec3 vPos; uniform vec3 top; uniform vec3 middle; uniform vec3 bottom; void main(){float h=normalize(vPos).y;vec3 c=h>0.?mix(middle,top,smoothstep(0.,.72,h)):mix(middle,bottom,smoothstep(0.,-.25,h));gl_FragColor=vec4(c,1.);}",
    }));
    this.scene.add(sky);
    const sunDisk = new THREE.Mesh(new THREE.SphereGeometry(2.2, 16, 12), new THREE.MeshBasicMaterial({ color: "#ffd7a0", fog: false }));
    sunDisk.position.set(-35, 10, -65);
    this.scene.add(sunDisk);

    const groundGeometry = new THREE.PlaneGeometry(180, 180, 32, 32);
    const positions = groundGeometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i), y = positions.getY(i);
      positions.setZ(i, Math.sin(x * 0.11) * 0.32 + Math.cos(y * 0.09) * 0.22);
    }
    groundGeometry.computeVertexNormals();
    const ground = new THREE.Mesh(groundGeometry, new THREE.MeshStandardMaterial({ color: "#8d765c", roughness: 1 }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.34;
    ground.receiveShadow = true;
    this.scene.add(ground);

    const cityMaterial = new THREE.MeshStandardMaterial({ color: "#9f8463", roughness: 1 });
    const cityGeometry = new THREE.BoxGeometry(1, 1, 1);
    const city = new THREE.InstancedMesh(cityGeometry, cityMaterial, 90);
    const dummy = new THREE.Object3D();
    let seed = 19;
    const random = () => ((seed = seed * 16807 % 2147483647) - 1) / 2147483646;
    for (let i = 0; i < 90; i++) {
      const angle = random() * Math.PI * 2;
      const distance = 19 + random() * 43;
      const height = 0.7 + random() * 2.8;
      dummy.position.set(Math.cos(angle) * distance, height / 2 - 0.25, Math.sin(angle) * distance);
      dummy.scale.set(1.2 + random() * 3.1, height, 1.1 + random() * 2.5);
      dummy.rotation.y = random() * 0.5;
      dummy.updateMatrix();
      city.setMatrixAt(i, dummy.matrix);
    }
    this.scene.add(city);

    const zigguratMaterial = new THREE.MeshStandardMaterial({ color: "#8c7458", roughness: 1 });
    for (const [x, z, scale] of [[-23, -28, 1.25], [27, -38, 0.85], [-38, 8, 0.65]] as const) {
      const group = new THREE.Group();
      for (let level = 0; level < 5; level++) {
        const size = (8 - level * 1.25) * scale;
        const mesh = new THREE.Mesh(cityGeometry, zigguratMaterial);
        mesh.scale.set(size, 1.15 * scale, size);
        mesh.position.y = level * 1.12 * scale + 0.3;
        group.add(mesh);
      }
      group.position.set(x, 0, z);
      this.scene.add(group);
    }

    const trunkGeometry = new THREE.CylinderGeometry(0.07, 0.12, 1.7, 5);
    const leafGeometry = new THREE.ConeGeometry(0.65, 0.18, 7);
    const trunkMaterial = new THREE.MeshStandardMaterial({ color: "#5b4937", roughness: 1 });
    const leafMaterial = new THREE.MeshStandardMaterial({ color: "#344d43", roughness: 1 });
    for (let i = 0; i < 16; i++) {
      const a = i * 2.4;
      const r = 12 + (i % 4) * 4;
      const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
      trunk.position.set(Math.cos(a) * r, 0.55, Math.sin(a) * r);
      const leaves = new THREE.Mesh(leafGeometry, leafMaterial);
      leaves.position.copy(trunk.position).add(new THREE.Vector3(0, 0.9, 0));
      this.scene.add(trunk, leaves);
    }
  }

  private syncBlocks() {
    while (this.blockMeshes.length < this.state.blocks.length) {
      const block = this.state.blocks[this.blockMeshes.length];
      const mesh = new THREE.Mesh(this.blockGeometry, block.level % 4 === 0 ? this.stoneDarkMaterial : this.stoneMaterial);
      mesh.castShadow = mesh.receiveShadow = true;
      this.blockMeshes.push(mesh);
      this.towerGroup.add(mesh);
    }
    this.state.blocks.forEach((block, i) => this.positionBlock(this.blockMeshes[i], block));
  }

  private positionBlock(mesh: THREE.Mesh, block: TowerBlock) {
    mesh.scale.set(block.width, TOWER_CONFIG.blockHeight, block.depth);
    mesh.position.set(block.x, (block.level + 1) * TOWER_CONFIG.blockHeight, block.z);
  }

  private spawnDebris(data: TowerDebris) {
    if (this.debris.length >= 8) {
      const old = this.debris.shift();
      if (old) this.scene.remove(old.mesh);
    }
    const mesh = new THREE.Mesh(this.blockGeometry, this.stoneMaterial);
    this.positionBlock(mesh, data);
    mesh.castShadow = true;
    this.scene.add(mesh);
    const velocity = new THREE.Vector3(data.axis === "x" ? data.side * 1.7 : 0, 0.5, data.axis === "z" ? data.side * 1.7 : 0);
    this.debris.push({ mesh, velocity, spin: new THREE.Vector3(1.4, 0.4, data.side * 1.8), age: 0 });
    if (this.quality !== "light" && !this.reducedMotion) this.spawnDust(mesh.position);
  }

  private spawnDust(origin: THREE.Vector3) {
    for (let i = 0; i < 12; i++) {
      const index = this.dustCursor++ % 80;
      this.dustPositions[index * 3] = origin.x + (Math.random() - 0.5) * 1.2;
      this.dustPositions[index * 3 + 1] = origin.y;
      this.dustPositions[index * 3 + 2] = origin.z + (Math.random() - 0.5) * 1.2;
      this.dustLife[index] = 1;
    }
  }

  drop = () => {
    if (this.status !== "playing" || this.state.over) return;
    const tick = this.state.tick + 1;
    const result = placeTowerBlock(this.state, tick);
    if (result.kind === "ignored") return;
    this.commands.push({ tick });
    if (result.kind === "placed") {
      this.syncBlocks();
      this.callbacks.onScore(this.state.score, this.state.perfects);
      this.callbacks.onStone();
      if (result.debris) this.spawnDebris(result.debris);
      if (result.perfect) this.callbacks.onPerfect();
    } else {
      this.spawnDebris(result.debris);
      this.callbacks.onFall();
      this.callbacks.onOver({ sessionId: this.sessionId, commands: [...this.commands], score: this.state.score, perfects: this.state.perfects });
    }
  };

  setStatus(status: RenderStatus) {
    this.status = status;
    this.lastTime = performance.now();
    this.accumulator = 0;
    if (status === "over") this.overCameraTime = 0;
  }

  setQuality(quality: GameQuality) {
    this.quality = quality;
    const light = quality === "light" || (quality === "auto" && ((navigator.hardwareConcurrency || 4) <= 4 || window.innerWidth < 500));
    const dpr = Math.min(window.devicePixelRatio || 1, light ? 1 : quality === "high" ? 1.75 : 1.45);
    this.renderer.setPixelRatio(dpr);
    this.renderer.shadowMap.enabled = !light;
    this.dust.visible = !light && !this.reducedMotion;
    this.resize();
  }

  private resize() {
    const width = Math.max(1, this.container.clientWidth), height = Math.max(1, this.container.clientHeight);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.fov = width < 500 ? 43 : 37;
    this.camera.updateProjectionMatrix();
  }

  private updateVisuals(delta: number) {
    const active = { ...this.state.active };
    const offset = activePosition(this.state);
    active[this.state.axis] = offset;
    this.positionBlock(this.activeMesh, active);
    this.activeMesh.visible = !this.state.over;

    for (let i = this.debris.length - 1; i >= 0; i--) {
      const item = this.debris[i];
      item.age += delta;
      item.velocity.y -= 8.5 * delta;
      item.mesh.position.addScaledVector(item.velocity, delta);
      item.mesh.rotation.x += item.spin.x * delta;
      item.mesh.rotation.y += item.spin.y * delta;
      item.mesh.rotation.z += item.spin.z * delta;
      if (item.mesh.position.y < -6 || item.age > 5) {
        this.scene.remove(item.mesh);
        this.debris.splice(i, 1);
      }
    }
    for (let i = 0; i < 80; i++) {
      if (this.dustLife[i] <= 0) continue;
      this.dustLife[i] -= delta * 1.3;
      this.dustPositions[i * 3 + 1] += delta * 0.28;
      this.dustPositions[i * 3] += delta * 0.12;
    }
    this.dust.geometry.attributes.position.needsUpdate = true;

    const top = (this.state.score + 1) * TOWER_CONFIG.blockHeight;
    let desiredY = Math.max(2, top - 1.35);
    if (this.status === "over" && !this.reducedMotion) {
      this.overCameraTime += delta;
      desiredY = Math.max(1.5, top * 0.5);
    }
    this.cameraY = THREE.MathUtils.lerp(this.cameraY, desiredY, 1 - Math.exp(-delta * 3.2));
    const mobile = this.container.clientWidth < 500;
    const distance = mobile ? 12.8 : 13.8;
    this.camera.position.set(distance * 0.66, this.cameraY + 4.2, distance * 0.78);
    this.camera.lookAt(0, this.cameraY + 0.8, 0);
  }

  private loop = (time: number) => {
    this.animation = requestAnimationFrame(this.loop);
    const delta = this.lastTime ? Math.min((time - this.lastTime) / 1000, 0.25) : 0;
    this.lastTime = time;
    if (this.status === "playing" && !this.state.over) {
      this.accumulator += delta;
      const step = 1 / TOWER_CONFIG.tickRate;
      while (this.accumulator >= step) {
        this.state.tick += 1;
        this.accumulator -= step;
      }
    }
    this.updateVisuals(delta);
    this.renderer.render(this.scene, this.camera);
    if (delta > 0) {
      this.frames++;
      this.frameTime += delta;
      if (this.frameTime >= 5) {
        this.callbacks.onPerformance(Math.round(this.frames / this.frameTime));
        this.frames = 0;
        this.frameTime = 0;
      }
    }
  };

  dispose() {
    cancelAnimationFrame(this.animation);
    this.resizeObserver.disconnect();
    const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>(), textures = new Set<THREE.Texture>();
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh || object instanceof THREE.Points) {
        geometries.add(object.geometry);
        const mats = Array.isArray(object.material) ? object.material : [object.material];
        mats.forEach((m) => materials.add(m));
      }
    });
    materials.forEach((m) => { Object.values(m).forEach((v) => { if (v instanceof THREE.Texture) textures.add(v); }); m.dispose(); });
    geometries.forEach((g) => g.dispose());
    textures.forEach((t) => t.dispose());
    this.texture.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
  }
}
