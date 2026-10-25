import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";
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

function weatheredGeometry(seed: number, detail: number) {
  const geometry = new RoundedBoxGeometry(1, 1, 1, detail, 0.032);
  const positions = geometry.attributes.position;
  const normals = geometry.attributes.normal;
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i), y = positions.getY(i), z = positions.getZ(i);
    const edge = THREE.MathUtils.smoothstep(Math.abs(x) + Math.abs(y) + Math.abs(z), 0.91, 1.43);
    if (edge <= 0) continue;
    const noise = Math.sin(x * 37.7 + y * 53.1 + z * 71.9 + seed * 9.7) * 0.5
      + Math.sin(x * 91.3 - y * 43.8 + z * 63.2 + seed * 3.1) * 0.25;
    const chip = edge * (0.004 + noise * 0.012);
    positions.setXYZ(i,
      x + normals.getX(i) * chip,
      y + normals.getY(i) * chip,
      z + normals.getZ(i) * chip,
    );
  }
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

export class TowerRenderer {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(37, 1, 0.1, 180);
  private state: TowerState = createTowerState();
  private commands: TowerCommand[] = [];
  private blockGeometries = [11, 23, 37, 51].map((seed) => weatheredGeometry(seed, 3));
  private lightBlockGeometries = [11, 23, 37, 51].map((seed) => weatheredGeometry(seed, 2));
  private stoneMaterial: THREE.MeshStandardMaterial;
  private stoneDarkMaterial: THREE.MeshStandardMaterial;
  private texture = stoneTexture();
  private pbrTextures: THREE.Texture[] = [];
  private environmentTexture: THREE.DataTexture | null = null;
  private environmentRequested = false;
  private lightQuality = false;
  private disposed = false;
  private sky: THREE.Mesh | null = null;
  private sunDisk: THREE.Mesh | null = null;
  private sun: THREE.DirectionalLight | null = null;
  private stoneSize = { value: new THREE.Vector3(1, 1, 1) };
  private stoneOffset = { value: new THREE.Vector2() };
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
    this.renderer.toneMappingExposure = 1;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.className = "tower-canvas";
    this.renderer.domElement.setAttribute("aria-label", "Scena 3D della Torre di Babele");
    container.appendChild(this.renderer.domElement);

