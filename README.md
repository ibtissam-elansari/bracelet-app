# VITAL MONITOR
### IoT Health Bracelet — Mobile Application
**ESP32 + SIM800L + MQTT + React Native (Expo)**

---

## Table of Contents

1. [What the App Does](#1-what-the-app-does)
2. [System Architecture](#2-system-architecture)
3. [App Screens](#3-app-screens)
4. [Alert System](#4-alert-system)
5. [Requirements](#5-requirements)
6. [Setup — macOS (M1/M2/M3 and Intel)](#6-setup--macos-m1m2m3-and-intel)
7. [Setup — Windows 10/11](#7-setup--windows-1011)
8. [Setup — Linux (Ubuntu/Debian)](#8-setup--linux-ubuntudebian)
9. [After Cloning — Run the App (All Platforms)](#9-after-cloning--run-the-app-all-platforms)
10. [Testing Without Hardware](#10-testing-without-hardware)
11. [Connecting Real Hardware](#11-connecting-real-hardware)
12. [Project File Structure](#12-project-file-structure)
13. [MQTT Payload Format](#13-mqtt-payload-format)
14. [Troubleshooting](#14-troubleshooting)
15. [Quick Commands Reference](#15-quick-commands-reference)

---

## 1. What the App Does

Vital Monitor is a real-time health monitoring mobile application built for an IoT university project. It connects to a custom wearable bracelet built on an ESP32 microcontroller and displays live sensor data on a smartphone.

### Features

| Feature | Description |
|---|---|
| Live heart rate | Animated SVG ring gauge showing BPM in real time |
| Body temperature | Live °C reading with Normal / Elevated / Fever status |
| Movement detection | Active or stationary, updated every second |
| Fall detection | Instant modal alert when bracelet detects a fall |
| SOS button | Manual emergency trigger worn on the wrist |
| GPS tracking | Live dark map with patient location and movement trail |
| Emergency SMS | Bracelet sends SMS automatically via SIM800L GSM module |
| Alert history | Full log of all events with timestamps |
| Simulator mode | App generates realistic fake data when no hardware is connected |

### Data flow

```
Bracelet sensors  →  ESP32  →  WiFi TCP:1883  →  Mosquitto Broker
                                                        |
                                                  WebSocket :9001
                                                        |
                                               React Native App
```

When fall or SOS is triggered, the SIM800L on the bracelet sends an SMS with GPS coordinates directly to the emergency contact — independently of WiFi and the app.

---

## 2. System Architecture

### Bracelet hardware

| Component | Model | Purpose |
|---|---|---|
| Microcontroller | ESP32 Dev Module | WiFi + main processor |
| Heart rate | MAX30102 | Infrared pulse oximeter |
| Temperature | DS18B20 | Digital thermometer |
| Accelerometer | MPU-6050 | Movement and fall detection |
| GPS | NEO-6M | Location coordinates |
| GSM / SMS | SIM800L | Emergency SMS via cellular |
| SOS button | Momentary switch | Manual emergency trigger |
| Vibration motor | ERM 3V | Haptic wrist alert |

### Software stack

| Layer | Technology |
|---|---|
| Mobile framework | React Native + Expo SDK 51 |
| Navigation | Expo Router (file-based) |
| Language | TypeScript |
| State | React Context API |
| MQTT client | mqtt.js v5 over WebSocket |
| Map | Leaflet.js inside react-native-webview |
| Charts | react-native-chart-kit |
| Icons | @expo/vector-icons MaterialCommunityIcons |
| Persistence | @react-native-async-storage/async-storage |
| Broker | Mosquitto (runs on your computer) |

---

## 3. App Screens

### Dashboard
- Animated heart rate ring — arc fills from 40 to 140 BPM, pulses red on danger
- Temperature mini-card — Normal / Elevated / Fever colour coding
- Movement mini-card — Active or Rest
- Status strip — green / amber / red heart rate summary
- Fall Detection + SOS cards — flash red and vibrate phone on event
- GPS coordinates bar with LIVE indicator
- Header badge: MQTT LIVE (green) / CONNECTING (amber) / SIMULATOR (red)

### Map
- Dark Leaflet map, no Google Maps API key required
- Cyan pulsing GPS marker on patient's live location
- Dashed trail of the last 30 GPS positions
- Red pin dropped at exact fall/SOS coordinates
- Live lat/lon coordinate overlay (top-right)
- Recenter button (bottom-right), auto-follow pauses for 8s while you pan

### History — Charts tab
- Switch between Heart Rate and Temperature line charts
- Last 24 readings, bezier smoothed
- AVG / MAX / MIN stat cards
- Raw readings log with all fields

### History — Events tab
- Every alert logged: fall, SOS, high HR, low HR, fever
- Type, description, timestamp, SMS-sent badge per entry
- Unread count badge on tab icon, clears on open

### Settings
- Emergency contact (name + phone number), persisted to device storage
- MQTT broker (IP + port), reconnects immediately on save
- Live connection status with Reconnect button
- Session stats
- Sensor hardware reference

---

## 4. Alert System

| Event | Trigger | SMS by bracelet | Cooldown |
|---|---|---|---|
| FALL DETECTED | Accelerometer detects fall | Yes, immediately | None |
| SOS ACTIVATED | SOS button pressed | Yes, immediately | None |
| HIGH HEART RATE | HR > 110 BPM | No (app only) | 30 s |
| LOW HEART RATE | HR < 50 BPM | No (app only) | 30 s |
| HIGH TEMPERATURE | Temp > 38.5 °C | No (app only) | 60 s |

SMS sent by the bracelet's SIM800L (example):
```
EMERGENCY: Fall detected by bracelet accelerometer
Location: https://maps.google.com/?q=34.033300,-5.000000
Contact bracelet wearer immediately.
```

---

## 5. Requirements

### All platforms
- A smartphone with **Expo Go** installed
  - iOS: https://apps.apple.com/app/expo-go/id982107779
  - Android: https://play.google.com/store/apps/details?id=host.exp.exponent
- Phone and computer on the **same WiFi network**
- Internet access on the phone (for loading Leaflet map tiles)

### Software to install (covered per OS below)
- Node.js v18 or later
- npm v9 or later (comes with Node)
- Mosquitto MQTT broker
- Git (to clone the repo)

---

## 6. Setup — macOS (M1/M2/M3 and Intel)

### Step 1 — Install Homebrew
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```
Follow the printed instructions to add Homebrew to your PATH. Then verify:
```bash
brew --version
```

### Step 2 — Install Node.js and Git
```bash
brew install node git
node --version   # must be v18 or higher
```

### Step 3 — Install Mosquitto
```bash
brew install mosquitto
```

### Step 4 — Configure Mosquitto
```bash
nano /opt/homebrew/etc/mosquitto/mosquitto.conf
```
Add these lines at the end of the file:
```
listener 1883
protocol mqtt

listener 9001
protocol websockets

allow_anonymous true

persistence true
persistence_location /opt/homebrew/var/lib/mosquitto/
```
Save: `Ctrl+O` → `Enter` → `Ctrl+X`

### Step 5 — Start Mosquitto
```bash
brew services start mosquitto
brew services list | grep mosquitto
# Must show: mosquitto   started
```

### Step 6 — Find your local IP address
```bash
ipconfig getifaddr en0
# Example output: 192.168.1.42
```
If en0 returns nothing, try `en1`. Write this IP down — you need it in Step 9.

---

## 7. Setup — Windows 10/11

### Step 1 — Install Node.js
1. Go to https://nodejs.org
2. Download the **LTS** version (v18 or v20)
3. Run the installer — keep all default options checked
4. Open a new **Command Prompt** or **PowerShell** and verify:
```cmd
node --version
npm --version
```

### Step 2 — Install Git
1. Go to https://git-scm.com/download/win
2. Download and run the installer — keep all defaults
3. Verify in Command Prompt:
```cmd
git --version
```

### Step 3 — Install Mosquitto
1. Go to https://mosquitto.org/download
2. Download the **Windows** installer (64-bit)
3. Run the installer — install to `C:\Program Files\mosquitto`
4. Open **Command Prompt as Administrator** and verify:
```cmd
"C:\Program Files\mosquitto\mosquitto" --version
```

### Step 4 — Configure Mosquitto
Open Notepad as Administrator, then open this file:
```
C:\Program Files\mosquitto\mosquitto.conf
```
Add these lines at the end:
```
listener 1883
protocol mqtt

listener 9001
protocol websockets

allow_anonymous true
```
Save the file.

### Step 5 — Start Mosquitto as a Windows Service
In **Command Prompt as Administrator**:
```cmd
net start mosquitto
```
To verify it is running:
```cmd
sc query mosquitto
# Must show: STATE: 4  RUNNING
```

To stop it later:
```cmd
net stop mosquitto
```

### Step 6 — Find your local IP address
In **Command Prompt**:
```cmd
ipconfig
```
Look for the line that says **IPv4 Address** under your WiFi adapter:
```
Wireless LAN adapter Wi-Fi:
   IPv4 Address. . . . . . . . . . . : 192.168.1.42
```
Write this IP down.

### Step 7 — Allow Mosquitto through Windows Firewall
In **Command Prompt as Administrator**:
```cmd
netsh advfirewall firewall add rule name="Mosquitto MQTT" protocol=TCP dir=in localport=1883 action=allow
netsh advfirewall firewall add rule name="Mosquitto WS" protocol=TCP dir=in localport=9001 action=allow
```
Without this step, your phone cannot reach the broker even on the same WiFi.

---

## 8. Setup — Linux (Ubuntu/Debian)

### Step 1 — Update package list
```bash
sudo apt update && sudo apt upgrade -y
```

### Step 2 — Install Node.js v18
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
node --version   # must be v18 or higher
```

### Step 3 — Install Git
```bash
sudo apt install -y git
git --version
```

### Step 4 — Install Mosquitto
```bash
sudo apt install -y mosquitto mosquitto-clients
```

### Step 5 — Configure Mosquitto
```bash
sudo nano /etc/mosquitto/conf.d/bracelet.conf
```
Add these lines:
```
listener 1883
protocol mqtt

listener 9001
protocol websockets

allow_anonymous true
```
Save: `Ctrl+O` → `Enter` → `Ctrl+X`

### Step 6 — Start and enable Mosquitto
```bash
sudo systemctl restart mosquitto
sudo systemctl enable mosquitto
sudo systemctl status mosquitto
# Must show: Active: active (running)
```

### Step 7 — Allow ports through firewall
```bash
sudo ufw allow 1883/tcp
sudo ufw allow 9001/tcp
sudo ufw reload
```

### Step 8 — Find your local IP address
```bash
ip addr show | grep "inet " | grep -v 127.0.0.1
# Look for something like: inet 192.168.1.42/24
```
Or more directly:
```bash
hostname -I | awk '{print $1}'
```

---

## 9. After Cloning — Run the App (All Platforms)

These steps are the same on macOS, Windows, and Linux. Run them after completing your OS-specific setup above.

---

### Step 1 — Clone the repository

**macOS / Linux:**
```bash
git clone https://github.com/your-username/bracelet-health-app.git
cd bracelet-health-app
```

**Windows (Command Prompt or PowerShell):**
```cmd
git clone https://github.com/your-username/bracelet-health-app.git
cd bracelet-health-app
```

---

### Step 2 — Install all JavaScript dependencies

```bash
npm install
```

This installs everything in `package.json`. It will take 1–2 minutes on first run. You should see output ending in something like:
```
added 1491 packages in 45s
```

If you see any errors, run:
```bash
npm install --legacy-peer-deps
```

---

### Step 3 — Set your broker IP address

Open the file `services/mqttService.ts` in any text editor and find this line near the top:
```typescript
const DEFAULT_BROKER: BrokerConfig = { host: '192.168.1.10', port: 9001 };
```
Replace `192.168.1.10` with your computer's local IP address that you found in the setup section for your OS.

**macOS example:**
```typescript
const DEFAULT_BROKER: BrokerConfig = { host: '192.168.1.42', port: 9001 };
```

You can also skip this step and enter the IP directly in the app's Settings screen after it launches.

---

### Step 4 — Start the development server

```bash
npx expo start --clear
```

The `--clear` flag clears the Metro bundler cache. Always use it after making changes to `metro.config.js` or after pulling updates.

You will see output like this:
```
Starting project at /path/to/bracelet-health-app
Starting Metro Bundler

█████████████████████████████████████████
█████████████████████████████████████████
████ ▄▄▄▄▄ █▀ ▀▀▀▀ ██▀▀▀▀▀▀▀█ ▄▄▄▄▄ ████
...

› Metro waiting on exp://192.168.1.42:8081
› Scan the QR code above with Expo Go (Android) or the Camera app (iOS)
```

---

### Step 5 — Open the app on your phone

**iPhone:**
1. Open the built-in **Camera** app
2. Point it at the QR code in the Terminal
3. Tap the **"Open in Expo Go"** notification banner at the top of the screen
4. The app will bundle and open (takes ~15 seconds on first load)

**Android:**
1. Open the **Expo Go** app
2. Tap **"Scan QR code"**
3. Point camera at the QR code in Terminal
4. The app will bundle and open

---

### Step 6 — Verify everything is working

When the app opens you should see:

1. **Dashboard screen** with a heart rate gauge animating
2. A **red SIMULATOR badge** in the top-right corner of the header — this is completely normal. It means the app is using fake data while it tries to connect to your Mosquitto broker.
3. Sensor values updating every second
4. No error messages

The app is already functional in simulator mode. All screens work, charts fill up, alerts fire occasionally, and the map shows a moving GPS marker.

---

### Step 7 — Connect to your Mosquitto broker

To switch from Simulator to real MQTT:

1. Make sure Mosquitto is running (see your OS setup section)
2. Open the **Settings tab** in the app (cog icon, bottom right)
3. Scroll to the **MQTT Broker** section
4. Enter your computer's local IP and port `9001`
5. Tap **SAVE & CONNECT**
6. The badge in the header will turn green and show **MQTT LIVE**

To confirm data is flowing, open a Terminal on your computer and run:

**macOS / Linux:**
```bash
mosquitto_sub -h localhost -t "bracelet/#" -v
```
**Windows:**
```cmd
"C:\Program Files\mosquitto\mosquitto_sub" -h localhost -t "bracelet/#" -v
```

Then in a second terminal window send a test message (see Section 10 below). You will see it appear in the first window and the app will update instantly.

---

### Step 8 — (Optional) Keep Expo running in the background

If you close your Terminal, the development server stops and the app disconnects. To keep it running in the background:

**macOS / Linux:**
```bash
npx expo start --clear &
```

Or use a tool like `tmux` or `screen` to keep the session alive.

**Windows:**
You can minimise the Command Prompt window — the server keeps running as long as the window is open.

---

## 10. Testing Without Hardware

You can test every feature from your computer's Terminal without any bracelet.

Open a terminal and run a test command. The moment a message is published to the broker, the app switches from SIMULATOR to MQTT LIVE.

### macOS / Linux commands

Normal reading:
```bash
mosquitto_pub -h localhost -t bracelet/sensors \
  -m "HR:75;TEMP:36.9;FALL:0;MOVE:1;SOS:0;LAT:34.033300;LON:-5.000000;SMS:0"
```

Fall alert (SMS=1 means bracelet confirmed SMS sent):
```bash
mosquitto_pub -h localhost -t bracelet/sensors \
  -m "HR:92;TEMP:37.1;FALL:1;MOVE:0;SOS:0;LAT:34.033300;LON:-5.000000;SMS:1"
```

SOS pressed:
```bash
mosquitto_pub -h localhost -t bracelet/sensors \
  -m "HR:85;TEMP:36.8;FALL:0;MOVE:0;SOS:1;LAT:34.033300;LON:-5.000000;SMS:1"
```

High heart rate:
```bash
mosquitto_pub -h localhost -t bracelet/sensors \
  -m "HR:118;TEMP:36.8;FALL:0;MOVE:1;SOS:0;LAT:34.033300;LON:-5.000000;SMS:0"
```

Fever:
```bash
mosquitto_pub -h localhost -t bracelet/sensors \
  -m "HR:98;TEMP:39.2;FALL:0;MOVE:0;SOS:0;LAT:34.033300;LON:-5.000000;SMS:0"
```

### Windows commands

Use the full path to mosquitto_pub:
```cmd
"C:\Program Files\mosquitto\mosquitto_pub" -h localhost -t bracelet/sensors -m "HR:75;TEMP:36.9;FALL:0;MOVE:1;SOS:0;LAT:34.033300;LON:-5.000000;SMS:0"
```

```cmd
"C:\Program Files\mosquitto\mosquitto_pub" -h localhost -t bracelet/sensors -m "HR:92;TEMP:37.1;FALL:1;MOVE:0;SOS:0;LAT:34.033300;LON:-5.000000;SMS:1"
```

---

## 11. Connecting Real Hardware

### Flash the ESP32

1. Open `ESP32_firmware.ino` in Arduino IDE 2.x
2. Install libraries via **Tools → Manage Libraries**:
   - `PubSubClient` by Nick O'Leary
   - `MAX30105` by SparkFun Electronics
   - `DallasTemperature` by Miles Burton
   - `OneWire` by Miles Burton
   - `MPU6050` by Electronic Cats
   - `TinyGPS++` by Mikal Hart
3. Edit the credentials at the top of the firmware:
```cpp
const char* WIFI_SSID        = "YourWiFiName";
const char* WIFI_PASS        = "YourWiFiPassword";
const char* MQTT_HOST        = "192.168.1.42";   // your computer's local IP
const char* EMERGENCY_NUMBER = "+212XXXXXXXXX";  // phone number for SMS
```
4. Select board: **Tools → Board → ESP32 Dev Module**
5. Select port: **Tools → Port → /dev/cu.usbserial-xxx** (macOS/Linux) or **COM3** (Windows)
6. Click **Upload**
7. Open **Tools → Serial Monitor** at baud rate **115200**

You should see:
```
[WiFi] Connected — IP: 192.168.1.55
[MQTT] Connecting to 192.168.1.42 — connected
[MQTT] HR:72;TEMP:36.8;FALL:0;MOVE:1;SOS:0;LAT:34.033300;LON:-5.000000;SMS:0
```

The app header badge will switch to **MQTT LIVE** and all data is now from the real bracelet.

---

## 12. Project File Structure

```
bracelet-health-app/
|
|-- app/
|   |-- _layout.tsx               Root layout, SensorProvider wraps everything
|   |-- (tabs)/
|       |-- _layout.tsx           Tab bar with icons and unread badge
|       |-- index.tsx             Dashboard
|       |-- map.tsx               GPS map with trail
|       |-- history.tsx           Charts and event log
|       |-- profile.tsx           Settings
|
|-- components/
|   |-- HRGauge.tsx               Animated SVG heart rate ring
|   |-- SensorCard.tsx            Reusable sensor metric card
|   |-- AlertBox.tsx              Emergency alert modal
|
|-- constants/
|   |-- theme.ts                  All colours, radii, shadows
|
|-- context/
|   |-- SensorContext.tsx         Global state, MQTT, alerts, history
|
|-- services/
|   |-- mqttService.ts            MQTT WebSocket client (singleton)
|   |-- simulatorService.ts       Fake data generator and payload parser
|
|-- ESP32_firmware.ino            Arduino firmware for the bracelet
|-- mosquitto.conf                Mosquitto config (macOS path)
|-- metro.config.js               Metro bundler config for mqtt.js
|-- package.json                  JavaScript dependencies
|-- app.json                      Expo configuration
|-- tsconfig.json                 TypeScript configuration
|-- requirements.txt              Full software and hardware requirements
|-- README.md                     This file
```

---

## 13. MQTT Payload Format

Published to `bracelet/sensors` every 1 second:
```
HR:78;TEMP:36.8;FALL:0;MOVE:1;SOS:0;LAT:34.033300;LON:-5.000000;SMS:0
```

| Field | Type | Description |
|---|---|---|
| HR | integer | Heart rate in BPM |
| TEMP | float | Body temperature in °C (1 decimal) |
| FALL | 0 or 1 | 1 = fall detected |
| MOVE | 0 or 1 | 1 = movement detected |
| SOS | 0 or 1 | 1 = SOS button pressed |
| LAT | float | GPS latitude (6 decimals) |
| LON | float | GPS longitude (6 decimals) |
| SMS | 0 or 1 | 1 = SIM800L confirmed SMS was sent |

---

## 14. Troubleshooting

### App shows SIMULATOR and never switches to MQTT LIVE

Check Mosquitto is running:
- macOS: `brew services list | grep mosquitto`
- Windows: `sc query mosquitto`
- Linux: `sudo systemctl status mosquitto`

Check your phone and computer are on the same WiFi network.

Check the broker IP in the app Settings matches your computer's actual local IP.

Test the WebSocket port is reachable from your computer:
- macOS/Linux: `nc -zv 192.168.1.42 9001`
- Windows: `Test-NetConnection -ComputerName 192.168.1.42 -Port 9001`

On Windows, make sure you added the firewall rules from Step 7 of the Windows setup.

Check Mosquitto logs:
- macOS: `tail -f /opt/homebrew/var/log/mosquitto/mosquitto.log`
- Windows: `type "C:\Program Files\mosquitto\mosquitto.log"`
- Linux: `sudo tail -f /var/log/mosquitto/mosquitto.log`

### "Cannot find module 'events/'" on startup

Your `metro.config.js` has leftover polyfill code. Replace its entire content with exactly this:
```js
const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);
config.resolver.unstable_enablePackageExports = true;
module.exports = config;
```
Then run `npx expo start --clear`.

### Icons show as question marks on Android

All icons must use `MaterialCommunityIcons` from `@expo/vector-icons`. Never place emoji characters inside `<Text>` components — Android renders them as `?` boxes on many device configurations.

### Heart rate gauge is clipped or cut off

The `HRGauge` component's outer `Animated.View` must have explicit `width` and `height` set to the `size` prop value. Without them, React Native collapses the parent to zero height and the SVG overflows out of its container.

### Tab bar icons invisible or not tapping

The icon wrapper `View` must have a fixed `width` (54px) and no `height`, `flex`, or `paddingVertical` that collapses the hit area.

### Map tiles are blank or not loading

The Leaflet map loads tiles from `cartocdn.com` over the internet. Your phone needs internet access — local WiFi without internet will not load map tiles. Check your phone has mobile data enabled or the WiFi network has internet access.

### npm install fails with peer dependency errors

```bash
npm install --legacy-peer-deps
```

### Expo QR code appears but app won't load on phone

Make sure your phone is on the same WiFi as your computer. If using a corporate or university network, those networks often block device-to-device communication. Use a personal hotspot instead.

---

## 15. Quick Commands Reference

### macOS
```bash
brew services start mosquitto          # start broker
brew services stop mosquitto           # stop broker
brew services restart mosquitto        # restart after config change
ipconfig getifaddr en0                 # find your local IP
mosquitto_sub -h localhost -t "bracelet/#" -v   # watch all MQTT messages
npx expo start --clear                 # start the app
tail -f /opt/homebrew/var/log/mosquitto/mosquitto.log   # broker logs
```

### Windows (run Command Prompt as Administrator where needed)
```cmd
net start mosquitto                    # start broker
net stop mosquitto                     # stop broker
ipconfig                               # find your local IP (look for IPv4)
"C:\Program Files\mosquitto\mosquitto_sub" -h localhost -t "bracelet/#" -v
npx expo start --clear
type "C:\Program Files\mosquitto\mosquitto.log"
```

### Linux
```bash
sudo systemctl start mosquitto         # start broker
sudo systemctl stop mosquitto          # stop broker
sudo systemctl restart mosquitto       # restart after config change
hostname -I | awk '{print $1}'         # find your local IP
mosquitto_sub -h localhost -t "bracelet/#" -v   # watch all MQTT messages
npx expo start --clear                 # start the app
sudo tail -f /var/log/mosquitto/mosquitto.log   # broker logs
```