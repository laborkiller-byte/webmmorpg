import * as THREE from 'three';

export class Player {
  constructor(scene, world, ui) {
    this.scene = scene;
    this.world = world;
    this.ui = ui;

    this.level = 1;
    this.exp   = 0;
    this.expNeeded = 100;
    this.hp    = 500;
    this.hpMax = 500;
    this.mp    = 300;
    this.mpMax = 300;
    this.atk   = 45;
    this.def   = 20;
    this.spd   = 7;
    this.gold  = 0;

    this.targetPos  = null;
    this.moving     = false;
    this.moveSpeed  = this.spd;
    this.target     = null;

    // WASD tuş durumları
    this.keys = {};
    this._setupKeyListeners();

    this.attackRange    = 3.5;
    this.attackCooldown = 0;
    this.attackRate     = 1.2;

    this.skills = [
      { name: 'Güçlü Vuruş', mp: 20,  cd: 5,  timer: 0, dmgMult: 2.5  },
      { name: 'Kasırga',      mp: 35,  cd: 8,  timer: 0, dmgMult: 3.0, aoe: true },
      { name: 'Ateş Darbesi', mp: 50,  cd: 12, timer: 0, dmgMult: 4.0  },
      { name: 'Işık Huzmesi', mp: 60,  cd: 15, timer: 0, dmgMult: 5.0  },
      { name: 'Kalkan',       mp: 40,  cd: 20, timer: 0, shield: true   },
    ];
    this.shielded = false;

    this.hpRegenTimer = 0;
    this.mpRegenTimer = 0;

    this.mesh = null;
    this._buildMesh();
  }

  _setupKeyListeners() {
    document.addEventListener('keydown', e => {
      this.keys[e.code] = true;

      // Sadece 1-5 rakam tuşları skill kullanır
      // WASD hareket için kullanılır, skill tetiklemez
      const skillMap = {
        'Digit1': 0, 'Digit2': 1, 'Digit3': 2,
        'Digit4': 3, 'Digit5': 4,
      };
      if (skillMap[e.code] !== undefined) {
        this.useSkill(skillMap[e.code]);
      }
    });
    document.addEventListener('keyup', e => {
      this.keys[e.code] = false;
    });
  }

