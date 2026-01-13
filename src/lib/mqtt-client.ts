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

export interface SafetyCheckResult {
  canProceed: boolean;
  reason: string;
  requiresConfirmation: boolean;
  vehicleStatus?: {
    isParked: boolean;
    isWithinSafeHours: boolean;
    speed: number;
  };
}

type LocationCallback = (location: VehicleLocation) => void;
type StatusCallback = (vehicleId: string, status: 'online' | 'offline') => void;

// Safety Rules Helper Functions
const isWithinSafeDeactivationHours = (): boolean => {
  const now = new Date();
  const hour = now.getHours();
  // Safe hours: 1 AM to 5 AM (1:00 - 4:59)
  return hour >= 1 && hour < 5;
};

const PARKED_SPEED_THRESHOLD = 2; // mph - vehicle considered parked if speed < 2

class MQTTVehicleTracker {
  private client: MqttClient | null = null;
  private locationCallbacks: Map<string, Set<LocationCallback>> = new Map();
  private statusCallbacks: Set<StatusCallback> = new Set();
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  
  // Store latest vehicle locations for safety checks
  private vehicleLocations: Map<string, VehicleLocation> = new Map();

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
          isParked: (data.speed || 0) < PARKED_SPEED_THRESHOLD,
        };

        // Store latest location for safety checks
        this.vehicleLocations.set(vehicleId, location);

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

  // Get vehicle's latest known location
  getVehicleLocation(vehicleId: string): VehicleLocation | undefined {
    return this.vehicleLocations.get(vehicleId);
  }

  // Update local vehicle state (for mock/demo purposes)
  updateVehicleLocation(vehicleId: string, location: VehicleLocation): void {
    this.vehicleLocations.set(vehicleId, location);
  }

  /**
   * SAFETY CHECK: Validate if vehicle can be disabled
   * Rules enforced:
   * 1. Vehicle MUST be parked (speed < 2 mph)
   * 2. Automatic deactivation only between 1AM-5AM
   * 3. Outside safe hours, admin confirmation is required
   */
  performSafetyCheck(vehicleId: string, isAfterThirdNotification: boolean = false): SafetyCheckResult {
    const location = this.vehicleLocations.get(vehicleId);
    const isWithinSafeHours = isWithinSafeDeactivationHours();
    
    // If no location data, we cannot verify safety
    if (!location) {
      return {
        canProceed: false,
        reason: 'Cannot verify vehicle status. No location data available.',
        requiresConfirmation: false,
        vehicleStatus: undefined,
      };
    }

    const isParked = location.isParked || location.speed < PARKED_SPEED_THRESHOLD;

    // RULE 1: Vehicle MUST be parked
    if (!isParked) {
      return {
        canProceed: false,
        reason: `Vehicle is currently moving at ${Math.round(location.speed)} mph. Deactivation is only allowed when the vehicle is parked for safety.`,
        requiresConfirmation: false,
        vehicleStatus: {
          isParked,
          isWithinSafeHours,
          speed: location.speed,
        },
      };
    }

    // RULE 2: After 3rd payment default notification, can deactivate any time (if parked)
    if (isAfterThirdNotification) {
      return {
        canProceed: true,
        reason: 'Vehicle is parked and 3rd payment notification has been sent. Deactivation authorized.',
        requiresConfirmation: false,
        vehicleStatus: {
          isParked,
          isWithinSafeHours,
          speed: location.speed,
        },
      };
    }

    // RULE 3: Within safe hours (1AM-5AM), can proceed automatically
    if (isWithinSafeHours) {
      return {
        canProceed: true,
        reason: 'Vehicle is parked and within safe deactivation hours (1AM-5AM). Deactivation authorized.',
        requiresConfirmation: false,
        vehicleStatus: {
          isParked,
          isWithinSafeHours,
          speed: location.speed,
        },
      };
    }

    // RULE 4: Outside safe hours, require admin confirmation
    return {
      canProceed: true,
      reason: `Vehicle is parked but outside safe hours (current time: ${new Date().toLocaleTimeString()}). Admin confirmation required to proceed.`,
      requiresConfirmation: true,
      vehicleStatus: {
        isParked,
        isWithinSafeHours,
        speed: location.speed,
      },
    };
  }

  /**
   * Send command to vehicle with safety checks
   * @param vehicleId - The vehicle ID
   * @param command - The command to send
   * @param options - Additional options including override flags
   */
  async sendCommand(
    vehicleId: string, 
    command: 'disable' | 'enable' | 'lock' | 'unlock',
    options: { 
      adminConfirmed?: boolean; 
      isAfterThirdNotification?: boolean;
      bypassSafetyCheck?: boolean;
    } = {}
  ): Promise<{ success: boolean; message: string; safetyCheck?: SafetyCheckResult }> {
    
    // Enable command doesn't require safety checks
    if (command === 'enable' || command === 'unlock') {
      return this.executeCommand(vehicleId, command);
    }

    // For disable/lock commands, perform safety checks unless bypassed
    if (!options.bypassSafetyCheck) {
      const safetyCheck = this.performSafetyCheck(vehicleId, options.isAfterThirdNotification);

      // Cannot proceed at all
      if (!safetyCheck.canProceed) {
        console.warn(`[MQTT] Safety check failed for ${vehicleId}: ${safetyCheck.reason}`);
        return {
          success: false,
          message: safetyCheck.reason,
          safetyCheck,
        };
      }

      // Requires confirmation but not confirmed
      if (safetyCheck.requiresConfirmation && !options.adminConfirmed) {
        console.warn(`[MQTT] Admin confirmation required for ${vehicleId}: ${safetyCheck.reason}`);
        return {
          success: false,
          message: safetyCheck.reason,
          safetyCheck,
        };
      }
    }

    // All checks passed, execute command
    return this.executeCommand(vehicleId, command);
  }

  private async executeCommand(
    vehicleId: string, 
    command: 'disable' | 'enable' | 'lock' | 'unlock'
  ): Promise<{ success: boolean; message: string }> {
    return new Promise((resolve) => {
      if (!this.client || !this.isConnected) {
        // For demo/offline mode, still allow command
        console.log(`[MQTT] Offline mode: ${command} command for vehicle ${vehicleId}`);
        resolve({
          success: true,
          message: `${command.charAt(0).toUpperCase() + command.slice(1)} command queued (offline mode)`,
        });
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
          resolve({
            success: false,
            message: `Failed to send ${command} command: ${error.message}`,
          });
        } else {
          console.log(`[MQTT] Command sent: ${command} to vehicle ${vehicleId}`);
          resolve({
            success: true,
            message: `${command.charAt(0).toUpperCase() + command.slice(1)} command sent successfully`,
          });
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
