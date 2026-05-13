export class UI {
  constructor() {
    this._minimapCtx = document.getElementById('minimap').getContext('2d');
    this._minimapSize = 140;
    this._minimapScale = 1.2; // piksel başına dünya birimi
  }

  setLoadingProgress(pct, msg) {
    const bar = document.getElementById('loading-bar');
    const status = document.getElementById('loading-status');
    if (bar) bar.style.width = pct + '%';
    if (status) status.textContent = msg;
  }

  hideLoading() {
    const el = document.getElementById('loading');
    if (el) { el.style.opacity = '0'; el.style.transition = 'opacity 0.5s'; setTimeout(() => el.style.display = 'none', 500); }
  }

  setTarget(enemy) {
    const panel = document.getElementById('target-panel');
    if (!panel) return;
    panel.style.display = 'block';
    document.getElementById('target-name').textContent = `${enemy.name} (Lv.${enemy.type === 'troll' ? 8 : enemy.type === 'orc' ? 5 : 3})`;
    this._updateTargetHP(enemy);
  }

  clearTarget() {
    const panel = document.getElementById('target-panel');
    if (panel) panel.style.display = 'none';
  }

  _updateTargetHP(enemy) {
    const bar = document.getElementById('target-hp-bar');
    if (bar && enemy) bar.style.width = Math.max(0, (enemy.hp / enemy.hpMax) * 100) + '%';
  }

  addLog(msg, type = 'system') {
    const log = document.getElementById('chat-log');
    if (!log) return;
    const line = document.createElement('div');
    line.className = 'chat-line ' + type;
    line.textContent = msg;
    log.appendChild(line);
    // Max 40 satır tut
    while (log.children.length > 40) log.removeChild(log.firstChild);
    log.scrollTop = log.scrollHeight;
  }

  update(player, enemyManager) {
    if (!player) return;

    // HP
    const hpPct = Math.max(0, player.hp / player.hpMax * 100);
    const mpPct = Math.max(0, player.mp / player.mpMax * 100);
    const expPct = Math.min(100, player.exp / player.expNeeded * 100);

    this._set('hp-bar',  'width', hpPct + '%');
    this._set('mp-bar',  'width', mpPct + '%');
    this._set('exp-bar', 'width', expPct + '%');
    this._setText('hp-val', Math.floor(player.hp));
    this._setText('hp-max', player.hpMax);
    this._setText('mp-val', Math.floor(player.mp));
    this._setText('mp-max', player.mpMax);
    this._setText('exp-pct', expPct.toFixed(1));
    this._setText('char-level', player.level);
    this._setText('stat-atk', player.atk);
    this._setText('stat-def', player.def);
    this._setText('stat-spd', Math.floor(player.spd * 10));
    this._setText('stat-gold', player.gold);

    // Koordinat
    const p = player.mesh.position;
    const coordEl = document.getElementById('coords');
    if (coordEl) coordEl.textContent = `X:${p.x.toFixed(0)} Z:${p.z.toFixed(0)}`;

    // Hedef HP güncelle
    if (player.target && !player.target.dead) {
      this._updateTargetHP(player.target);
    } else {
      const panel = document.getElementById('target-panel');
      if (panel && player.target?.dead) panel.style.display = 'none';
    }

    // Minimap
    this._drawMinimap(player, enemyManager);
  }

  _drawMinimap(player, enemyManager) {
    const ctx = this._minimapCtx;
    const size = this._minimapSize;
    const s = this._minimapScale;
    const cx = size / 2, cy = size / 2;
    const px = player.mesh.position.x;
    const pz = player.mesh.position.z;

    ctx.clearRect(0, 0, size, size);

    // Arka plan
    ctx.fillStyle = '#0a1a0a';
    ctx.fillRect(0, 0, size, size);

    // Izgara
    ctx.strokeStyle = '#1a3a1a';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < size; i += 14) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, size); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(size, i); ctx.stroke();
    }

    // Düşmanlar
    enemyManager.getAll().forEach(e => {
      if (e.dead || !e.mesh) return;
      const ex = cx + (e.mesh.position.x - px) * s;
      const ez = cy + (e.mesh.position.z - pz) * s;
      if (ex < 0 || ex > size || ez < 0 || ez > size) return;
      ctx.fillStyle = e.state === 'chase' || e.state === 'attack' ? '#FF3333' : '#FF8844';
      ctx.beginPath();
      ctx.arc(ex, ez, 2.5, 0, Math.PI * 2);
      ctx.fill();
    });

    // Köy binaları (sabit referans noktaları)
    const buildings = [[-8,-8],[5,-6],[-6,8],[8,6]];
    ctx.fillStyle = '#AA8833';
    buildings.forEach(([bx, bz]) => {
      const mx = cx + (bx - px) * s;
      const mz = cy + (bz - pz) * s;
      ctx.fillRect(mx - 3, mz - 3, 6, 6);
    });

    // Oyuncu (merkez)
    ctx.fillStyle = '#00FFAA';
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Kuzey işareti
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 10px Georgia';
    ctx.textAlign = 'center';
    ctx.fillText('K', size / 2, 12);
  }

  _set(id, prop, val) {
    const el = document.getElementById(id);
    if (el) el.style[prop] = val;
  }

  _setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }
}
