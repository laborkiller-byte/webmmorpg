import * as THREE from 'three';

// Düşman türleri
const ENEMY_TYPES = {
  boar: {
    name: 'Yaban Domuzu', color: 0x8B4513, scale: 0.9,
    hp: 80, atk: 12, def: 3, spd: 3.5, exp: 15, gold: [2, 6],
    aggroRange: 8, attackRange: 2.0, attackRate: 1.0,
  },
  wolf: {
    name: 'Kurt', color: 0x555566, scale: 0.85,
    hp: 120, atk: 18, def: 5, spd: 5.0, exp: 25, gold: [4, 10],
    aggroRange: 12, attackRange: 1.8, attackRate: 1.3,
  },
  orc: {
    name: 'Ork Savaşçı', color: 0x336622, scale: 1.1,
    hp: 200, atk: 28, def: 10, spd: 3.0, exp: 50, gold: [10, 25],
    aggroRange: 10, attackRange: 2.2, attackRate: 0.9,
  },
  skeleton: {
    name: 'İskelet', color: 0xDDDDCC, scale: 0.95,
    hp: 150, atk: 22, def: 6, spd: 4.0, exp: 35, gold: [6, 15],
    aggroRange: 14, attackRange: 2.0, attackRate: 1.1,
  },
  troll: {
    name: 'Dev Trol', color: 0x446644, scale: 1.4,
    hp: 450, atk: 45, def: 18, spd: 2.5, exp: 120, gold: [30, 60],
    aggroRange: 8, attackRange: 3.0, attackRate: 0.6,
  },
};

const SPAWN_ZONES = [
  { type: 'boar',     count: 8,  area: { x: [-60, -20], z: [-60, 20] } },
  { type: 'wolf',     count: 6,  area: { x: [20, 70],   z: [-50, 10] } },
  { type: 'orc',      count: 5,  area: { x: [-30, 30],  z: [30, 80]  } },
  { type: 'skeleton', count: 6,  area: { x: [30, 80],   z: [20, 70]  } },
  { type: 'troll',    count: 2,  area: { x: [-80, -40], z: [40, 80]  } },
];

export class Enemy {
  constructor(scene, world, player, ui, type, pos) {
    this.scene  = scene;
    this.world  = world;
    this.player = player;
    this.ui     = ui;
    this.type   = type;

    const def = ENEMY_TYPES[type];
    this.name   = def.name;
    this.hpMax  = def.hp;
    this.hp     = def.hp;
    this.atk    = def.atk;
    this.def    = def.def;
    this.spd    = def.spd;
    this.exp    = def.exp;
    this.gold   = def.gold;
    this.aggroRange   = def.aggroRange;
    this.attackRange  = def.attackRange;
    this.attackRate   = def.attackRate;
    this._scale = def.scale;
    this._color = def.color;

    this.state    = 'idle';   // idle | chase | attack | return
    this.spawnPos = pos.clone();
    this.attackCooldown = 0;
    this.dead     = false;
    this.respawnTimer = 0;

    this.mesh = null;
    this._hpBarMesh = null;
    this._buildMesh(pos, def);
  }

