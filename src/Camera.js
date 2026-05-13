import * as THREE from 'three';

export class CameraController {
  constructor(target) {
    this.target = target; // player mesh
    this.cam = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 500);

    // Kamera parametreleri (Metin2 tarzı — izometrik-benzeri üstten bakış)
    this.distance = 22;   // hedeften uzaklık
    this.minDist  = 6;
    this.maxDist  = 60;

    this.yaw   = 0;         // yatay açı (fare ile döndürülür)
    this.pitch = 0.75;      // dikey açı (radyan) — yukarıdan bakış
    this.minPitch = 0.3;
    this.maxPitch = 1.3;

    this.currentPos = new THREE.Vector3();
    this.currentTarget = new THREE.Vector3();
    this.smoothFactor = 8; // ne kadar yumuşak takip

    this._update(); // ilk konumu ayarla
  }

  onMouseDrag(dx, dy) {
    this.yaw   -= dx * 0.008;
    this.pitch += dy * 0.006;
    this.pitch  = Math.max(this.minPitch, Math.min(this.maxPitch, this.pitch));
  }

  onWheel(delta) {
    this.distance += delta * 0.02;
    this.distance = Math.max(this.minDist, Math.min(this.maxDist, this.distance));
  }

  update(dt) {
    const lerpSpeed = Math.min(1, this.smoothFactor * dt);

    // İstenen kamera pozisyonu
    const desiredPos = this._calcDesiredPos();

    this.currentPos.lerp(desiredPos, lerpSpeed);
    this.cam.position.copy(this.currentPos);

    // Baktığı nokta — oyuncunun biraz üstü
    const lookTarget = this.target.position.clone().add(new THREE.Vector3(0, 1.5, 0));
    this.currentTarget.lerp(lookTarget, lerpSpeed);
    this.cam.lookAt(this.currentTarget);
  }

  _calcDesiredPos() {
    const px = this.target.position.x + Math.sin(this.yaw) * Math.cos(this.pitch) * this.distance;
    const py = this.target.position.y + Math.sin(this.pitch) * this.distance;
    const pz = this.target.position.z + Math.cos(this.yaw) * Math.cos(this.pitch) * this.distance;
    return new THREE.Vector3(px, py, pz);
  }

  _update() {
    const pos = this._calcDesiredPos();
    this.currentPos.copy(pos);
    this.cam.position.copy(pos);
    this.cam.lookAt(this.target.position);
  }
}
