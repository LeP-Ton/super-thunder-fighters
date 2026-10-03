import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../constants';
import { GameObject, GameState } from '../types';
import { modelFiles, modelKinds, ShipKind } from './modelManifest';

type ModelTemplate = { scene: THREE.Group; center: THREE.Vector3; extent: number };

const PLAYER_Z = 52;
const ENEMY_Z = 45;
const MAX_BULLETS = 420;
const MAX_PARTICLES = 700;
const BANK_LIMIT = THREE.MathUtils.degToRad(30);
const position = new THREE.Object3D();
const tint = new THREE.Color();

const toWorldX = (x: number) => x - CANVAS_WIDTH / 2;
const toWorldY = (y: number) => CANVAS_HEIGHT / 2 - y;

export class BattleScene {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.OrthographicCamera(-300, 300, 400, -400, 0.1, 2000);
  private readonly templates = new Map<ShipKind, ModelTemplate>();
  private readonly enemies = new Map<string, THREE.Group>();
  private readonly enemyBars = new Map<string, THREE.Group>();
  private readonly bullets: THREE.InstancedMesh;
  private readonly particles: THREE.InstancedMesh;
  private readonly stars: THREE.Points;
  private readonly starSeeds: Float32Array;
  private readonly fallbackHull = new THREE.ConeGeometry(1, 1, 4);
  private readonly fallbackPlayerMaterial = new THREE.MeshStandardMaterial({ color: '#a5c8da', metalness: 0.6, roughness: 0.38 });
  private readonly fallbackEnemyMaterial = new THREE.MeshStandardMaterial({ color: '#a9695d', metalness: 0.6, roughness: 0.38 });
  private readonly flameGeometry = new THREE.ConeGeometry(1, 1, 7);
  private readonly playerFlameMaterial = new THREE.MeshBasicMaterial({ color: '#69cefa', transparent: true, opacity: 0.76, blending: THREE.AdditiveBlending, depthWrite: false });
  private readonly enemyFlameMaterial = new THREE.MeshBasicMaterial({ color: '#ff9d6b', transparent: true, opacity: 0.76, blending: THREE.AdditiveBlending, depthWrite: false });
  private readonly barGeometry = new THREE.PlaneGeometry(1, 3);
  private readonly barBackgroundMaterial = new THREE.MeshBasicMaterial({ color: '#172835', depthTest: false });
  private readonly barFillMaterial = new THREE.MeshBasicMaterial({ color: '#efac80', depthTest: false });
  private player: THREE.Group | null = null;
  private playerKind: ShipKind | null = null;
  private lastFrame = 0;
  private bank = 0;
  private disposed = false;

