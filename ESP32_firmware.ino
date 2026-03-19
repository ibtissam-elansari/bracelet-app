/**
 * ============================================================
 *  VITAL MONITOR — ESP32 Bracelet Firmware
 * ============================================================
 *
 * Hardware:
 *   ESP32 Dev Module (38 pins)
 *   MAX30102   — Heart rate (I2C: SDA=21, SCL=22)
 *   DS18B20    — Temperature (OneWire: pin 4)
 *   MPU-6050   — Accelerometer / Fall detection (I2C: SDA=21, SCL=22)
 *   NEO-6M     — GPS (UART2: RX=16, TX=17)
 *   SIM800L    — GSM SMS (UART1: RX=26, TX=27)
 *   SOS button — pin 15 (INPUT_PULLUP, active LOW)
 *   Vibration  — pin 2 (via NPN transistor)
 *
 * Libraries (install in Arduino IDE Library Manager):
 *   - PubSubClient by Nick O'Leary
 *   - MAX30105 by SparkFun Electronics
 *   - DallasTemperature + OneWire by Miles Burton
 *   - MPU6050 by Electronic Cats
 *   - TinyGPS++ by Mikal Hart
 *
 * Board: "ESP32 Dev Module" — install via
 *   Preferences → Additional Boards Manager URLs:
 *   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
 * ============================================================
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <Wire.h>

// Sensor libraries — uncomment when hardware is wired
// #include "MAX30105.h"
// #include "heartRate.h"
// #include <OneWire.h>
// #include <DallasTemperature.h>
// #include <MPU6050.h>
// #include <TinyGPS++.h>

// ── WiFi ─────────────────────────────────────────────────────────────────────
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASS = "YOUR_WIFI_PASSWORD";

// ── Mosquitto broker (your Mac's LAN IP, port 1883) ──────────────────────────
// Find your Mac IP: run  ipconfig getifaddr en0  in Terminal
const char* MQTT_HOST   = "192.168.1.10";   // ← change this
const int   MQTT_PORT   = 1883;
const char* MQTT_TOPIC  = "bracelet/sensors";
const char* MQTT_STATUS = "bracelet/status";
const char* MQTT_ID     = "esp32-bracelet-001";

// ── Emergency contact number (sent in SIM800L SMS) ───────────────────────────
// This is the number the bracelet calls when fall/SOS is triggered.
// The phone app also stores this but the bracelet dials it independently.
const char* EMERGENCY_NUMBER = "+212XXXXXXXXX";

// ── Pin definitions ──────────────────────────────────────────────────────────
#define SOS_PIN         15    // Push button (INPUT_PULLUP, active LOW)
#define VIBRATION_PIN    2    // NPN base via 1kΩ resistor
#define DS18B20_PIN      4    // OneWire data line
#define GPS_RX_PIN      16    // NEO-6M TX  → ESP32 RX2
#define GPS_TX_PIN      17    // NEO-6M RX  → ESP32 TX2 (optional)
#define SIM800L_RX_PIN  26    // SIM800L TX → ESP32
#define SIM800L_TX_PIN  27    // SIM800L RX ← ESP32

// ── Fall detection threshold (MPU-6050) ──────────────────────────────────────
// Adjust based on bracelet placement and sensitivity needed
#define FALL_THRESHOLD  2.5f   // g-force (combined XYZ)
#define FREEFALL_THRESH 0.4f   // near-zero g during freefall

// ── Globals ──────────────────────────────────────────────────────────────────
WiFiClient   wifiClient;
PubSubClient mqtt(wifiClient);

// Sensor objects (uncomment when using real sensors)
// MAX30105      hrSensor;
// OneWire       oneWire(DS18B20_PIN);
// DallasTemperature tempSensor(&oneWire);
// MPU6050       mpu;
// TinyGPSPlus   gps;
// HardwareSerial gpsSerial(2);   // UART2 for GPS
// HardwareSerial simSerial(1);   // UART1 for SIM800L

// Live sensor values
int   heartRate    = 72;
float temperature  = 36.8f;
bool  fallDetected = false;
bool  moving       = false;
bool  sosPressed   = false;
float latitude     = 34.033300f;
float longitude    = -5.000000f;
bool  gpsValid     = false;
bool  smsSent      = false;

// State tracking
bool  lastSosState     = HIGH;  // for debounce
unsigned long lastPublishMs  = 0;
unsigned long lastFallMs     = 0;
bool  fallCooldown     = false;

const unsigned long PUBLISH_INTERVAL = 1000;   // 1 s
const unsigned long FALL_COOLDOWN_MS = 10000;  // 10 s between fall SMS

// ─────────────────────────────────────────────────────────────────────────────
//  WiFi
// ─────────────────────────────────────────────────────────────────────────────
void connectWifi() {
  Serial.print("[WiFi] Connecting to ");
  Serial.print(WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500); Serial.print(".");
    attempts++;
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[WiFi] Connected — IP: " + WiFi.localIP().toString());
  } else {
    Serial.println("\n[WiFi] Failed — will retry");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  MQTT
// ─────────────────────────────────────────────────────────────────────────────
void connectMqtt() {
  mqtt.setServer(MQTT_HOST, MQTT_PORT);
  mqtt.setKeepAlive(30);

  Serial.print("[MQTT] Connecting to ");
  Serial.print(MQTT_HOST);

  // Last Will and Testament — broker notifies subscribers if ESP32 drops
  while (!mqtt.connected()) {
    bool ok = mqtt.connect(MQTT_ID, MQTT_STATUS, 1, true, "offline");
    if (ok) {
      mqtt.publish(MQTT_STATUS, "online", true);
      Serial.println(" — connected");
    } else {
      Serial.print(" — failed rc=");
      Serial.print(mqtt.state());
      Serial.println(" retrying in 3s");
      delay(3000);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  SIM800L — Send emergency SMS
// ─────────────────────────────────────────────────────────────────────────────
void sendSMS(const char* reason) {
  char body[220];
  if (gpsValid) {
    snprintf(body, sizeof(body),
      "EMERGENCY: %s\nLocation: https://maps.google.com/?q=%.6f,%.6f\nContact bracelet wearer immediately.",
      reason, latitude, longitude);
  } else {
    snprintf(body, sizeof(body),
      "EMERGENCY: %s\nGPS location unavailable. Please contact bracelet wearer immediately.",
      reason);
  }

  Serial.println("[SIM800L] Sending SMS to " + String(EMERGENCY_NUMBER));

  // ── Uncomment when SIM800L is wired ──
  // simSerial.println("AT");             delay(300);
  // simSerial.println("AT+CMGF=1");      delay(300);  // text mode
  // simSerial.print("AT+CMGS=\"");
  // simSerial.print(EMERGENCY_NUMBER);
  // simSerial.println("\"");             delay(300);
  // simSerial.print(body);
  // simSerial.write(26);                 delay(4000); // Ctrl+Z sends

  smsSent = true;
  Serial.println("[SIM800L] SMS body: " + String(body));

  // Vibrate to confirm SMS sent
  vibrateMotor(200);
}

// ─────────────────────────────────────────────────────────────────────────────
//  Vibration motor
// ─────────────────────────────────────────────────────────────────────────────
void vibrateMotor(int ms) {
  digitalWrite(VIBRATION_PIN, HIGH);
  delay(ms);
  digitalWrite(VIBRATION_PIN, LOW);
}

void vibratePattern(int times, int onMs, int offMs) {
  for (int i = 0; i < times; i++) {
    vibrateMotor(onMs);
    if (i < times - 1) delay(offMs);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Read sensors (replace stubs with real library calls)
// ─────────────────────────────────────────────────────────────────────────────
void readHeartRate() {
  // ── Real implementation ──
  // long irVal = hrSensor.getIR();
  // if (checkForBeat(irVal)) {
  //   beatsPerMinute = 60 / (delta / 1000.0);  // calculate BPM
  // }
  // Simulated drift:
  heartRate = constrain(heartRate + random(-2, 3), 55, 105);
}

void readTemperature() {
  // ── Real implementation ──
  // tempSensor.requestTemperatures();
  // temperature = tempSensor.getTempCByIndex(0);
  // Simulated:
  temperature += (random(-1, 2) * 0.1f);
  temperature = constrain(temperature, 36.0f, 37.8f);
}

void readAccelerometer() {
  // ── Real implementation ──
  // int16_t ax, ay, az;
  // mpu.getAcceleration(&ax, &ay, &az);
  // float aX = ax / 16384.0, aY = ay / 16384.0, aZ = az / 16384.0;
  // float magnitude = sqrt(aX*aX + aY*aY + aZ*aZ);
  // moving = (abs(magnitude - 1.0) > 0.15);  // deviation from 1g = moving
  // Fall: freefall (magnitude < FREEFALL_THRESH) followed by impact (> FALL_THRESHOLD)
  // Simulated:
  moving = (random(0, 10) > 3);

  if (!fallCooldown) {
    fallDetected = (random(0, 100) > 97);  // ~3% during testing
  }
}

void readGPS() {
  // ── Real implementation ──
  // while (gpsSerial.available() > 0) {
  //   if (gps.encode(gpsSerial.read())) {
  //     if (gps.location.isValid()) {
  //       latitude  = gps.location.lat();
  //       longitude = gps.location.lng();
  //       gpsValid  = true;
  //     }
  //   }
  // }
  // Simulated slow drift:
  latitude  += (random(-1, 2) * 0.00005f);
  longitude += (random(-1, 2) * 0.00005f);
  gpsValid = true;
}

void readSosButton() {
  bool currentState = digitalRead(SOS_PIN);
  // Debounce: trigger on falling edge (HIGH→LOW)
  if (lastSosState == HIGH && currentState == LOW) {
    sosPressed   = true;
    lastSosState = LOW;
  } else if (currentState == HIGH) {
    lastSosState = HIGH;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Build and publish MQTT payload
// ─────────────────────────────────────────────────────────────────────────────
void publishPayload() {
  char payload[200];
  snprintf(payload, sizeof(payload),
    "HR:%d;TEMP:%.1f;FALL:%d;MOVE:%d;SOS:%d;LAT:%.6f;LON:%.6f;SMS:%d",
    heartRate,
    temperature,
    fallDetected ? 1 : 0,
    moving       ? 1 : 0,
    sosPressed   ? 1 : 0,
    latitude,
    longitude,
    smsSent      ? 1 : 0
  );

  mqtt.publish(MQTT_TOPIC, payload, false);  // retain=false for live data
  Serial.println("[MQTT] " + String(payload));

  // Reset one-shot flags after reporting
  smsSent      = false;
  sosPressed   = false;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Setup
// ─────────────────────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  Serial.println("\n[BOOT] Vital Monitor Bracelet v2.0");

  // Pin setup
  pinMode(SOS_PIN,       INPUT_PULLUP);
  pinMode(VIBRATION_PIN, OUTPUT);
  digitalWrite(VIBRATION_PIN, LOW);

  // I2C for MAX30102 + MPU-6050
  Wire.begin(21, 22);

  // GPS serial
  // gpsSerial.begin(9600, SERIAL_8N1, GPS_RX_PIN, GPS_TX_PIN);

  // SIM800L serial
  // simSerial.begin(9600, SERIAL_8N1, SIM800L_RX_PIN, SIM800L_TX_PIN);

  // Init sensors (uncomment for real hardware)
  // hrSensor.begin(Wire, I2C_SPEED_FAST);
  // hrSensor.setup();
  // tempSensor.begin();
  // mpu.initialize();

  // Boot vibration
  vibratePattern(2, 150, 100);

  // Network
  connectWifi();
  connectMqtt();

  Serial.println("[BOOT] Ready — publishing every 1s");
}

// ─────────────────────────────────────────────────────────────────────────────
//  Main loop
// ─────────────────────────────────────────────────────────────────────────────
void loop() {
  // Maintain connections
  if (WiFi.status() != WL_CONNECTED) connectWifi();
  if (!mqtt.connected())             connectMqtt();
  mqtt.loop();

  // Periodic sensor read + publish
  unsigned long now = millis();
  if (now - lastPublishMs >= PUBLISH_INTERVAL) {
    lastPublishMs = now;

    readHeartRate();
    readTemperature();
    readAccelerometer();
    readGPS();
    readSosButton();

    // ── Handle fall event ──────────────────────────────────────────────────
    if (fallDetected && !fallCooldown) {
      Serial.println("[ALERT] Fall detected!");
      vibratePattern(3, 300, 150);     // 3 strong pulses
      sendSMS("Fall detected by bracelet accelerometer");
      fallCooldown = true;
      lastFallMs   = now;
    }

    // Reset fall cooldown after 10s
    if (fallCooldown && (now - lastFallMs > FALL_COOLDOWN_MS)) {
      fallCooldown = false;
      fallDetected = false;
    }

    // ── Handle SOS button ─────────────────────────────────────────────────
    if (sosPressed) {
      Serial.println("[ALERT] SOS button pressed!");
      vibratePattern(5, 200, 100);     // 5 short pulses
      sendSMS("SOS button pressed by bracelet wearer");
    }

    publishPayload();
  }
}
