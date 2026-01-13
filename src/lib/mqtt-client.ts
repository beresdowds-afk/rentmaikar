import mqtt, { MqttClient, IClientOptions } from 'mqtt';

export interface VehicleLocation {
  vehicleId: string;
  latitude: number;
  longitude: number;
  speed: number;
  heading: number;
  ignitionStatus: boolean;
  batteryLevel: number;
  timestamp: Date;
  isParked: boolean;
}

export interface MQTTConfig {
  brokerUrl: string;
  options?: IClientOptions;
}

type LocationCallback = (location: VehicleLocation) => void;
type StatusCallback = (vehicleId: string, status: 'online' | 'offline') => void;

class MQTTVehicleTracker {
  private client: MqttClient | null = null;
  private locationCallbacks: Map<string, Set<LocationCallback>> = new Map();
  private statusCallbacks: Set<StatusCallback> = new Set();
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;

  // Default broker configuration (would be replaced with actual broker in production)
  private defaultConfig: MQTTConfig = {
    brokerUrl: 'wss://broker.hivemq.com:8884/mqtt',
    options: {
      clientId: `rentmaikar_${Math.random().toString(16).slice(2, 10)}`,
      clean: true,
      connectTimeout: 30000,
      reconnectPeriod: 5000,
    }
  };

  connect(config?: Partial<MQTTConfig>): Promise<void> {
    return new Promise((resolve, reject) => {
      const finalConfig = {
        ...this.defaultConfig,
        ...config,
        options: { ...this.defaultConfig.options, ...config?.options }
      };

      try {
        this.client = mqtt.connect(finalConfig.brokerUrl, finalConfig.options);

        this.client.on('connect', () => {
          console.log('[MQTT] Connected to broker');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          
          // Subscribe to all vehicle topics
          this.client?.subscribe('rentmaikar/vehicles/+/location', (err) => {
            if (err) console.error('[MQTT] Subscription error:', err);
            else console.log('[MQTT] Subscribed to vehicle locations');
          });

          this.client?.subscribe('rentmaikar/vehicles/+/status', (err) => {
            if (err) console.error('[MQTT] Subscription error:', err);
            else console.log('[MQTT] Subscribed to vehicle status');
          });

          resolve();
        });

        this.client.on('message', (topic, message) => {
          this.handleMessage(topic, message.toString());
        });

        this.client.on('error', (error) => {
          console.error('[MQTT] Connection error:', error);
          reject(error);
        });

        this.client.on('close', () => {
          console.log('[MQTT] Connection closed');
          this.isConnected = false;
        });

        this.client.on('reconnect', () => {
          this.reconnectAttempts++;
          console.log(`[MQTT] Reconnecting... Attempt ${this.reconnectAttempts}`);
          
          if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('[MQTT] Max reconnect attempts reached');
            this.client?.end();
          }
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  disconnect(): void {
    if (this.client) {
      this.client.end();
      this.client = null;
      this.isConnected = false;
      console.log('[MQTT] Disconnected');
    }
  }

  private handleMessage(topic: string, message: string): void {
    try {
      const parts = topic.split('/');
      const vehicleId = parts[2];
      const messageType = parts[3];

      if (messageType === 'location') {
        const data = JSON.parse(message);
        const location: VehicleLocation = {
          vehicleId,
          latitude: data.lat || data.latitude,
          longitude: data.lng || data.longitude,
          speed: data.speed || 0,
          heading: data.heading || 0,
          ignitionStatus: data.ignition ?? true,
          batteryLevel: data.battery || 100,
          timestamp: new Date(data.timestamp || Date.now()),
          isParked: (data.speed || 0) < 2,
        };

        // Notify all location callbacks for this vehicle
        const callbacks = this.locationCallbacks.get(vehicleId);
        if (callbacks) {
          callbacks.forEach(cb => cb(location));
        }

        // Also notify "all" subscribers
        const allCallbacks = this.locationCallbacks.get('*');
        if (allCallbacks) {
          allCallbacks.forEach(cb => cb(location));
        }
      }

      if (messageType === 'status') {
        const data = JSON.parse(message);
        this.statusCallbacks.forEach(cb => cb(vehicleId, data.status));
      }
    } catch (error) {
      console.error('[MQTT] Error parsing message:', error);
    }
  }

  subscribeToVehicle(vehicleId: string, callback: LocationCallback): () => void {
    if (!this.locationCallbacks.has(vehicleId)) {
      this.locationCallbacks.set(vehicleId, new Set());
    }
    this.locationCallbacks.get(vehicleId)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.locationCallbacks.get(vehicleId)?.delete(callback);
    };
  }

  subscribeToAllVehicles(callback: LocationCallback): () => void {
    return this.subscribeToVehicle('*', callback);
  }

  onStatusChange(callback: StatusCallback): () => void {
    this.statusCallbacks.add(callback);
    return () => {
      this.statusCallbacks.delete(callback);
    };
  }

  // Send command to vehicle (e.g., disable engine)
  sendCommand(vehicleId: string, command: 'disable' | 'enable' | 'lock' | 'unlock'): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.client || !this.isConnected) {
        reject(new Error('Not connected to MQTT broker'));
        return;
      }

      const topic = `rentmaikar/vehicles/${vehicleId}/command`;
      const payload = JSON.stringify({
        command,
        timestamp: new Date().toISOString(),
        requestId: Math.random().toString(36).slice(2, 11),
      });

      this.client.publish(topic, payload, { qos: 1 }, (error) => {
        if (error) {
          console.error('[MQTT] Command send error:', error);
          reject(error);
        } else {
          console.log(`[MQTT] Command sent: ${command} to vehicle ${vehicleId}`);
          resolve();
        }
      });
    });
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }
}

// Singleton instance
export const mqttTracker = new MQTTVehicleTracker();