  _buildMesh() {
    const g = new THREE.Group();

    const bodyGeo = new THREE.CapsuleGeometry(0.4, 1.0, 4, 8);
    const bodyMat = new THREE.MeshPhongMaterial({ color: 0x3355AA, shininess: 60 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 1.0;
    body.castShadow = true;
    g.add(body);

    const headGeo = new THREE.SphereGeometry(0.28, 8, 8);
    const headMat = new THREE.MeshPhongMaterial({ color: 0xFFCC99 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 1.9;
    head.castShadow = true;
    g.add(head);

    const swordGeo = new THREE.BoxGeometry(0.08, 1.2, 0.08);
    const swordMat = new THREE.MeshPhongMaterial({ color: 0xCCCCCC, shininess: 200 });
    const sword = new THREE.Mesh(swordGeo, swordMat);
    sword.position.set(0.55, 1.2, 0.1);
    sword.rotation.z = -0.3;
    sword.castShadow = true;
    g.add(sword);
    this._sword = sword;

    const shieldGeo = new THREE.BoxGeometry(0.5, 0.6, 0.08);
    const shieldMat = new THREE.MeshPhongMaterial({ color: 0x884422, shininess: 80 });
    const shield = new THREE.Mesh(shieldGeo, shieldMat);
    shield.position.set(-0.55, 1.2, 0.1);
    g.add(shield);

    const shadowGeo = new THREE.CircleGeometry(0.5, 16);
    const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25 });
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.02;
    g.add(shadow);

    this._nameTag = this._makeNameTag('Savaşçı');
    this._nameTag.position.y = 2.4;
    g.add(this._nameTag);

    this.mesh = g;
    this.scene.add(this.mesh);
  }

  _makeNameTag(name) {
    const canvas = document.createElement('canvas');
    canvas.width = 128; canvas.height = 32;
    const ctx = canvas.getContext('2d');
    ctx.font = 'bold 18px Georgia';
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, 128, 32);
    ctx.fillStyle = '#FFD700';
    ctx.textAlign = 'center';
    ctx.fillText(name, 64, 22);
    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(2, 0.5, 1);
    return sprite;
  }

  spawn(pos) {
    this.mesh.position.copy(pos);
    this.mesh.position.y = this.world.getHeightAt(pos.x, pos.z);
  }

  moveTo(pos) {
    this.targetPos = pos.clone();
    this.targetPos.y = this.world.getHeightAt(pos.x, pos.z);
    this.moving = true;
  }

  setTarget(enemy) {
    this.target = enemy;
  }

  clearTarget() {
    this.target = null;
  }

  useSkill(idx) {
    const skill = this.skills[idx];
    if (!skill) return;
    if (skill.timer > 0) {
      this.ui.addLog(`${skill.name} bekleme süresinde! (${skill.timer.toFixed(1)}s)`, 'system');
      return;
    }
    if (this.mp < skill.mp) {
      this.ui.addLog('Yeterli MP yok!', 'system');
      return;
    }
    this.mp -= skill.mp;
    skill.timer = skill.cd;

    if (skill.shield) {
      this.shielded = true;
      this.ui.addLog(`${skill.name} aktif! (5s)`, 'system');
      setTimeout(() => { this.shielded = false; }, 5000);
      this._spawnSkillEffect(this.mesh.position, 0x4488FF);
      return;
    }

    if (skill.aoe) {
      this.ui.addLog(`${skill.name} kullanıldı!`, 'combat');
      this._spawnSkillEffect(this.mesh.position, 0xFF8800);
    } else {
      if (!this.target || this.target.dead) {
        this.ui.addLog('Hedef seçilmedi!', 'system');
        skill.timer = 0;
        return;
      }
      const dmg = Math.floor((this.atk + Math.random() * 10) * skill.dmgMult);
      this.target.takeDamage(dmg, true);
      this.ui.addLog(`${skill.name}: ${dmg} hasar!`, 'combat');
      this._spawnSkillEffect(this.target.mesh.position, 0xFF4400);
    }
  }

  _spawnSkillEffect(pos, color) {
    const geo = new THREE.SphereGeometry(1.5, 8, 8);
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.6, wireframe: true });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);
    mesh.position.y += 1;
    this.scene.add(mesh);
    let life = 0;
    const anim = () => {
      life += 0.05;
      mesh.scale.setScalar(1 + life * 2);
      mat.opacity = 0.6 * (1 - life);
      if (life < 1) requestAnimationFrame(anim);
      else this.scene.remove(mesh);
    };
    anim();
  }

  update(dt) {
    this._updateMovement(dt);
    this._updateCombat(dt);
    this._updateRegen(dt);
    this._updateSkillCooldowns(dt);
    this._updateAnimation(dt);
    this._keepOnTerrain();
  }

  _updateMovement(dt) {
    const k = this.keys;
    const wasdActive = k['KeyW'] || k['KeyS'] || k['KeyA'] || k['KeyD'];

    if (wasdActive) {
      this.moving = false;
      this.targetPos = null;

      const camYaw = window.game?.camera?.yaw ?? 0;
      const forward = new THREE.Vector3(-Math.sin(camYaw), 0, -Math.cos(camYaw));
      const right   = new THREE.Vector3( Math.cos(camYaw), 0, -Math.sin(camYaw));

      const move = new THREE.Vector3();
      if (k['KeyW']) move.add(forward);
      if (k['KeyS']) move.sub(forward);
      if (k['KeyD']) move.add(right);
      if (k['KeyA']) move.sub(right);

      if (move.length() > 0) {
        move.normalize();
        this.mesh.position.addScaledVector(move, this.moveSpeed * dt);
        this.mesh.lookAt(
          this.mesh.position.x + move.x,
          this.mesh.position.y,
          this.mesh.position.z + move.z
        );
      }
      return;
    }

    if (this.target && !this.target.dead) {
      const dist = this.mesh.position.distanceTo(this.target.mesh.position);
      if (dist > this.attackRange) {
        const dir = new THREE.Vector3().subVectors(this.target.mesh.position, this.mesh.position).normalize();
        this.mesh.position.addScaledVector(dir, this.moveSpeed * dt);
        this.mesh.lookAt(this.target.mesh.position.x, this.mesh.position.y, this.target.mesh.position.z);
      }
      return;
    }

    if (!this.moving || !this.targetPos) return;
    const dist = new THREE.Vector2(
      this.targetPos.x - this.mesh.position.x,
      this.targetPos.z - this.mesh.position.z
    ).length();

    if (dist < 0.2) { this.moving = false; return; }

    const dir = new THREE.Vector3(
      this.targetPos.x - this.mesh.position.x, 0,
      this.targetPos.z - this.mesh.position.z
    ).normalize();

    this.mesh.position.addScaledVector(dir, this.moveSpeed * dt);
    this.mesh.lookAt(
      this.mesh.position.x + dir.x,
      this.mesh.position.y,
      this.mesh.position.z + dir.z
    );
  }

  _updateCombat(dt) {
    if (this.attackCooldown > 0) this.attackCooldown -= dt;
    if (!this.target || this.target.dead) return;
    const dist = this.mesh.position.distanceTo(this.target.mesh.position);
    if (dist <= this.attackRange && this.attackCooldown <= 0) {
      this._doBasicAttack();
    }
  }

  _doBasicAttack() {
    const dmg = Math.floor(this.atk + Math.random() * 15 - this.target.def * 0.3);
    const finalDmg = Math.max(1, dmg);
    this.target.takeDamage(finalDmg, false);
    this.attackCooldown = 1 / this.attackRate;
    this.ui.addLog(`${finalDmg} hasar verdin.`, 'combat');
    this._swingSword();
  }

  _swingSword() {
    if (!this._sword) return;
    const startRot = this._sword.rotation.z;
    let t = 0;
    const anim = () => {
      t += 0.15;
      this._sword.rotation.z = startRot - Math.sin(t * Math.PI) * 0.8;
      if (t < 1) requestAnimationFrame(anim);
      else this._sword.rotation.z = startRot;
    };
    anim();
  }

  _updateRegen(dt) {
    this.hpRegenTimer += dt;
    this.mpRegenTimer += dt;
    if (this.hpRegenTimer >= 3) { this.hp = Math.min(this.hpMax, this.hp + 5); this.hpRegenTimer = 0; }
    if (this.mpRegenTimer >= 2) { this.mp = Math.min(this.mpMax, this.mp + 8); this.mpRegenTimer = 0; }
  }

  _updateSkillCooldowns(dt) {
    this.skills.forEach((s, i) => {
      if (s.timer > 0) {
        s.timer = Math.max(0, s.timer - dt);
        const el = document.getElementById('cd-' + i);
        if (el) {
          if (s.timer > 0) { el.style.display = 'flex'; el.textContent = s.timer.toFixed(1); }
          else el.style.display = 'none';
        }
      }
    });
  }

  _updateAnimation(dt) {
    if (this.moving || (this.target && !this.target.dead)) {
      const t = Date.now() * 0.008;
      if (this.mesh.children[0]) this.mesh.children[0].rotation.z = Math.sin(t) * 0.05;
    }
  }

  _keepOnTerrain() {
    const x = this.mesh.position.x;
    const z = this.mesh.position.z;
    const targetY = this.world.getHeightAt(x, z);
    this.mesh.position.y += (targetY - this.mesh.position.y) * 0.2;
  }

  takeDamage(dmg) {
    if (this.shielded) {
      const blocked = Math.floor(dmg * 0.6);
      dmg -= blocked;
      this.ui.addLog(`Kalkan ${blocked} hasarı engelledi!`, 'system');
    }
    const finalDmg = Math.max(1, dmg - this.def * 0.2);
    this.hp = Math.max(0, this.hp - finalDmg);
    this.ui.addLog(`${Math.floor(finalDmg)} hasar aldın!`, 'combat');
    if (this.hp <= 0) this._onDeath();
  }

  gainExp(amount) {
    this.exp += amount;
    this.ui.addLog(`+${amount} EXP kazandın.`, 'loot');
    if (this.exp >= this.expNeeded) this._levelUp();
  }

  gainGold(amount) {
    this.gold += amount;
    this.ui.addLog(`+${amount} altın kazandın!`, 'loot');
  }

  _levelUp() {
    this.exp -= this.expNeeded;
    this.level++;
    this.expNeeded = Math.floor(this.expNeeded * 1.4);
    this.hpMax += 50; this.mpMax += 20;
    this.hp = this.hpMax; this.mp = this.mpMax;
    this.atk += 8; this.def += 4;
    this.ui.addLog(`⬆ SEVİYE ${this.level}! Güçlendin!`, 'level');
    this._spawnSkillEffect(this.mesh.position, 0xFFDD00);
  }

  _onDeath() {
    this.ui.addLog('Öldün! Yeniden doğuyorsun...', 'system');
    setTimeout(() => {
      this.hp = this.hpMax; this.mp = this.mpMax;
      this.mesh.position.set(0, 0, 0);
      this.target = null;
    }, 3000);
  }
}
