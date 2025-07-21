import mqtt, { MqttClient, IClientOptions } from 'mqtt';

type MessageCallback = (topic: string, message: string) => void;

class MqttService {
  private client: MqttClient | null = null;
  private isConnected: boolean = false;
  private subscribers: MessageCallback[] = [];

  connect(brokerUrl: string, options: IClientOptions = {}): void {
    if (!this.client) {
      this.client = mqtt.connect(brokerUrl, options);

      this.client.on('connect', () => {
        console.log('✅ MQTT connected');
        this.isConnected = true;
      });

      this.client.on('message', (topic: string, message: Buffer) => {
        const msgStr = message.toString();
        this.subscribers.forEach((callback) => callback(topic, msgStr));
      });

      this.client.on('error', (err: Error) => {
        console.error('❌ MQTT Error:', err);
        this.client?.end();
        this.client = null;
      });

      this.client.on('close', () => {
        console.log('🔌 MQTT disconnected');
        this.isConnected = false;
        this.client = null;
      });
    }
  }

  getClient(): MqttClient | null {
    return this.client;
  }

  publish(topic: string, message: string, options: mqtt.IClientPublishOptions = {}): void {
    if (this.client && this.isConnected) {
      this.client.publish(topic, message, options);
    } else {
      console.warn('MQTT not connected. Cannot publish.');
    }
  }

  subscribeTopic(topic: string): void {
    if (this.client && this.isConnected) {
      this.client.subscribe(topic, (err) => {
        if (err) console.error('Subscribe error:', err);
      });
    }
  }

  unsubscribeTopic(topic: string): void {
    if (this.client && this.isConnected) {
      this.client.unsubscribe(topic);
    }
  }

  addMessageListener(callback: MessageCallback): void {
    this.subscribers.push(callback);
  }

  removeMessageListener(callback: MessageCallback): void {
    this.subscribers = this.subscribers.filter(cb => cb !== callback);
  }

  disconnect(): void {
    if (this.client) {
      this.client.end();
      this.client = null;
      this.isConnected = false;
    }
  }
}

export const mqttService = new MqttService();
