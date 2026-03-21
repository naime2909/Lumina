# Sonic Lumina v2

## Projet

Application web React + sketch ESP32 pour controler un ruban LED RGBW non-addressable via Bluetooth Low Energy (BLE). L'utilisateur pilote les couleurs et la luminosite depuis son telephone, les commandes sont envoyees a un ESP32 qui drive le ruban via des MOSFETs.

## Stack technique

- **Frontend** : React 18 + TypeScript + Vite + Tailwind CSS (CDN)
- **Hardware** : ESP32-S (Arduino Core 3.x) + module 4 MOSFETs + ruban RGBW 12V
- **Communication** : Web Bluetooth API (navigateur) <-> BLE (ESP32)
- **Deploiement** : Vercel (depuis GitHub)
- **Repo** : https://github.com/naime2909/Lumina.git

## Architecture

```
lumina v2/
├── vercel.json                          # Config Vercel (build depuis sous-dossier)
└── sonic-lumina-controller/
    ├── index.html                       # Point d'entree HTML + Tailwind CDN + fonts
    ├── index.tsx                        # Bootstrap React
    ├── App.tsx                          # Composant racine, gestion connexion BLE
    ├── types.ts                         # ConnectionStatus, ColorRGBW, PRESET_COLORS
    ├── constants.ts                     # UUIDs BLE (service + LED characteristic)
    ├── services/
    │   └── bleService.ts                # Service BLE : connect, disconnect, sendColor(r,g,b,w)
    ├── components/
    │   └── LedController.tsx            # UI controle RGBW : sliders, brightness, presets
    ├── esp32_rgbw_ble.ino               # Sketch Arduino pour ESP32
    ├── HARDWARE_GUIDE.md                # Guide de branchement complet
    ├── package.json                     # Dependencies (react, vite, lucide-react)
    ├── vite.config.ts                   # Config Vite
    ├── tsconfig.json                    # Config TypeScript
    └── manifest.json                    # PWA manifest
```

## Protocole BLE

- **Service UUID** : `19b10000-e8f2-537e-4f6c-d104768a1214`
- **LED Characteristic** : `19b10001-e8f2-537e-4f6c-d104768a1214`
  - Write : 4 octets `[R, G, B, W]` (0-255 chacun)
  - Read : retourne les valeurs courantes
  - Supporte aussi 3 octets `[R, G, B]` (retrocompatibilite)

## Hardware actuel

- **ESP32-S** avec GPIOs disponibles : D5, D18, D19, D21
- **Module 4 MOSFETs** (4 IN, 4 OUT+, 4 OUT-)
- **Ruban LED RGBW 12V** non-addressable (5 fils : R, G, B, W, +12V)
- **Alimentation 12V DC**

### Mapping GPIOs (dans le sketch)

```
D5  -> IN1 module MOSFET -> Rouge
D18 -> IN2 module MOSFET -> Vert
D19 -> IN3 module MOSFET -> Bleu
D21 -> IN4 module MOSFET -> Blanc
```

### ESP32 Arduino Core 3.x

Le sketch utilise la nouvelle API LEDC :
- `ledcAttach(pin, freq, resolution)` au lieu de `ledcSetup()` + `ledcAttachPin()`
- `ledcWrite(pin, value)` avec le numero de pin (pas de numero de canal)

## Frontend - Points cles

- **Tailwind CSS** charge via CDN dans index.html (pas de PostCSS)
- **Fonts** : Orbitron (titres cyberpunk) + Rajdhani (body)
- **bleService** : singleton, debounce 30ms sur les envois BLE
- **LedController** : sliders RGBW + brightness global + 11 presets couleur
- **Mode simulation** : l'UI reste utilisable meme sans connexion BLE (opacite reduite)

## Vercel

- Build depuis le sous-dossier `sonic-lumina-controller/`
- `installCommand` : `cd sonic-lumina-controller && npm install`
- `buildCommand` : `cd sonic-lumina-controller && npm run build`
- `outputDirectory` : `sonic-lumina-controller/dist`

## Commandes

```bash
cd sonic-lumina-controller
npm install
npm run dev      # Dev server
npm run build    # Build production
```