  _buildMesh(pos, def) {
    const g = new THREE.Group();

    const bodyMat = new THREE.MeshPhongMaterial({ color: def.color, shininess: 40 });

    if (this.type === 'boar' || this.type === 'wolf') {
      // Dört bacaklı hayvan
      const bodyGeo = new THREE.BoxGeometry(0.8 * def.scale, 0.5 * def.scale, 1.2 * def.scale);
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.y = 0.6 * def.scale;
      body.castShadow = true;
      g.add(body);

      const headGeo = new THREE.BoxGeometry(0.45 * def.scale, 0.4 * def.scale, 0.45 * def.scale);
      const head = new THREE.Mesh(headGeo, bodyMat);
      head.position.set(0, 0.85 * def.scale, -0.6 * def.scale);
      head.castShadow = true;
      g.add(head);

      // Bacaklar
      const legGeo = new THREE.CylinderGeometry(0.08 * def.scale, 0.07 * def.scale, 0.5 * def.scale);
      [[-0.3, 0.4], [0.3, 0.4], [-0.3, -0.4], [0.3, -0.4]].forEach(([lx, lz]) => {
        const leg = new THREE.Mesh(legGeo, bodyMat);
        leg.position.set(lx * def.scale, 0.25 * def.scale, lz * def.scale);
        g.add(leg);
      });
    } else {
      // İki ayaklı (orc/skeleton/troll)
      const bodyGeo = new THREE.CapsuleGeometry(0.35 * def.scale, 0.8 * def.scale, 4, 8);
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.y = 0.9 * def.scale;
      body.castShadow = true;
      g.add(body);

      const headGeo = new THREE.SphereGeometry(0.28 * def.scale, 6, 6);
      const head = new THREE.Mesh(headGeo, bodyMat);
      head.position.y = 1.65 * def.scale;
      head.castShadow = true;
      g.add(head);

      // Silah
      const weapGeo = new THREE.BoxGeometry(0.08 * def.scale, 1.0 * def.scale, 0.08 * def.scale);
      const weapMat = new THREE.MeshPhongMaterial({ color: 0x888888 });
      const weap = new THREE.Mesh(weapGeo, weapMat);
      weap.position.set(0.5 * def.scale, 1.0 * def.scale, 0);
      weap.rotation.z = 0.3;
      weap.castShadow = true;
      g.add(weap);
    }

    // HP bar (sprite)
    const hpCanvas = document.createElement('canvas');
    hpCanvas.width = 64; hpCanvas.height = 12;
    this._hpCtx = hpCanvas.getContext('2d');
    this._hpTex = new THREE.CanvasTexture(hpCanvas);
    const hpMat = new THREE.SpriteMaterial({ map: this._hpTex, transparent: true });
    const hpSprite = new THREE.Sprite(hpMat);
    hpSprite.scale.set(1.8, 0.25, 1);
    hpSprite.position.y = (def.type === 'troll' ? 2.5 : 2.0) * def.scale;
    this._hpBarMesh = hpSprite;
    g.add(hpSprite);

    // İsim etiketi
    const nameSprite = this._makeLabel(def.name, '#FF6644');
    nameSprite.position.y = (2.3) * def.scale;
    g.add(nameSprite);

    // Gölge
    const shadowGeo = new THREE.CircleGeometry(0.4 * def.scale, 12);
    const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.2 });
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.02;
    g.add(shadow);

    g.position.copy(pos);
    g.position.y = this.world.getHeightAt(pos.x, pos.z);
    this.scene.add(g);
    this.mesh = g;
    this._updateHPBar();
  }

  _makeLabel(text, color = '#FF6644') {
    const c = document.createElement('canvas');
    c.width = 128; c.height = 28;
    const ctx = c.getContext('2d');
    ctx.font = 'bold 14px Georgia';
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.fillText(text, 64, 20);
    const tex = new THREE.CanvasTexture(c);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
    const s = new THREE.Sprite(mat);
    s.scale.set(2.5, 0.45, 1);
    return s;
  }

  _updateHPBar() {
    if (!this._hpCtx) return;
    const ctx = this._hpCtx;
    const pct = this.hp / this.hpMax;
    ctx.clearRect(0, 0, 64, 12);
    ctx.fillStyle = '#220000';
    ctx.fillRect(0, 0, 64, 12);
    ctx.fillStyle = pct > 0.5 ? '#44DD44' : pct > 0.25 ? '#DDAA22' : '#DD2222';
    ctx.fillRect(1, 1, Math.max(0, (64 - 2) * pct), 10);
    this._hpTex.needsUpdate = true;
  }

  takeDamage(dmg, isSkill = false) {
    const finalDmg = Math.max(1, dmg - this.def * 0.4);
    this.hp -= finalDmg;
    this._updateHPBar();
    this._showFloatingDmg(finalDmg, isSkill);
    if (this.hp <= 0) this._onDeath();
    return finalDmg;
  }

  _showFloatingDmg(dmg, isSkill) {
    const c = document.createElement('canvas');
    c.width = 80; c.height = 32;
    const ctx = c.getContext('2d');
    ctx.font = `bold ${isSkill ? 22 : 16}px Georgia`;
    ctx.fillStyle = isSkill ? '#FFD700' : '#FF4444';
    ctx.textAlign = 'center';
    ctx.fillText('-' + Math.floor(dmg), 40, 24);
    const tex = new THREE.CanvasTexture(c);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
    const s = new THREE.Sprite(mat);
    s.scale.set(1.5, 0.6, 1);
    s.position.copy(this.mesh.position);
    s.position.y += 2;
    this.scene.add(s);
    let t = 0;
    const anim = () => {
      t += 0.04;
      s.position.y += 0.04;
      mat.opacity = 1 - t;
      if (t < 1) requestAnimationFrame(anim);
      else this.scene.remove(s);
    };
    anim();
  }

  _onDeath() {
    this.dead = true;
    this.state = 'dead';
    this.player.gainExp(this.exp);
    const gold = this.gold[0] + Math.floor(Math.random() * (this.gold[1] - this.gold[0]));
    this.player.gainGold(gold);
    this.ui.addLog(`${this.name} öldürüldü! +${this.exp} EXP, +${gold} altın`, 'loot');

    // Ölüm animasyonu
    let t = 0;
    const anim = () => {
      t += 0.05;
      this.mesh.rotation.x = t * Math.PI / 2;
      this.mesh.position.y -= 0.04;
      if (t < 1) requestAnimationFrame(anim);
      else {
        this.scene.remove(this.mesh);
        this.mesh = null;
      }
    };
    anim();
    this.respawnTimer = 20; // 20 saniye sonra yeniden doğ
  }

  _respawn() {
    this.hp = this.hpMax;
    this.dead = false;
    this.state = 'idle';
    this._buildMesh(this.spawnPos.clone(), ENEMY_TYPES[this.type]);
  }

  update(dt) {
    if (this.dead) {
      this.respawnTimer -= dt;
      if (this.respawnTimer <= 0) this._respawn();
      return;
    }
    if (!this.mesh) return;

    this.attackCooldown -= dt;
    const distToPlayer = this.mesh.position.distanceTo(this.player.mesh.position);
    const distToSpawn  = this.mesh.position.distanceTo(this.spawnPos);

    switch (this.state) {
      case 'idle':
        if (distToPlayer <= this.aggroRange) this.state = 'chase';
        // Hafif dolaşma
        if (Math.random() < 0.002) {
          const angle = Math.random() * Math.PI * 2;
          this.mesh.position.x += Math.cos(angle) * 0.5;
          this.mesh.position.z += Math.sin(angle) * 0.5;
        }
        break;

      case 'chase':
        if (distToPlayer > this.aggroRange * 2) { this.state = 'return'; break; }
        if (distToPlayer <= this.attackRange)    { this.state = 'attack'; break; }
        // Oyuncuya doğru koş
        const dir = new THREE.Vector3().subVectors(this.player.mesh.position, this.mesh.position).normalize();
        this.mesh.position.addScaledVector(dir, this.spd * dt);
        this.mesh.lookAt(this.player.mesh.position.x, this.mesh.position.y, this.player.mesh.position.z);
        break;

      case 'attack':
        if (distToPlayer > this.attackRange * 1.3) { this.state = 'chase'; break; }
        if (this.attackCooldown <= 0) {
          this._doAttack();
        }
        this.mesh.lookAt(this.player.mesh.position.x, this.mesh.position.y, this.player.mesh.position.z);
        break;

      case 'return':
        if (distToPlayer <= this.aggroRange) { this.state = 'chase'; break; }
        if (distToSpawn < 1) { this.state = 'idle'; break; }
        const retDir = new THREE.Vector3().subVectors(this.spawnPos, this.mesh.position).normalize();
        this.mesh.position.addScaledVector(retDir, this.spd * dt);
        // HP iyileştir
        this.hp = Math.min(this.hpMax, this.hp + this.hpMax * 0.05 * dt);
        this._updateHPBar();
        break;
    }

    // Arazi yüksekliğini takip et
    const targetY = this.world.getHeightAt(this.mesh.position.x, this.mesh.position.z);
    this.mesh.position.y += (targetY - this.mesh.position.y) * 0.3;
  }

  _doAttack() {
    this.attackCooldown = 1 / this.attackRate;
    const dmg = Math.floor(this.atk + Math.random() * 8);
    this.player.takeDamage(dmg);
  }
}

// ─────────────────────────────────────────────

export class EnemyManager {
  constructor(scene, world, ui, player) {
    this.scene   = scene;
    this.world   = world;
    this.ui      = ui;
    this.player  = player;
    this.enemies = [];
  }

  spawnInitialEnemies() {
    SPAWN_ZONES.forEach(zone => {
      for (let i = 0; i < zone.count; i++) {
        const x = zone.area.x[0] + Math.random() * (zone.area.x[1] - zone.area.x[0]);
        const z = zone.area.z[0] + Math.random() * (zone.area.z[1] - zone.area.z[0]);
        const pos = new THREE.Vector3(x, 0, z);
        const enemy = new Enemy(this.scene, this.world, this.player, this.ui, zone.type, pos);
        this.enemies.push(enemy);
      }
    });
  }

  getAll() { return this.enemies; }

  update(dt) {
    this.enemies.forEach(e => e.update(dt));
  }
}
