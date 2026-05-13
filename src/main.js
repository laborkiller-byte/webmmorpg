import { Game } from './Game.js';

// Oyunu başlat
const game = new Game();
game.init();

// Global erişim (UI butonları için)
window.game = game;
window.useSkill = (idx) => game.player?.useSkill(idx);
