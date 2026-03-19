/**
 * mqttService.ts
 *
 * ESP32 publishes via TCP port 1883 to Mosquitto.
 * Phone app connects via WebSocket port 9001 (mqtt.js over ws://).
 *
 * Mosquitto config (macOS via brew):
 *   /opt/homebrew/etc/mosquitto/mosquitto.conf — add:
 *     listener 1883
 *     listener 9001
 *     protocol websockets
 *     allow_anonymous true
 *   Then: brew services restart mosquitto
 */

import mqtt, { MqttClient } from 'mqtt';

export type MqttStatus = 'disconnected' | 'connecting' | 'connected' | 'error' | 'reconnecting';

export const TOPICS = {
  sensors: 'bracelet/sensors',
  status:  'bracelet/status',
};

type MessageCallback = (topic: string, payload: string) => void;
type StatusCallback  = (status: MqttStatus) => void;

class MqttService {
  private client:    MqttClient | null = null;
  private onMsg:     MessageCallback | null = null;
  private onStatus:  StatusCallback  | null = null;

  connect(host: string, port: number, onMsg: MessageCallback, onStatus: StatusCallback) {
    this.onMsg    = onMsg;
    this.onStatus = onStatus;

    // Tear down any existing connection before reconnecting
    if (this.client) {
      this.client.end(true);
      this.client = null;
    }

    const url      = `ws://${host}:${port}/mqtt`;
    const clientId = `vital-app-${Math.random().toString(16).slice(2, 8)}`;

    onStatus('connecting');

    this.client = mqtt.connect(url, {
      clientId,
      keepalive:       30,
      reconnectPeriod: 4000,
      connectTimeout:  10_000,
      clean:           true,
    });

    this.client.on('connect', () => {
      onStatus('connected');
      this.client?.subscribe([TOPICS.sensors, TOPICS.status], { qos: 1 });
    });

    this.client.on('message', (topic, buf) => {
      this.onMsg?.(topic, buf.toString('utf-8'));
    });

    this.client.on('reconnect',  () => onStatus('reconnecting'));
    this.client.on('offline',    () => onStatus('disconnected'));
    this.client.on('error',      () => onStatus('error'));
    this.client.on('disconnect', () => onStatus('disconnected'));
  }

  disconnect() {
    this.client?.end(true);
    this.client = null;
  }

  get isConnected() { return this.client?.connected ?? false; }
}

export const mqttService = new MqttService();