    this.scene.background = new THREE.Color("#8d9a9b");
    this.scene.fog = new THREE.FogExp2("#bfa88d", 0.0135);
    this.stoneMaterial = new THREE.MeshStandardMaterial({ map: this.texture, bumpMap: this.texture, bumpScale: 0.035, roughness: 0.91, metalness: 0, color: "#cfc2aa" });
    this.stoneDarkMaterial = new THREE.MeshStandardMaterial({ map: this.texture, bumpMap: this.texture, bumpScale: 0.028, roughness: 0.96, color: "#a8987e" });
    this.prepareStoneMaterial(this.stoneMaterial);
    this.prepareStoneMaterial(this.stoneDarkMaterial);
    this.activeMesh = new THREE.Mesh(this.blockGeometries[0], this.stoneMaterial);
    this.bindStoneMesh(this.activeMesh, 0);
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
    void this.loadStoneMaps();
    this.animation = requestAnimationFrame(this.loop);
  }

  private prepareStoneMaterial(material: THREE.MeshStandardMaterial) {
    material.onBeforeCompile = (shader) => {
      shader.uniforms.uStoneSize = this.stoneSize;
      shader.uniforms.uStoneOffset = this.stoneOffset;
      shader.vertexShader = `uniform vec3 uStoneSize; uniform vec2 uStoneOffset;\n${shader.vertexShader}`;
      shader.vertexShader = shader.vertexShader.replace("#include <uv_vertex>", `
        #include <uv_vertex>
        vec3 stonePosition = position * uStoneSize;
        vec3 stoneNormal = abs(normal);
        vec2 stoneUv = stoneNormal.y > 0.5 ? stonePosition.xz : (stoneNormal.x > 0.5 ? stonePosition.zy : stonePosition.xy);
        stoneUv = stoneUv * 0.38 + uStoneOffset;
        #ifdef USE_MAP
          vMapUv = stoneUv;
        #endif
        #ifdef USE_NORMALMAP
          vNormalMapUv = stoneUv;
        #endif
        #ifdef USE_ROUGHNESSMAP
          vRoughnessMapUv = stoneUv;
        #endif
        #ifdef USE_AOMAP
          vAoMapUv = stoneUv;
        #endif
      `);
    };
    material.customProgramCacheKey = () => "ga-stone-world-uv-v1";
  }

  private bindStoneMesh(mesh: THREE.Mesh, variant: number) {
    mesh.userData.stoneVariant = variant;
    mesh.onBeforeRender = () => {
      const currentVariant = mesh.userData.stoneVariant as number;
      this.stoneSize.value.copy(mesh.scale);
      this.stoneOffset.value.set((currentVariant * 0.173) % 1, (currentVariant * 0.317) % 1);
    };
  }

  private async loadStoneMaps() {
    try {
      const loader = new THREE.TextureLoader();
      const [map, normalMap, ormMap] = await Promise.all([
        loader.loadAsync("assets/game/sandstone-diffuse.webp"),
        loader.loadAsync("assets/game/sandstone-normal.webp"),
        loader.loadAsync("assets/game/sandstone-orm.webp"),
      ]);
      if (this.disposed) {
        map.dispose(); normalMap.dispose(); ormMap.dispose();
        return;
      }
      map.colorSpace = THREE.SRGBColorSpace;
      const anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
      for (const texture of [map, normalMap, ormMap]) {
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.anisotropy = anisotropy;
      }
      ormMap.channel = 0;
      this.pbrTextures.push(map, normalMap, ormMap);
      for (const material of [this.stoneMaterial, this.stoneDarkMaterial]) {
        material.map = map;
        material.bumpMap = null;
        material.normalMap = normalMap;
        material.normalScale.setScalar(this.lightQuality ? 0.68 : 0.92);
        material.roughnessMap = ormMap;
        material.roughness = 1;
        material.aoMap = ormMap;
        material.aoMapIntensity = 0.7;
        material.needsUpdate = true;
      }
    } catch {
      // The procedural sandstone remains available if an asset cannot be loaded.
    }
  }

  private async loadEnvironment() {
    if (this.environmentRequested) return;
    this.environmentRequested = true;
    try {
      const texture = await new RGBELoader().loadAsync("assets/game/qwantani-sunset-1k.hdr");
      if (this.disposed) { texture.dispose(); return; }
      texture.mapping = THREE.EquirectangularReflectionMapping;
      this.environmentTexture = texture;
      this.applyEnvironment();
    } catch {
      this.environmentRequested = false;
    }
  }

  private applyEnvironment() {
    const useHdr = !this.lightQuality && this.environmentTexture !== null;
    this.scene.environment = useHdr ? this.environmentTexture : null;
    this.scene.background = new THREE.Color("#8d9a9b");
    this.scene.environmentIntensity = 0.58;
    this.scene.environmentRotation.y = 2.15;
    if (this.sky) this.sky.visible = true;
    if (this.sunDisk) this.sunDisk.visible = false;
    this.stoneMaterial.envMapIntensity = useHdr ? 0.55 : 0.35;
    this.stoneDarkMaterial.envMapIntensity = useHdr ? 0.48 : 0.3;
  }

  private buildEnvironment() {
    const hemi = new THREE.HemisphereLight("#f3cf94", "#263f4c", 1.05);
    this.scene.add(hemi);
    const sun = new THREE.DirectionalLight("#ffe0b0", 3.2);
    this.sun = sun;
    sun.position.set(-10, 9, 7);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = sun.shadow.camera.bottom = -9;
    sun.shadow.camera.right = sun.shadow.camera.top = 9;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 45;
    sun.shadow.bias = -0.00012;
    sun.shadow.normalBias = 0.025;
    this.scene.add(sun);
    const fill = new THREE.DirectionalLight("#648c9c", 0.75);
    fill.position.set(8, 5, -6);
    this.scene.add(fill);

    const sky = new THREE.Mesh(new THREE.SphereGeometry(110, 24, 12), new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: { top: { value: new THREE.Color("#284d60") }, middle: { value: new THREE.Color("#d59a65") }, bottom: { value: new THREE.Color("#efc789") }, cloudDetail: { value: 1 } },
      vertexShader: "varying vec3 vPos; void main(){vPos=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
      fragmentShader: `
        varying vec3 vPos; uniform vec3 top; uniform vec3 middle; uniform vec3 bottom; uniform float cloudDetail;
        float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
        float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
        float fbm(vec2 p){return noise(p)*.57+noise(p*2.03)*.28+noise(p*4.07)*.15;}
        void main(){
          vec3 dir=normalize(vPos); float h=dir.y;
          vec3 color=mix(bottom,middle,smoothstep(-.14,.045,h));
          color=mix(color,top,smoothstep(.01,.27,h));
          vec3 sunDir=normalize(vec3(-65.,10.,-35.));
          float sunDot=max(dot(dir,sunDir),0.);
          color+=vec3(1.,.47,.16)*pow(sunDot,60.)*.18;
          if(cloudDetail>.5 && h>.015){
            vec2 cloudUv=dir.xz/(h+.32)*2.4;
            float cloud=smoothstep(.53,.72,fbm(cloudUv+vec2(3.7,8.1)))*smoothstep(.015,.16,h)*(1.-smoothstep(.48,.78,h));
            vec3 cloudColor=mix(vec3(.28,.31,.34),vec3(.95,.63,.38),pow(sunDot,5.));
            color=mix(color,cloudColor,cloud*.3);
          }
          color+=vec3(1.,.78,.46)*smoothstep(.99982,.99993,sunDot)*1.4;
          gl_FragColor=vec4(color,1.);
        }`,
    }));
    this.sky = sky;
    this.scene.add(sky);
    const sunDisk = new THREE.Mesh(new THREE.SphereGeometry(2.2, 16, 12), new THREE.MeshBasicMaterial({ color: "#ffd7a0", fog: false }));
    this.sunDisk = sunDisk;
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
      const distance = 28 + random() * 50;
      const height = 0.7 + random() * 2.8;
      dummy.position.set(Math.cos(angle) * distance, height / 2 - 0.25, Math.sin(angle) * distance);
      dummy.scale.set(1.2 + random() * 3.1, height, 1.1 + random() * 2.5);
      dummy.rotation.y = random() * 0.5;
      dummy.updateMatrix();
      city.setMatrixAt(i, dummy.matrix);
    }
    this.scene.add(city);

    const zigguratMaterial = new THREE.MeshStandardMaterial({ color: "#8c7458", roughness: 1 });
    for (const [x, z, scale] of [[-85, -30, 1.6], [70, -90, 1.1], [-72, 14, 0.85]] as const) {
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
      const r = 18 + (i % 4) * 6;
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
      const variant = block.level % this.blockGeometries.length;
      const mesh = new THREE.Mesh(this.blockGeometries[variant], block.level % 4 === 0 ? this.stoneDarkMaterial : this.stoneMaterial);
      this.bindStoneMesh(mesh, variant);
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
    const variant = data.level % this.blockGeometries.length;
    const mesh = new THREE.Mesh((this.lightQuality ? this.lightBlockGeometries : this.blockGeometries)[variant], this.stoneMaterial);
    this.bindStoneMesh(mesh, variant);
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
    this.lightQuality = light;
    if (this.sky?.material instanceof THREE.ShaderMaterial) this.sky.material.uniforms.cloudDetail.value = light ? 0 : 1;
    const dpr = Math.min(window.devicePixelRatio || 1, light ? 1 : quality === "high" ? 1.75 : 1.45);
    this.renderer.setPixelRatio(dpr);
    this.renderer.shadowMap.enabled = !light;
    this.dust.visible = !light && !this.reducedMotion;
    const geometries = light ? this.lightBlockGeometries : this.blockGeometries;
    this.activeMesh.geometry = geometries[this.state.score % geometries.length];
    this.blockMeshes.forEach((mesh, index) => { mesh.geometry = geometries[index % geometries.length]; });
    this.debris.forEach((item, index) => { item.mesh.geometry = geometries[index % geometries.length]; });
    const normalStrength = light ? 0.68 : 0.92;
    this.stoneMaterial.normalScale.setScalar(normalStrength);
    this.stoneDarkMaterial.normalScale.setScalar(normalStrength * 0.9);
    if (this.sun) {
      const shadowSize = quality === "high" ? 2048 : 1024;
      if (this.sun.shadow.mapSize.x !== shadowSize) {
        this.sun.shadow.mapSize.set(shadowSize, shadowSize);
        this.sun.shadow.map?.dispose();
        this.sun.shadow.map = null;
      }
    }
    if (!light) void this.loadEnvironment();
    this.applyEnvironment();
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
    const geometries = this.lightQuality ? this.lightBlockGeometries : this.blockGeometries;
    this.activeMesh.geometry = geometries[this.state.score % geometries.length];
    this.activeMesh.userData.stoneVariant = this.state.score % geometries.length;
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
    let desiredY = Math.max(0.6, top - 0.7);
    if (this.status === "over" && !this.reducedMotion) {
      this.overCameraTime += delta;
      desiredY = Math.max(1.5, top * 0.5);
    }
    this.cameraY = THREE.MathUtils.lerp(this.cameraY, desiredY, 1 - Math.exp(-delta * 3.2));
    const mobile = this.container.clientWidth < 500;
    const distance = mobile ? 18 : 15.8;
    this.camera.position.set(distance * 0.66, this.cameraY + 2.2, distance * 0.78);
    this.camera.lookAt(0, this.cameraY + 0.35, 0);
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
    this.disposed = true;
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
    this.blockGeometries.forEach((g) => { if (!geometries.has(g)) g.dispose(); });
    this.lightBlockGeometries.forEach((g) => { if (!geometries.has(g)) g.dispose(); });
    textures.forEach((t) => t.dispose());
    this.texture.dispose();
    this.environmentTexture?.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
  }
}
