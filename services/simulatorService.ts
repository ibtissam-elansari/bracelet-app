/**
 * ESP32 MQTT Payload Format (published every 1s to bracelet/sensors):
 *   HR:78;TEMP:36.8;FALL:0;MOVE:1;SOS:0;LAT:34.033;LON:-5.000;SMS:0
 *
 * SMS=1 means the bracelet's SIM800L already sent the emergency SMS.
 */

export type SensorData = {
  hr:        number;
  temp:      number;
  fall:      boolean;
  move:      boolean;
  sos:       boolean;
  lat:       number;
  lon:       number;
  smsSent:   boolean;
  timestamp: number;
};

export function parsePayload(raw: string): SensorData | null {
  try {
    const map: Record<string, string> = {};
    raw.split(';').forEach(part => {
      const [k, v] = part.split(':');
      if (k && v !== undefined) map[k.trim().toUpperCase()] = v.trim();
    });
    const hr   = parseFloat(map['HR'])   || 0;
    const temp = parseFloat(map['TEMP']) || 0;
    const lat  = parseFloat(map['LAT'])  || 0;
    const lon  = parseFloat(map['LON'])  || 0;
    if (hr === 0 && temp === 0) return null;
    return {
      hr, temp,
      fall:     map['FALL'] === '1',
      move:     map['MOVE'] === '1',
      sos:      map['SOS']  === '1',
      lat, lon,
      smsSent:  map['SMS']  === '1',
      timestamp: Date.now(),
    };
  } catch { return null; }
}

// ─── Simulator ────────────────────────────────────────────────────────────────
const BASE_HR   = 72;
const BASE_TEMP = 36.8;
let tick = 0;

export function generateFakePayload(): string {
  tick++;
  const hr   = Math.round(BASE_HR   + Math.sin(tick * 0.25) * 9 + (Math.random() - 0.5) * 3);
  const temp = +(BASE_TEMP + Math.sin(tick * 0.08) * 0.4 + (Math.random() - 0.5) * 0.1).toFixed(1);
  const move = Math.random() > 0.4 ? 1 : 0;
  const fall = Math.random() > 0.97 ? 1 : 0;
  const sos  = Math.random() > 0.997 ? 1 : 0;
  // Simulate slight GPS drift
  const lat  = +(34.0333 + Math.sin(tick * 0.05) * 0.0008 + (Math.random() - 0.5) * 0.0002).toFixed(6);
  const lon  = +(-5.0000 + Math.cos(tick * 0.05) * 0.0008 + (Math.random() - 0.5) * 0.0002).toFixed(6);
  const sms  = (fall || sos) ? 1 : 0;
  return `HR:${hr};TEMP:${temp};FALL:${fall};MOVE:${move};SOS:${sos};LAT:${lat};LON:${lon};SMS:${sms}`;
}