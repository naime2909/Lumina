/*
 * SonicLumina - ESP32 BLE RGBW LED Strip + Buzzer Controller
 *
 * Controls a non-addressable RGBW LED strip via 4 MOSFETs/transistors
 * driven by ESP32 LEDC PWM channels. Receives RGBW values (0-255)
 * over BLE from the SonicLumina web app.
 *
 * Wiring:
 *   GPIO 16 -> MOSFET Gate (Red channel)
 *   GPIO 17 -> MOSFET Gate (Green channel)
 *   GPIO 18 -> MOSFET Gate (Blue channel)
 *   GPIO 19 -> MOSFET Gate (White channel)
 *   GPIO 25 -> Buzzer (+)
 *   LED strip 12V/24V -> External PSU V+
 *   MOSFET Drain -> LED strip R/G/B/W pads
 *   MOSFET Source -> PSU GND
 *   ESP32 GND -> PSU GND (common ground)
 *
 * BLE Protocol:
 *   LED Characteristic: 4 bytes [R, G, B, W] each 0-255
 *   Notes Characteristic: array of uint16 frequencies
 */

#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

// ---- Pin Configuration ----
// Change these to match your wiring
#define PIN_RED    16
#define PIN_GREEN  17
#define PIN_BLUE   18
#define PIN_WHITE  19
#define PIN_BUZZER 25

// ---- LEDC PWM Configuration ----
#define PWM_FREQ       5000   // 5 kHz - good for LED strips
#define PWM_RESOLUTION 8      // 8-bit = 0-255
#define CH_RED         0
#define CH_GREEN       1
#define CH_BLUE        2
#define CH_WHITE       3

// ---- BLE UUIDs (must match constants.ts) ----
#define SERVICE_UUID        "19b10000-e8f2-537e-4f6c-d104768a1214"
#define CHAR_LED_UUID       "19b10001-e8f2-537e-4f6c-d104768a1214"
#define CHAR_NOTES_UUID     "19b10002-e8f2-537e-4f6c-d104768a1214"

// ---- State ----
bool deviceConnected = false;
bool oldDeviceConnected = false;

BLEServer* pServer = nullptr;
BLECharacteristic* pLedChar = nullptr;
BLECharacteristic* pNotesChar = nullptr;

// Current RGBW values
uint8_t currentR = 0;
uint8_t currentG = 0;
uint8_t currentB = 0;
uint8_t currentW = 0;

// ---- Apply RGBW to LED strip ----
void applyColor(uint8_t r, uint8_t g, uint8_t b, uint8_t w) {
  ledcWrite(CH_RED, r);
  ledcWrite(CH_GREEN, g);
  ledcWrite(CH_BLUE, b);
  ledcWrite(CH_WHITE, w);

  currentR = r;
  currentG = g;
  currentB = b;
  currentW = w;

  Serial.printf("LED -> R:%d G:%d B:%d W:%d\n", r, g, b, w);
}

// ---- Play a tone on the buzzer ----
void playTone(uint16_t frequency, uint16_t duration_ms) {
  if (frequency == 0) {
    noTone(PIN_BUZZER);
    delay(duration_ms);
    return;
  }
  tone(PIN_BUZZER, frequency, duration_ms);
  delay(duration_ms);
  noTone(PIN_BUZZER);
}

// ---- BLE Callbacks ----
class ServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer* server) override {
    deviceConnected = true;
    Serial.println("Client connected");
  }

  void onDisconnect(BLEServer* server) override {
    deviceConnected = false;
    Serial.println("Client disconnected");
  }
};

class LedWriteCallback : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic* pChar) override {
    String value = pChar->getValue();

    if (value.length() >= 4) {
      // New RGBW protocol: 4 bytes, each 0-255
      uint8_t r = (uint8_t)value[0];
      uint8_t g = (uint8_t)value[1];
      uint8_t b = (uint8_t)value[2];
      uint8_t w = (uint8_t)value[3];
      applyColor(r, g, b, w);
    } else if (value.length() == 3) {
      // Backwards compatible: old RGB protocol (3 bytes)
      uint8_t r = (uint8_t)value[0];
      uint8_t g = (uint8_t)value[1];
      uint8_t b = (uint8_t)value[2];
      applyColor(r, g, b, 0);
    }
  }
};

class NotesWriteCallback : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic* pChar) override {
    String value = pChar->getValue();
    int noteCount = value.length() / 2;  // 16-bit per note

    if (noteCount == 0) return;

    Serial.printf("Playing %d notes\n", noteCount);

    for (int i = 0; i < noteCount; i++) {
      uint16_t freq = (uint8_t)value[i * 2] | ((uint8_t)value[i * 2 + 1] << 8);
      Serial.printf("  Note %d: %d Hz\n", i, freq);
      playTone(freq, 300);  // 300ms per note
      delay(50);            // Small gap between notes
    }
  }
};

// ---- Setup ----
void setup() {
  Serial.begin(115200);
  Serial.println("SonicLumina RGBW starting...");

  // Setup LEDC PWM channels for RGBW
  ledcAttachPin(PIN_RED, CH_RED);
  ledcAttachPin(PIN_GREEN, CH_GREEN);
  ledcAttachPin(PIN_BLUE, CH_BLUE);
  ledcAttachPin(PIN_WHITE, CH_WHITE);

  ledcSetup(CH_RED, PWM_FREQ, PWM_RESOLUTION);
  ledcSetup(CH_GREEN, PWM_FREQ, PWM_RESOLUTION);
  ledcSetup(CH_BLUE, PWM_FREQ, PWM_RESOLUTION);
  ledcSetup(CH_WHITE, PWM_FREQ, PWM_RESOLUTION);

  // Start with LEDs off
  applyColor(0, 0, 0, 0);

  // Buzzer pin
  pinMode(PIN_BUZZER, OUTPUT);

  // ---- BLE Init ----
  BLEDevice::init("SonicLumina");
  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new ServerCallbacks());

  BLEService* pService = pServer->createService(SERVICE_UUID);

  // LED Characteristic (RGBW write)
  pLedChar = pService->createCharacteristic(
    CHAR_LED_UUID,
    BLECharacteristic::PROPERTY_WRITE | BLECharacteristic::PROPERTY_READ
  );
  pLedChar->setCallbacks(new LedWriteCallback());
  pLedChar->addDescriptor(new BLE2902());

  // Notes Characteristic (frequency array write)
  pNotesChar = pService->createCharacteristic(
    CHAR_NOTES_UUID,
    BLECharacteristic::PROPERTY_WRITE
  );
  pNotesChar->setCallbacks(new NotesWriteCallback());
  pNotesChar->addDescriptor(new BLE2902());

  pService->start();

  // Start advertising
  BLEAdvertising* pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->setScanResponse(true);
  pAdvertising->setMinPreferred(0x06);
  pAdvertising->setMinPreferred(0x12);
  BLEDevice::startAdvertising();

  Serial.println("BLE ready - waiting for connections...");
}

// ---- Loop ----
void loop() {
  // Handle reconnection: restart advertising when client disconnects
  if (!deviceConnected && oldDeviceConnected) {
    delay(500);
    BLEDevice::startAdvertising();
    Serial.println("Advertising restarted");
    oldDeviceConnected = false;
  }

  if (deviceConnected && !oldDeviceConnected) {
    oldDeviceConnected = true;
  }

  delay(20);
}
