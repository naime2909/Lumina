/*
 * SonicLumina - ESP32 BLE RGBW LED Strip Controller
 *
 * Controls a non-addressable RGBW LED strip via PCA9685 PWM driver
 * and 4 MOSFET modules. Receives RGBW values (0-255) over BLE
 * from the SonicLumina web app.
 *
 * Wiring:
 *   ESP32 D21 (SDA) -> PCA9685 SDA
 *   ESP32 D22 (SCL) -> PCA9685 SCL
 *   ESP32 VIN (5V)  -> PCA9685 VCC
 *   ESP32 GND       -> PCA9685 GND
 *
 *   PCA9685 CH0 -> PWM1 module MOSFET -> Ruban Rouge
 *   PCA9685 CH1 -> PWM2 module MOSFET -> Ruban Vert
 *   PCA9685 CH2 -> PWM3 module MOSFET -> Ruban Bleu
 *   PCA9685 CH3 -> PWM4 module MOSFET -> Ruban Blanc
 *
 *   Alim 12V (+) -> DC+ module MOSFET + fil +12V ruban
 *   Alim 12V (-) -> DC- module MOSFET + GND ESP32
 *
 * BLE Protocol:
 *   LED Characteristic: 4 bytes [R, G, B, W] each 0-255
 */

#include <Wire.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

// ---- PCA9685 Configuration ----
#define PCA9685_ADDR  0x40
#define PCA9685_MODE1 0x00
#define PCA9685_PRESCALE 0xFE
#define PCA9685_LED0_ON_L 0x06

// PCA9685 channels for RGBW
#define CH_RED    0
#define CH_GREEN  1
#define CH_BLUE   2
#define CH_WHITE  3

// I2C pins
#define SDA_PIN 21
#define SCL_PIN 22

// ---- BLE UUIDs (must match constants.ts) ----
#define SERVICE_UUID        "19b10000-e8f2-537e-4f6c-d104768a1214"
#define CHAR_LED_UUID       "19b10001-e8f2-537e-4f6c-d104768a1214"

// ---- State ----
bool deviceConnected = false;
bool oldDeviceConnected = false;

BLEServer* pServer = nullptr;
BLECharacteristic* pLedChar = nullptr;

uint8_t currentR = 0;
uint8_t currentG = 0;
uint8_t currentB = 0;
uint8_t currentW = 0;

// ---- PCA9685 Functions ----
void pca9685Write(uint8_t reg, uint8_t value) {
  Wire.beginTransmission(PCA9685_ADDR);
  Wire.write(reg);
  Wire.write(value);
  Wire.endTransmission();
}

void pca9685Init() {
  Wire.begin(SDA_PIN, SCL_PIN);

  // Reset PCA9685
  pca9685Write(PCA9685_MODE1, 0x00);
  delay(5);

  // Set PWM frequency to ~1kHz (good for LED strips)
  // prescale = round(25MHz / (4096 * freq)) - 1
  // For 1kHz: round(25000000 / (4096 * 1000)) - 1 = 5
  pca9685Write(PCA9685_MODE1, 0x10);  // Sleep mode to set prescale
  pca9685Write(PCA9685_PRESCALE, 5);  // ~1kHz
  pca9685Write(PCA9685_MODE1, 0x00);  // Wake up
  delay(5);
  pca9685Write(PCA9685_MODE1, 0xA0);  // Auto-increment + restart
}

void pca9685SetPWM(uint8_t channel, uint16_t value) {
  // value: 0-4095 (12-bit PWM)
  uint8_t reg = PCA9685_LED0_ON_L + 4 * channel;

  Wire.beginTransmission(PCA9685_ADDR);
  Wire.write(reg);

  if (value == 0) {
    // Full OFF
    Wire.write(0x00);  // ON_L
    Wire.write(0x00);  // ON_H
    Wire.write(0x00);  // OFF_L
    Wire.write(0x10);  // OFF_H (bit 4 = full off)
  } else if (value >= 4095) {
    // Full ON
    Wire.write(0x00);  // ON_L
    Wire.write(0x10);  // ON_H (bit 4 = full on)
    Wire.write(0x00);  // OFF_L
    Wire.write(0x00);  // OFF_H
  } else {
    Wire.write(0x00);           // ON_L
    Wire.write(0x00);           // ON_H
    Wire.write(value & 0xFF);   // OFF_L
    Wire.write(value >> 8);     // OFF_H
  }

  Wire.endTransmission();
}

// ---- Apply RGBW to LED strip via PCA9685 ----
void applyColor(uint8_t r, uint8_t g, uint8_t b, uint8_t w) {
  // Map 0-255 to 0-4095 (12-bit PCA9685)
  pca9685SetPWM(CH_RED,   (uint16_t)r * 16);
  pca9685SetPWM(CH_GREEN, (uint16_t)g * 16);
  pca9685SetPWM(CH_BLUE,  (uint16_t)b * 16);
  pca9685SetPWM(CH_WHITE, (uint16_t)w * 16);

  currentR = r;
  currentG = g;
  currentB = b;
  currentW = w;

  Serial.printf("LED -> R:%d G:%d B:%d W:%d\n", r, g, b, w);
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
      uint8_t r = (uint8_t)value[0];
      uint8_t g = (uint8_t)value[1];
      uint8_t b = (uint8_t)value[2];
      uint8_t w = (uint8_t)value[3];
      applyColor(r, g, b, w);
    } else if (value.length() == 3) {
      uint8_t r = (uint8_t)value[0];
      uint8_t g = (uint8_t)value[1];
      uint8_t b = (uint8_t)value[2];
      applyColor(r, g, b, 0);
    }
  }
};

// ---- Setup ----
void setup() {
  Serial.begin(115200);
  Serial.println("SonicLumina RGBW starting...");

  // Init PCA9685
  pca9685Init();
  applyColor(0, 0, 0, 0);
  Serial.println("PCA9685 initialized");

  // ---- BLE Init ----
  BLEDevice::init("SonicLumina");
  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new ServerCallbacks());

  BLEService* pService = pServer->createService(SERVICE_UUID);

  pLedChar = pService->createCharacteristic(
    CHAR_LED_UUID,
    BLECharacteristic::PROPERTY_WRITE | BLECharacteristic::PROPERTY_READ
  );
  pLedChar->setCallbacks(new LedWriteCallback());
  pLedChar->addDescriptor(new BLE2902());

  pService->start();

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
