import * as THREE from 'three';
import { World }  from './World.js';
import { Player } from './Player.js';
import { CameraController } from './Camera.js';
import { EnemyManager } from './Enemy.js';
import { UI } from './UI.js';

export class Game {
  constructor() {
    this.renderer  = null;
    this.scene     = null;
    this.clock     = new THREE.Clock();
    this.world     = null;
    this.player    = null;
    this.camera    = null;
    this.enemies   = null;
    this.ui        = null;
    this.running   = false;
  }

  async init() {
    this._setupRenderer();
    this._setupScene();
    this._setupLights();

    this.ui = new UI();
    this.ui.setLoadingProgress(10, 'Arazi oluşturuluyor...');

    // Dünya
    this.world = new World(this.scene);
    await this.world.build();
    this.ui.setLoadingProgress(40, 'Karakterler yükleniyor...');

    // Oyuncu
    this.player = new Player(this.scene, this.world, this.ui);
    this.player.spawn(new THREE.Vector3(0, 0, 0));
    this.ui.setLoadingProgress(65, 'Düşmanlar yerleştiriliyor...');

    // Düşmanlar
    this.enemies = new EnemyManager(this.scene, this.world, this.ui, this.player);
    this.enemies.spawnInitialEnemies();
    this.ui.setLoadingProgress(85, 'Kamera ayarlanıyor...');

    // Kamera
    this.camera = new CameraController(this.player.mesh);

    this.ui.setLoadingProgress(100, 'Hazır!');
    await this._delay(600);
    this.ui.hideLoading();

    // Giriş
    this._setupInput();
    window.addEventListener('resize', () => this._onResize());

    this.running = true;
    this._loop();
  }

  _setupRenderer() {
    const canvas = document.getElementById('canvas');
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.setClearColor(0x87CEEB); // gökyüzü rengi fallback
  }

  _setupScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87CEEB);
    this.scene.fog = new THREE.Fog(0xC8E8F0, 60, 200);
  }

  _setupLights() {
    // Güneş ışığı
    const sun = new THREE.DirectionalLight(0xFFF5E0, 1.6);
    sun.position.set(80, 120, 60);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 400;
    sun.shadow.camera.left = -100;
    sun.shadow.camera.right = 100;
    sun.shadow.camera.top = 100;
    sun.shadow.camera.bottom = -100;
    sun.shadow.bias = -0.001;
    this.scene.add(sun);

    // Ambient
    const amb = new THREE.AmbientLight(0x8090B0, 0.6);
    this.scene.add(amb);

    // Gökyüzü ışığı (yumuşak)
    const hemi = new THREE.HemisphereLight(0x87CEEB, 0x5C7A3E, 0.4);
    this.scene.add(hemi);
  }

  _setupInput() {
    // Mouse click — hareket / saldırı
    document.getElementById('canvas').addEventListener('click', (e) => {
      if (!this.running) return;
      this._handleClick(e);
    });

    // Sağ tık kamera döndürme
    document.getElementById('canvas').addEventListener('contextmenu', e => e.preventDefault());

    // Mouse sürükleme (kamera)
    let dragging = false, lastX = 0, lastY = 0;
    const canvas = document.getElementById('canvas');
    canvas.addEventListener('mousedown', e => {
      if (e.button === 2) { dragging = true; lastX = e.clientX; lastY = e.clientY; }
    });
    canvas.addEventListener('mousemove', e => {
      if (dragging && this.camera) {
        this.camera.onMouseDrag(e.clientX - lastX, e.clientY - lastY);
        lastX = e.clientX; lastY = e.clientY;
      }
    });
    canvas.addEventListener('mouseup', e => { if (e.button === 2) dragging = false; });

    // Scroll — zoom
    canvas.addEventListener('wheel', e => {
      if (this.camera) this.camera.onWheel(e.deltaY);
    });

    // Klavye
    document.addEventListener('keydown', e => this._onKeyDown(e));
  }

  _handleClick(e) {
    const canvas = document.getElementById('canvas');
    const rect = canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(ndc, this.camera.cam);

    // Düşmana tıkladı mı?
    const enemyMeshes = this.enemies.getAll().map(en => en.mesh).filter(Boolean);
    const hitEnemy = raycaster.intersectObjects(enemyMeshes, true);
    if (hitEnemy.length > 0) {
      // En yakın düşmanı bul
      const hitObj = hitEnemy[0].object;
      const enemy = this.enemies.getAll().find(en => en.mesh && (en.mesh === hitObj || en.mesh.getObjectById(hitObj.id)));
      if (enemy) {
        this.player.setTarget(enemy);
        this.ui.setTarget(enemy);
        return;
      }
    }

    // Zemine tıkladı — yürü
    const groundObjects = this.world.getWalkableMeshes();
    const hitGround = raycaster.intersectObjects(groundObjects, true);
    if (hitGround.length > 0) {
      const pt = hitGround[0].point;
      this.player.moveTo(pt);
      this.player.clearTarget();
      this.ui.clearTarget();
    }
  }

  _onKeyDown(e) {
    if (!this.player) return;
    switch(e.code) {
      case 'KeyQ': this.player.useSkill(0); break;
      case 'KeyW': this.player.useSkill(1); break;
      case 'KeyE': this.player.useSkill(2); break;
      case 'KeyR': this.player.useSkill(3); break;
      case 'KeyT': this.player.useSkill(4); break;
    }
  }

  _loop() {
    if (!this.running) return;
    requestAnimationFrame(() => this._loop());

    const dt = Math.min(this.clock.getDelta(), 0.05); // max 50ms

    this.player.update(dt);
    this.enemies.update(dt);
    this.camera.update(dt);
    this.ui.update(this.player, this.enemies);

    this.renderer.render(this.scene, this.camera.cam);
  }

  _onResize() {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    if (this.camera) {
      this.camera.cam.aspect = window.innerWidth / window.innerHeight;
      this.camera.cam.updateProjectionMatrix();
    }
  }

  _delay(ms) { return new Promise(r => setTimeout(r, ms)); }
}
