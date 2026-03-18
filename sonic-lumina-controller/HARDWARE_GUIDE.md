# Sonic Lumina — Guide de branchement hardware

## Table des matieres

1. [Materiel necessaire](#1-materiel-necessaire)
2. [Schema general](#2-schema-general)
3. [Alimentation](#3-alimentation)
4. [Branchement des MOSFETs (ruban RGBW)](#4-branchement-des-mosfets-ruban-rgbw)
5. [Recapitulatif des GPIOs](#5-recapitulatif-des-gpios)
6. [Code Arduino / ESP32](#6-code-arduino--esp32)
7. [Connexion depuis l'application](#7-connexion-depuis-lapplication)
8. [Depannage](#8-depannage)

---

## 1. Materiel necessaire

| Composant | Reference conseillee | Quantite |
|---|---|---|
| ESP32 (DevKit) | ESP32-WROOM-32 / ESP32-S3 | 1 |
| Ruban LED RGBW 12V | SMD 5050 RGBW (non-addressable, 4 canaux + commun) | 1 |
| MOSFET N-Channel logic-level | IRLZ44N ou IRL540N (Vgs < 3.3V) | 4 |
| Alimentation 12V | 12V DC, amperage selon longueur du ruban (ex: 5A pour 5m) | 1 |
| Resistances | 100 ohms (grille MOSFET) | 4 |
| Resistances pull-down | 10k ohms (grille MOSFET vers GND) | 4 |
| Fils Dupont / breadboard | - | selon besoin |
| Connecteur barrel jack (optionnel) | 5.5x2.1mm pour l'alim 12V | 1 |

> **Important** : Le ruban est **non-addressable** (pas du WS2812/NeoPixel). C'est un ruban analogique a 5 fils (R, G, B, W, +12V) pilote en PWM via des MOSFETs.

---

## 2. Schema general

```
                         +12V (alimentation)
                           |
                           |
              +------------+------------+
              |            |            |
           [Ruban LED RGBW - 5 fils]
              |    |    |    |    |
              R    G    B    W   +12V
              |    |    |    |
         D    D    D    D         <- Drain de chaque MOSFET
         |    |    |    |
    IRLZ44N  IRLZ44N  IRLZ44N  IRLZ44N
         |    |    |    |
         S    S    S    S         <- Source -> GND commune
         |    |    |    |
        GND  GND  GND  GND
         G    G    G    G         <- Gate (via R 100 ohm depuis ESP32)
         |    |    |    |
  GPIO16 GPIO17 GPIO18 GPIO19    <- PWM ESP32
```

---

## 3. Alimentation

### Ruban LED (12V)

Le ruban RGBW fonctionne en **12V DC**. L'ESP32 ne peut pas alimenter le ruban directement.

```
Alimentation 12V DC
    (+) ---------> fil +12V du ruban (souvent noir ou blanc)
    (-) ---------> GND commune (partagee avec ESP32)
```

**Calcul de l'amperage** : Un ruban RGBW 5050 consomme environ **14W/m** a pleine puissance (tous canaux a 255).
- 1m de ruban : alim 12V / 2A minimum
- 3m de ruban : alim 12V / 4A minimum
- 5m de ruban : alim 12V / 6A minimum

### ESP32

L'ESP32 est alimente separement via son port **USB** ou via le pin **VIN** (5V).

### GND commune (tres important)

La masse (GND) de l'alimentation 12V, de l'ESP32 et des MOSFETs **doit etre commune**. Sans ca, le PWM ne pilotera pas les MOSFETs correctement.

```
GND alim 12V ----+---- GND ESP32 ----+---- Source MOSFETs
                 |                    |
              (meme fil / meme rail)
```

---

## 4. Branchement des MOSFETs (ruban RGBW)

Chaque canal du ruban (R, G, B, W) est pilote par un **MOSFET N-Channel** en configuration **low-side switch**.

### Principe

```
+12V ───── Ruban LED (canal R) ───── Drain MOSFET
                                        |
                                       Gate ←── R 100Ω ←── GPIO ESP32
                                        |
                                      Source ───── GND
```

Le ruban a son **anode commune a +12V**. Quand l'ESP32 envoie un signal PWM sur la Gate du MOSFET, celui-ci laisse passer le courant du Drain vers la Source (GND), allumant le canal correspondant.

### Detail de branchement pour un canal

```
ESP32 GPIO16 ──── [R 100Ω] ──── Gate (IRLZ44N)
                                  |
                                 [R 10kΩ] ──── GND   (pull-down)
                                  |
                                Drain ──── fil Rouge du ruban
                                  |
                                Source ──── GND commune
```

- La **resistance 100 ohms** sur la Gate protege le GPIO et limite les pics de courant.
- La **resistance 10k ohms pull-down** (Gate vers GND) assure que le MOSFET reste **eteint** au boot de l'ESP32 (les GPIOs peuvent flotter au demarrage).

### Les 4 canaux

| Canal | Fil du ruban | MOSFET | GPIO ESP32 | Fonction LEDC |
|-------|-------------|--------|------------|---------------|
| Rouge (R) | fil rouge | IRLZ44N #1 | **GPIO 16** | Canal PWM 0 |
| Vert (G) | fil vert | IRLZ44N #2 | **GPIO 17** | Canal PWM 1 |
| Bleu (B) | fil bleu | IRLZ44N #3 | **GPIO 18** | Canal PWM 2 |
| Blanc (W) | fil blanc | IRLZ44N #4 | **GPIO 19** | Canal PWM 3 |

> **Pourquoi IRLZ44N ?** C'est un MOSFET **logic-level** : il se declenche pleinement a 3.3V sur la Gate, ce qui correspond a la tension des GPIOs de l'ESP32. Un IRF540N classique a besoin de 10V sur la Gate et ne fonctionnera **pas** correctement ici.

---

## 5. Recapitulatif des GPIOs

| GPIO | Fonction | Peripherique |
|------|----------|-------------|
| 16 | PWM canal Rouge | MOSFET #1 -> Ruban R |
| 17 | PWM canal Vert | MOSFET #2 -> Ruban G |
| 18 | PWM canal Bleu | MOSFET #3 -> Ruban B |
| 19 | PWM canal Blanc | MOSFET #4 -> Ruban W |

> **Note** : Ces GPIOs sont des suggestions. Tu peux utiliser n'importe quel GPIO capable de PWM sur l'ESP32 (eviter GPIO 0, 2, 5, 12, 15 qui ont des fonctions speciales au boot). Adapte les defines dans le sketch Arduino en consequence.

---

## 6. Code Arduino / ESP32

Le sketch complet se trouve dans le fichier **`esp32_rgbw_ble.ino`** a la racine du projet. Voici ce qu'il fait :

### Architecture du sketch

- **BLE** : Service UUID `19b10000-e8f2-537e-4f6c-d104768a1214` avec 1 caracteristique :
  - **LED** (`19b10001-...`) : `PROPERTY_WRITE | PROPERTY_READ` + descriptor BLE2902

### Protocole LED (LedWriteCallback)

L'app envoie **4 octets** `[R, G, B, W]` (0-255 chacun). Le sketch les applique directement aux canaux PWM via `applyColor()` -> `ledcWrite()`.

Le sketch supporte aussi un mode **retrocompatible 3 octets** `[R, G, B]` (le canal W est mis a 0).

### Gestion de la reconnexion

La reconnexion BLE est geree dans le `loop()` avec un pattern `oldDeviceConnected` :
- Quand le client se deconnecte, l'advertising redemarre apres 500ms
- Les LEDs ne sont **pas** eteintes automatiquement a la deconnexion (contrairement a d'autres implementations)

### Configuration PWM (setup)

```cpp
// Ordre dans le sketch : attach PUIS setup
ledcAttachPin(PIN_RED,    CH_RED);    // GPIO 16 -> Canal 0
ledcAttachPin(PIN_GREEN,  CH_GREEN);  // GPIO 17 -> Canal 1
ledcAttachPin(PIN_BLUE,   CH_BLUE);   // GPIO 18 -> Canal 2
ledcAttachPin(PIN_WHITE,  CH_WHITE);  // GPIO 19 -> Canal 3

ledcSetup(CH_RED,   5000, 8);  // 5kHz, 8-bit
ledcSetup(CH_GREEN, 5000, 8);
ledcSetup(CH_BLUE,  5000, 8);
ledcSetup(CH_WHITE, 5000, 8);

```

### Installation dans Arduino IDE

1. **Board Manager** : Installer le support ESP32 (`https://dl.espressif.com/dl/package_esp32_index.json`)
2. **Selectionner** : `ESP32 Dev Module` (ou ta carte specifique)
3. **Partition Scheme** : `Default 4MB with spiffs`
4. **Upload Speed** : 921600
5. **Ouvrir** `esp32_rgbw_ble.ino` et telecharger sur l'ESP32

---

## 7. Connexion depuis l'application

### Prerequis

- **Android** : Utiliser **Google Chrome** (version 56+). Activer le Bluetooth.
- **iOS** : Utiliser **Bluefy** (le navigateur BLE pour iOS). Safari ne supporte pas Web Bluetooth.
- **Desktop** : Chrome sur Windows/Mac/Linux (activer `chrome://flags/#enable-web-bluetooth` si necessaire).

### Etapes

1. **Alimenter l'ESP32** (USB ou VIN) et l'alimentation 12V du ruban.
2. **Ouvrir l'application** web Sonic Lumina dans le navigateur.
3. **Appuyer sur "INITIALIZE CONNECTION"** — le navigateur ouvre une popup de scan Bluetooth.
4. **Selectionner "SonicLumina"** dans la liste des appareils detectes.
5. Le statut passe a **"SYSTEM ONLINE"** — le ruban est pret a etre pilote.

### Controler le ruban LED

- Utiliser les **sliders R, G, B, W** pour mixer la couleur.
- Le slider **Brightness** applique un coefficient global (0-100%).
- Cliquer sur un **preset** (Red, Ocean, Sunset...) pour une couleur predefinie.
- Les valeurs sont envoyees a l'ESP32 en temps reel (debounce 30ms).

---

## 8. Depannage

| Probleme | Solution |
|----------|---------|
| L'ESP32 n'apparait pas dans le scan | Verifier que le sketch est bien uploade. Ouvrir le Serial Monitor pour voir "BLE pret". |
| Connexion echoue | S'assurer d'utiliser Chrome (Android) ou Bluefy (iOS). Verifier que le Bluetooth est active. |
| LEDs ne s'allument pas | Verifier la GND commune entre l'alim 12V et l'ESP32. Verifier que les MOSFETs sont bien des logic-level (IRLZ44N). |
| LEDs faibles / scintillent | Alimentation 12V sous-dimensionnee. Augmenter l'amperage. |
| Une seule couleur marche | Verifier le branchement du MOSFET du canal concerne (Gate, Drain, Source). |
| Deconnexion aleatoire | L'ESP32 et le telephone doivent etre a moins de ~10m. Eloigner des sources d'interference WiFi. |
