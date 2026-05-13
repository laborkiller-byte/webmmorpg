import * as THREE from 'three';

export class World {
  constructor(scene) {
    this.scene = scene;
    this.walkableMeshes = [];
    this.objects = [];
    this.size = 200; // toplam harita boyutu
  }

  async build() {
    this._buildTerrain();
    this._buildWater();
    this._buildTrees();
    this._buildRocks();
    this._buildVillage();
    this._buildSkybox();
  }

  _buildTerrain() {
    // Yükseklik haritası için simplex-benzeri fonksiyon
    const segments = 128;
    const geo = new THREE.PlaneGeometry(this.size, this.size, segments, segments);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      // Doğal arazi yüksekliği
      let y = 0;
      y += Math.sin(x * 0.05) * Math.cos(z * 0.05) * 4;
      y += Math.sin(x * 0.12 + 0.5) * Math.cos(z * 0.1) * 2;
      y += Math.sin(x * 0.25) * Math.cos(z * 0.22) * 1;
      // Başlangıç alanı düzelt (ortada düz bölge)
      const distCenter = Math.sqrt(x * x + z * z);
      if (distCenter < 25) y *= distCenter / 25;
      pos.setY(i, y);
    }
    geo.computeVertexNormals();

    // Vertex renkleri (çimen / toprak)
    const colors = [];
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      if (y > 3)       colors.push(0.55, 0.5, 0.4);  // kayalık
      else if (y > 1)  colors.push(0.3, 0.6, 0.2);   // koyu çimen
      else             colors.push(0.35, 0.7, 0.25);  // açık çimen
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const mat = new THREE.MeshLambertMaterial({
      vertexColors: true,
    });