  constructor(canvas: HTMLCanvasElement) {
    const context = canvas.getContext('webgl2', { antialias: true, alpha: false });
    if (!context) throw new Error('WebGL 2 不可用');
    this.renderer = new THREE.WebGLRenderer({ canvas, context, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(CANVAS_WIDTH, CANVAS_HEIGHT, false);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.28;
    this.scene.background = new THREE.Color('#040c17');
    this.camera.position.set(0, 0, 900);
    this.camera.lookAt(0, 0, 0);

    this.scene.add(new THREE.HemisphereLight('#d7edff', '#273848', 2.4));
    const key = new THREE.DirectionalLight('#f4f2e8', 3.2);
    key.position.set(-200, 300, 450);
    this.scene.add(key);
    const rim = new THREE.DirectionalLight('#55bce5', 2.0);
    rim.position.set(260, -160, 230);
    this.scene.add(rim);

    const background = new THREE.Mesh(
      new THREE.PlaneGeometry(680, 900),
      new THREE.MeshBasicMaterial({ color: '#ffffff', depthWrite: false })
    );
    background.position.z = -350;
    this.scene.add(background);
    new THREE.TextureLoader().load('/assets/backgrounds/sector-orbit.png', (texture) => {
      if (this.disposed) { texture.dispose(); return; }
      texture.colorSpace = THREE.SRGBColorSpace;
      (background.material as THREE.MeshBasicMaterial).map = texture;
      (background.material as THREE.MeshBasicMaterial).needsUpdate = true;
    });

    this.starSeeds = new Float32Array(130 * 3);
    const starCoordinates = new Float32Array(130 * 3);
    for (let i = 0; i < 130; i++) {
      const index = i * 3;
      this.starSeeds[index] = Math.random() * 660 - 330;
      this.starSeeds[index + 1] = Math.random() * 840 - 420;
      this.starSeeds[index + 2] = Math.random() * 40 - 125;
      starCoordinates.set(this.starSeeds.subarray(index, index + 3), index);
    }
    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute('position', new THREE.BufferAttribute(starCoordinates, 3));
    this.stars = new THREE.Points(starGeometry, new THREE.PointsMaterial({ color: '#a6c5de', size: 1.8, transparent: true, opacity: 0.55, depthWrite: false }));
    this.scene.add(this.stars);

    const bulletGeometry = new THREE.SphereGeometry(1, 8, 6);
    const bulletMaterial = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    this.bullets = new THREE.InstancedMesh(bulletGeometry, bulletMaterial, MAX_BULLETS);
    this.bullets.count = 0;
    this.bullets.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.bullets.frustumCulled = false;
    this.scene.add(this.bullets);

    const particleGeometry = new THREE.TetrahedronGeometry(1, 0);
    const particleMaterial = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    this.particles = new THREE.InstancedMesh(particleGeometry, particleMaterial, MAX_PARTICLES);
    this.particles.count = 0;
    this.particles.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.particles.frustumCulled = false;
    this.scene.add(this.particles);
  }

  async loadModels(): Promise<void> {
    const loader = new GLTFLoader();
    const results = await Promise.allSettled(modelKinds.map(async (kind) => {
      const model = await loader.loadAsync(modelFiles[kind]);
      if (this.disposed) {
        model.scene.traverse((node) => {
          if (!(node instanceof THREE.Mesh)) return;
          node.geometry.dispose();
          for (const material of Array.isArray(node.material) ? node.material : [node.material]) {
            for (const value of Object.values(material)) if (value instanceof THREE.Texture) value.dispose();
            material.dispose();
          }
        });
        return;
      }
      const bounds = new THREE.Box3().setFromObject(model.scene);
      const size = bounds.getSize(new THREE.Vector3());
      const template: ModelTemplate = {
        scene: model.scene,
        center: bounds.getCenter(new THREE.Vector3()),
        extent: Math.max(size.x, size.z)
      };
      this.templates.set(kind, template);
    }));
    if (this.disposed) return;
    // 首页会先渲染简化机体；模型加载完后强制重建展示对象。
    if (this.player) this.scene.remove(this.player);
    this.player = null;
    this.playerKind = null;
    for (const model of this.enemies.values()) this.scene.remove(model);
    this.enemies.clear();
    for (const bar of this.enemyBars.values()) this.scene.remove(bar);
    this.enemyBars.clear();
    const failed = results.filter((result) => result.status === 'rejected');
    if (failed.length) console.error(`${failed.length} 个战机模型加载失败，将使用简化 3D 机体。`, failed);
  }

  resize(): void {
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(CANVAS_WIDTH, CANVAS_HEIGHT, false);
  }

  private makeShip(kind: ShipKind, width: number, enemy: boolean): THREE.Group {
    const root = new THREE.Group();
    const template = this.templates.get(kind);
    if (template) {
      const orientation = new THREE.Group();
      orientation.rotation.z = Math.PI;
      const body = new THREE.Group();
      body.rotation.x = Math.PI / 2;
      body.scale.setScalar(width * 1.5 / template.extent);
      const mesh = template.scene.clone(true);
      mesh.position.copy(template.center).multiplyScalar(-1);
      body.add(mesh);
      orientation.add(body);
      root.add(orientation);
    } else {
      const hull = new THREE.Mesh(this.fallbackHull, enemy ? this.fallbackEnemyMaterial : this.fallbackPlayerMaterial);
      hull.scale.set(width * 0.42, width * 1.2, width * 0.42);
      hull.rotation.z = Math.PI;
      root.add(hull);
    }
    for (const sign of [-1, 1]) {
      const engine = new THREE.Mesh(this.flameGeometry, enemy ? this.enemyFlameMaterial : this.playerFlameMaterial);
      engine.scale.set(width * 0.075, width * 0.34, width * 0.075);
      engine.rotation.z = Math.PI;
      engine.position.set(sign * width * 0.2, -width * 0.34, -2);
      root.add(engine);
    }
    root.rotation.z = enemy ? Math.PI : 0;
    this.scene.add(root);
    return root;
  }

  private syncPlayer(state: GameState, delta: number): void {
    const kind = state.activePlaneId;
    const unit = state.player;
    if (!this.player || this.playerKind !== kind) {
      if (this.player) this.scene.remove(this.player);
      this.player = this.makeShip(kind, unit.size.x, false);
      this.playerKind = kind;
      this.bank = 0;
    }
    this.player.position.set(toWorldX(unit.pos.x + unit.size.x / 2), toWorldY(unit.pos.y + unit.size.y / 2), PLAYER_Z);
    const speed = Math.max(1, unit.size.x * 0.15);
    const target = THREE.MathUtils.clamp(-unit.velocity.x / speed, -1, 1) * BANK_LIMIT;
    const smoothing = 1 - Math.exp(-delta / (Math.abs(target) > Math.abs(this.bank) ? 0.13 : 0.2));
    this.bank = THREE.MathUtils.lerp(this.bank, target, smoothing);
    this.player.rotation.y = this.bank;
    this.player.rotation.z = this.bank * 0.24;
  }

  private syncEnemies(state: GameState): void {
    const seen = new Set<string>();
    for (const unit of state.enemies) {
      const kind = unit.subType ?? 'grunt';
      seen.add(unit.id);
      let model = this.enemies.get(unit.id);
      if (!model) {
        model = this.makeShip(kind, unit.size.x, true);
        this.enemies.set(unit.id, model);
      }
      model.position.set(toWorldX(unit.pos.x + unit.size.x / 2), toWorldY(unit.pos.y + unit.size.y / 2), ENEMY_Z);
      model.rotation.y = THREE.MathUtils.clamp(unit.velocity.x * 0.05, -0.2, 0.2);
      if (kind === 'elite' || kind === 'super') this.syncEnemyBar(unit);
    }
    for (const [id, model] of this.enemies) {
      if (seen.has(id)) continue;
      this.scene.remove(model);
      this.enemies.delete(id);
      const bar = this.enemyBars.get(id);
      if (bar) { this.scene.remove(bar); this.enemyBars.delete(id); }
    }
  }

  private syncEnemyBar(unit: GameObject): void {
    let bar = this.enemyBars.get(unit.id);
    if (!bar) {
      bar = new THREE.Group();
      const background = new THREE.Mesh(this.barGeometry, this.barBackgroundMaterial);
      background.name = 'background';
      const fill = new THREE.Mesh(this.barGeometry, this.barFillMaterial);
      fill.name = 'fill';
      bar.add(background, fill);
      this.scene.add(bar);
      this.enemyBars.set(unit.id, bar);
    }
    const width = unit.size.x;
    bar.position.set(toWorldX(unit.pos.x + width / 2), toWorldY(unit.pos.y - 12), ENEMY_Z + 16);
    const background = bar.getObjectByName('background') as THREE.Mesh;
    const fill = bar.getObjectByName('fill') as THREE.Mesh;
    background.scale.x = width;
    fill.scale.x = width * Math.max(0, unit.health / unit.maxHealth);
    fill.position.x = -(width - fill.scale.x) / 2;
    fill.position.z = 1;
  }

  private syncInstances(state: GameState): void {
    this.bullets.count = Math.min(MAX_BULLETS, state.bullets.length);
    for (let i = 0; i < this.bullets.count; i++) {
      const bullet = state.bullets[i];
      position.position.set(toWorldX(bullet.pos.x), toWorldY(bullet.pos.y), 72);
      const radius = bullet.owner === 'player' ? 3.2 : 3.7;
      position.scale.set(radius * 0.7, radius * 1.8, radius * 0.7);
      position.updateMatrix();
      this.bullets.setMatrixAt(i, position.matrix);
      this.bullets.setColorAt(i, tint.set(bullet.color));
    }
    this.bullets.instanceMatrix.needsUpdate = true;
    if (this.bullets.instanceColor) this.bullets.instanceColor.needsUpdate = true;

    this.particles.count = Math.min(MAX_PARTICLES, state.particles.length);
    for (let i = 0; i < this.particles.count; i++) {
      const particle = state.particles[i];
      position.position.set(toWorldX(particle.pos.x), toWorldY(particle.pos.y), 77);
      const scale = Math.max(0.2, particle.life * 2.5);
      position.scale.setScalar(scale);
      position.updateMatrix();
      this.particles.setMatrixAt(i, position.matrix);
      this.particles.setColorAt(i, tint.set(particle.color));
    }
    this.particles.instanceMatrix.needsUpdate = true;
    if (this.particles.instanceColor) this.particles.instanceColor.needsUpdate = true;
  }

  render(state: GameState, time: number): void {
    if (this.disposed) return;
    const delta = this.lastFrame ? Math.min(0.05, (time - this.lastFrame) / 1000) : 1 / 60;
    this.lastFrame = time;
    const coordinates = this.stars.geometry.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < 130; i++) {
      const index = i * 3;
      coordinates.setY(i, ((this.starSeeds[index + 1] - time * (0.003 + i % 5 * 0.002) + 420) % 840 + 840) % 840 - 420);
    }
    coordinates.needsUpdate = true;
    this.syncPlayer(state, delta);
    this.syncEnemies(state);
    this.syncInstances(state);
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    this.disposed = true;
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    const textures = new Set<THREE.Texture>();
    const collect = (node: THREE.Object3D) => {
      if (!(node instanceof THREE.Mesh || node instanceof THREE.Points)) return;
      geometries.add(node.geometry);
      const items = Array.isArray(node.material) ? node.material : [node.material];
      for (const material of items) {
        materials.add(material);
        for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value);
      }
    };
    this.scene.traverse(collect);
    for (const template of this.templates.values()) template.scene.traverse(collect);
    geometries.add(this.fallbackHull);
    geometries.add(this.flameGeometry);
    geometries.add(this.barGeometry);
    materials.add(this.fallbackPlayerMaterial);
    materials.add(this.fallbackEnemyMaterial);
    materials.add(this.playerFlameMaterial);
    materials.add(this.enemyFlameMaterial);
    materials.add(this.barBackgroundMaterial);
    materials.add(this.barFillMaterial);
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => material.dispose());
    textures.forEach((texture) => texture.dispose());
    this.renderer.dispose();
  }
}
