# ⚔ RPG World — Metin2 Benzeri 3D Oyun

## Teknoloji
- **Three.js** — 3D render motoru
- **Vite** — geliştirme sunucusu
- **Vanilla JavaScript** (ES Modules)

## Kurulum

```bash
# 1. Bağımlılıkları yükle
npm install

# 2. Geliştirme sunucusunu başlat
npm run dev

# Tarayıcı otomatik açılır: http://localhost:3000
```

## Oynanış

| Kontrol | Eylem |
|---------|-------|
| Sol Tık (zemin) | Karakteri oraya yürüt |
| Sol Tık (düşman) | Düşmanı hedef al |
| Sağ Tık + Sürükle | Kamerayı döndür |
| Mouse Tekerleği | Zoom in/out |
| Q | Güçlü Vuruş (x2.5 hasar) |
| W | Kasırga — AOE saldırı |
| E | Ateş Darbesi (x4 hasar) |
| R | Işık Huzmesi (x5 hasar) |
| T | Kalkan — %60 hasar azaltır |

## Mevcut Özellikler
- ✅ 3D arazi (vertex renkleri, yükseklik haritası)
- ✅ Köy ve binalar
- ✅ 5 farklı düşman türü (Domuz, Kurt, Ork, İskelet, Trol)
- ✅ Düşman AI (idle / chase / attack / return)
- ✅ Tıkla-yürü hareket sistemi
- ✅ 5 skill + cooldown sistemi
- ✅ HP/MP/EXP barları
- ✅ Seviye atlama sistemi
- ✅ Altın/EXP kazanma
- ✅ Floating damage sayıları
- ✅ Minimap
- ✅ Sohbet/log paneli
- ✅ Metin2 tarzı kamera (sağ tık döndür, scroll zoom)

## Sonraki Adımlar
- [ ] Envanter sistemi
- [ ] NPC ve görev sistemi
- [ ] Daha fazla düşman türü
- [ ] Item drop sistemi
- [ ] Ses efektleri
- [ ] Multiplayer (Socket.io)

## Proje Yapısı
```
src/
├── main.js      — Giriş noktası
├── Game.js      — Ana döngü, input, sahne kurulumu
├── World.js     — Arazi, binalar, ağaçlar, su
├── Player.js    — Karakter, hareket, saldırı, skill
├── Camera.js    — Metin2 tarzı üstten kamera
├── Enemy.js     — Düşman türleri, AI, EnemyManager
└── UI.js        — HUD, minimap, log, stat barları
```
