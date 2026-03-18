/**
 * simulatorService.ts
 * 
 * Simulates BLE data from the ESP32 bracelet.
 * Replace generateFakePayload() + the interval in SensorContext with
 * real react-native-ble-plx notifications when hardware is available.
 * 
 * ── ESP32 BLE Protocol ──────────────────────────────────────────────────────
 * The ESP32 sends a UTF-8 string every ~1 second over BLE NOTIFY:
 * 
 *   HR:78;TEMP:36.8;FALL:0;MOVE:1;SOS:0;LAT:34.033;LON:-5.000;SMS:0
 *
 * Fields:
 *   HR    — Heart rate in BPM (integer)
 *   TEMP  — Body temperature in °C (float, 1 decimal)
 *   FALL  — Fall detected by accelerometer: 0 or 1
 *   MOVE  — Movement detected: 0 or 1
 *   SOS   — Emergency button pressed: 0 or 1
 *   LAT   — GPS latitude (float, 6 decimals)
 *   LON   — GPS longitude (float, 6 decimals)
 *   SMS   — SIM800L already sent emergency SMS: 0 or 1
 *           (set to 1 by ESP32 after successful AT+CMGS command)
 *
 * ── SIM800L SMS flow (handled entirely on ESP32, NOT in the app) ────────────
 * When FALL=1 or SOS=1 or anomaly threshold crossed, the ESP32:
 *   1. Connects SIM800L to GSM network (AT+CREG?)
 *   2. Sends SMS via AT+CMGS to the pre-programmed contact number
 *   3. Sets SMS=1 in the next BLE payload so the app can show confirmation
 *   4. Resets SMS=0 once acknowledged (app sends ACK back via BLE write)
 */

export type SensorData = {
  hr:        number;
  temp:      number;
  fall:      boolean;
  move:      boolean;
  sos:       boolean;
  lat:       number;
  lon:       number;
  smsSent:   boolean;   // SIM800L already sent SMS from the bracelet
  timestamp: number;
};

const BASE_HR   = 72;
const BASE_TEMP = 36.8;
let tick = 0;

/**
 * Parse the ESP32 BLE payload string into a SensorData object.
 * Tolerates missing fields gracefully.
 */
export function parsePayload(raw: string): SensorData | null {
  try {
    const map: Record<string, string> = {};
    raw.split(';').forEach((part) => {
      const [k, v] = part.split(':');
      if (k && v !== undefined) map[k.trim().toUpperCase()] = v.trim();
    });
    return {
      hr:       parseFloat(map['HR'])   || 0,
      temp:     parseFloat(map['TEMP']) || 0,
      fall:     map['FALL'] === '1',
      move:     map['MOVE'] === '1',
      sos:      map['SOS']  === '1',
      lat:      parseFloat(map['LAT'])  || 0,
      lon:      parseFloat(map['LON'])  || 0,
      smsSent:  map['SMS']  === '1',    // bracelet already fired SIM800L
      timestamp: Date.now(),
    };
  } catch {
    return null;
  }
}

/** Simulate a realistic ESP32 payload including occasional SMS confirmations */
export function generateFakePayload(): string {
  tick++;
  const hr   = Math.round(BASE_HR   + Math.sin(tick * 0.3) * 8  + (Math.random() - 0.5) * 4);
  const temp = +(BASE_TEMP + Math.sin(tick * 0.1) * 0.3 + (Math.random() - 0.5) * 0.1).toFixed(1);
  const move = Math.random() > 0.4 ? 1 : 0;
  const fall = Math.random() > 0.97 ? 1 : 0;
  const sos  = Math.random() > 0.995 ? 1 : 0;
  const lat  = +(34.033 + (Math.random() - 0.5) * 0.001).toFixed(6);
  const lon  = +(-5.0   + (Math.random() - 0.5) * 0.001).toFixed(6);
  // SMS=1 whenever fall or SOS occurred (ESP32 sends it immediately after AT+CMGS)
  const sms  = (fall || sos) ? 1 : 0;
  return `HR:${hr};TEMP:${temp};FALL:${fall};MOVE:${move};SOS:${sos};LAT:${lat};LON:${lon};SMS:${sms}`;
}