    const terrain = new THREE.Mesh(geo, mat);
    terrain.receiveShadow = true;
    terrain.name = 'terrain';
    this.scene.add(terrain);
    this.walkableMeshes.push(terrain);
    this._terrainGeo = geo; // yükseklik sorgusu için sakla
  }

  _buildWater() {
    const geo = new THREE.PlaneGeometry(this.size * 0.4, this.size * 0.3);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshPhongMaterial({
      color: 0x1A6B8A,
      transparent: true,
      opacity: 0.78,
      shininess: 120,
    });
    const water = new THREE.Mesh(geo, mat);
    water.position.set(-60, -0.3, 40);
    water.receiveShadow = true;
    water.name = 'water';
    this.scene.add(water);
    this._water = water;
  }

  _buildTrees() {
    const positions = this._randomPositions(120, 18, 90);
    positions.forEach(([x, z]) => {
      const y = this.getHeightAt(x, z);
      const tree = this._makeTree(x, y, z);
      this.scene.add(tree);
      this.objects.push(tree);
    });
  }

  _makeTree(x, y, z) {
    const g = new THREE.Group();
    g.position.set(x, y, z);

    const scale = 0.7 + Math.random() * 0.7;

    // Gövde
    const trunkGeo = new THREE.CylinderGeometry(0.15 * scale, 0.22 * scale, 1.6 * scale, 6);
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x5C3A1E });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 0.8 * scale;
    trunk.castShadow = true;
    g.add(trunk);

    // 3 katlı yaprak
    const leafMat = new THREE.MeshLambertMaterial({ color: 0x2D7A2D });
    const leafMat2 = new THREE.MeshLambertMaterial({ color: 0x1E5E1E });
    [[1.8, 1.4], [2.4, 1.0], [1.4, 2.2]].forEach(([radius, yPos], i) => {
      const lGeo = new THREE.ConeGeometry(radius * scale * 0.5, 1.2 * scale, 7);
      const leaf = new THREE.Mesh(lGeo, i % 2 === 0 ? leafMat : leafMat2);
      leaf.position.y = yPos * scale;
      leaf.castShadow = true;
      g.add(leaf);
    });

    return g;
  }

  _buildRocks() {
    const positions = this._randomPositions(60, 15, 80);
    positions.forEach(([x, z]) => {
      const y = this.getHeightAt(x, z);
      const rock = this._makeRock(x, y, z);
      this.scene.add(rock);
      this.objects.push(rock);
    });
  }

  _makeRock(x, y, z) {
    const g = new THREE.Group();
    const scale = 0.4 + Math.random() * 1.2;
    const count = 1 + Math.floor(Math.random() * 3);
    const mat = new THREE.MeshLambertMaterial({ color: 0x808080 });
    for (let i = 0; i < count; i++) {
      const geo = new THREE.DodecahedronGeometry(scale * (0.5 + Math.random() * 0.5), 0);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(
        x + (Math.random() - 0.5) * scale,
        y + scale * 0.3,
        z + (Math.random() - 0.5) * scale
      );
      mesh.rotation.set(Math.random(), Math.random(), Math.random());
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.scene.add(mesh);
    }
    return g;
  }

  _buildVillage() {
    // Köy binaları
    const buildings = [
      { x: -8, z: -8, w: 6, h: 5, d: 6, color: 0xC8A870, roof: 0x8B3A2A, name: 'Depo' },
      { x:  5, z: -6, w: 5, h: 4, d: 5, color: 0xD4B896, roof: 0x7A3020, name: 'Köy Evi' },
      { x: -6, z:  8, w: 4, h: 3, d: 4, color: 0xC0A060, roof: 0x8B4513, name: 'Dükkan' },
      { x:  8, z:  6, w: 7, h: 6, d: 5, color: 0xB89050, roof: 0x6B2A10, name: 'Kale' },
    ];

    buildings.forEach(b => {
      const wallGeo = new THREE.BoxGeometry(b.w, b.h, b.d);
      const wallMat = new THREE.MeshLambertMaterial({ color: b.color });
      const wall = new THREE.Mesh(wallGeo, wallMat);
      wall.position.set(b.x, this.getHeightAt(b.x, b.z) + b.h / 2, b.z);
      wall.castShadow = true;
      wall.receiveShadow = true;
      this.scene.add(wall);

      // Çatı
      const roofGeo = new THREE.ConeGeometry(Math.max(b.w, b.d) * 0.75, b.h * 0.7, 4);
      const roofMat = new THREE.MeshLambertMaterial({ color: b.roof });
      const roof = new THREE.Mesh(roofGeo, roofMat);
      roof.position.set(b.x, this.getHeightAt(b.x, b.z) + b.h + b.h * 0.35, b.z);
      roof.rotation.y = Math.PI / 4;
      roof.castShadow = true;
      this.scene.add(roof);
    });

    // Köy meydanı — kaldırım
    const plazaGeo = new THREE.CircleGeometry(10, 32);
    plazaGeo.rotateX(-Math.PI / 2);
    const plazaMat = new THREE.MeshLambertMaterial({ color: 0xA0906A });
    const plaza = new THREE.Mesh(plazaGeo, plazaMat);
    plaza.position.y = 0.05;
    plaza.receiveShadow = true;
    this.scene.add(plaza);

    // Ortadaki taş
    const stoneGeo = new THREE.CylinderGeometry(1, 1.2, 1.5, 8);
    const stoneMat = new THREE.MeshLambertMaterial({ color: 0x888888 });
    const stone = new THREE.Mesh(stoneGeo, stoneMat);
    stone.position.set(0, 0.75, 0);
    stone.castShadow = true;
    this.scene.add(stone);
  }

  _buildSkybox() {
    // Basit gradient gökyüzü için arka plan zaten scene.background ile ayarlı
    // İleride skybox texture eklenebilir
  }

  // Arazide belirli x,z noktasının yüksekliğini hesapla
  getHeightAt(x, z) {
    let y = 0;
    y += Math.sin(x * 0.05) * Math.cos(z * 0.05) * 4;
    y += Math.sin(x * 0.12 + 0.5) * Math.cos(z * 0.1) * 2;
    y += Math.sin(x * 0.25) * Math.cos(z * 0.22) * 1;
    const distCenter = Math.sqrt(x * x + z * z);
    if (distCenter < 25) y *= distCenter / 25;
    return y;
  }

  getWalkableMeshes() {
    return this.walkableMeshes;
  }

  _randomPositions(count, minDist, maxDist) {
    const result = [];
    let tries = 0;
    while (result.length < count && tries < count * 10) {
      tries++;
      const angle = Math.random() * Math.PI * 2;
      const dist = minDist + Math.random() * (maxDist - minDist);
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;
      result.push([x, z]);
    }
    return result;
  }

  update(dt) {
    // Su animasyonu
    if (this._water) {
      this._water.position.y = -0.3 + Math.sin(Date.now() * 0.001) * 0.05;
    }
  }
}
