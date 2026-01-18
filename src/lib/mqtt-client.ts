import mqtt, { MqttClient, IClientOptions } from 'mqtt';
import { supabase } from '@/integrations/supabase/client';

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

export interface AccelerometerData {
  vehicleId: string;
  x: number; // G-force
  y: number;
  z: number;
  totalG: number;
  timestamp: Date;
}

export interface AccidentEvent {
  vehicleId: string;
  driverId?: string;
  ownerId?: string;
  triggerType: 'sudden_deceleration' | 'impact' | 'rollover' | 'airbag';
  decelerationG: number;
  speedAtImpact: number;
  latitude: number;
  longitude: number;
  timestamp: Date;
}

// IoT Telemetry Snapshot for incident logging
export interface IoTTelemetrySnapshot {
  vehicleId: string;
  capturedAt: string;
  location: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  } | null;
  motion: {
    speed: number;
    heading: number;
    isParked: boolean;
  } | null;
  vehicle: {
    ignitionStatus: boolean;
    batteryLevel: number;
    fuelLevel?: number;
    engineTemp?: number;
    odometerReading?: number;
  } | null;
  diagnostics: {
    engineCode?: string[];
    checkEngineLightOn?: boolean;
    tirePressure?: { fl: number; fr: number; rl: number; rr: number };
    brakeWearLevel?: number;
    oilLevel?: number;
    coolantLevel?: number;
    transmissionTemp?: number;
  } | null;
  sensors: {
    lastAccelerometerReading?: { x: number; y: number; z: number; totalG: number };
    ambientTemp?: number;
    humidity?: number;
  } | null;
  connectivity: {
    signalStrength: number;
    lastPingMs: number;
    firmwareVersion?: string;
  } | null;
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
type AccidentCallback = (event: AccidentEvent) => void;

// Safety Rules Helper Functions
const isWithinSafeDeactivationHours = (): boolean => {
  const now = new Date();
  const hour = now.getHours();
  // Safe hours: 1 AM to 5 AM (1:00 - 4:59)
  return hour >= 1 && hour < 5;
};

const PARKED_SPEED_THRESHOLD = 2; // mph - vehicle considered parked if speed < 2

// Accident detection thresholds
const ACCIDENT_THRESHOLDS = {
  SUDDEN_DECELERATION_G: 4.0, // 4G deceleration triggers detection
  CRITICAL_G: 8.0, // 8G+ is severe
  SPEED_BUFFER_MS: 5000, // Store last 5 seconds of speed data
};

class MQTTVehicleTracker {
  private client: MqttClient | null = null;
  private locationCallbacks: Map<string, Set<LocationCallback>> = new Map();
  private statusCallbacks: Set<StatusCallback> = new Set();
  private accidentCallbacks: Set<AccidentCallback> = new Set();
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  
  // Store latest vehicle locations for safety checks
  private vehicleLocations: Map<string, VehicleLocation> = new Map();
  // Store speed history for accident detection
  private speedHistory: Map<string, { speed: number; timestamp: number }[]> = new Map();
  // Driver/owner mapping for accident reports
  private vehicleDriverMap: Map<string, { driverId: string; ownerId?: string }> = new Map();
  // Store latest sensor/diagnostic data for telemetry snapshots
  private vehicleDiagnostics: Map<string, any> = new Map();
  private vehicleSensors: Map<string, any> = new Map();
  private lastAccelerometer: Map<string, { x: number; y: number; z: number; totalG: number }> = new Map();

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

          // Subscribe to accelerometer/sensor data for accident detection
          this.client?.subscribe('rentmaikar/vehicles/+/sensors', (err) => {
            if (err) console.error('[MQTT] Subscription error:', err);
            else console.log('[MQTT] Subscribed to vehicle sensors');
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
        
        // Track speed history for accident detection
        this.trackSpeedHistory(vehicleId, location.speed);

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

      // Handle sensor data (accelerometer, impact sensors)
      if (messageType === 'sensors') {
        const data = JSON.parse(message);
        this.handleSensorData(vehicleId, data);
      }
    } catch (error) {
      console.error('[MQTT] Error parsing message:', error);
    }
  }

  private trackSpeedHistory(vehicleId: string, speed: number): void {
    const now = Date.now();
    if (!this.speedHistory.has(vehicleId)) {
      this.speedHistory.set(vehicleId, []);
    }
    
    const history = this.speedHistory.get(vehicleId)!;
    history.push({ speed, timestamp: now });
    
    // Keep only last 5 seconds of data
    const cutoff = now - ACCIDENT_THRESHOLDS.SPEED_BUFFER_MS;
    this.speedHistory.set(
      vehicleId,
      history.filter(h => h.timestamp > cutoff)
    );
  }

  private handleSensorData(vehicleId: string, data: any): void {
    // Store sensor data for telemetry snapshots
    if (data.type === 'accelerometer' || data.type === 'impact') {
      const totalG = data.totalG || Math.sqrt(
        Math.pow(data.x || 0, 2) + 
        Math.pow(data.y || 0, 2) + 
        Math.pow(data.z || 0, 2)
      );

      // Store latest accelerometer reading
      this.lastAccelerometer.set(vehicleId, {
        x: data.x || 0,
        y: data.y || 0,
        z: data.z || 0,
        totalG,
      });

      if (totalG >= ACCIDENT_THRESHOLDS.SUDDEN_DECELERATION_G) {
        console.log(`[MQTT] Accident detected for ${vehicleId}: ${totalG.toFixed(2)}G`);
        this.triggerAccidentEvent(vehicleId, totalG, data.type === 'impact' ? 'impact' : 'sudden_deceleration');
      }
    }

    // Store diagnostic data
    if (data.type === 'diagnostics') {
      this.vehicleDiagnostics.set(vehicleId, {
        ...this.vehicleDiagnostics.get(vehicleId),
        ...data,
        updatedAt: Date.now(),
      });
    }

    // Store environmental/other sensor data
    if (data.type === 'environment' || data.type === 'sensors') {
      this.vehicleSensors.set(vehicleId, {
        ...this.vehicleSensors.get(vehicleId),
        ...data,
        updatedAt: Date.now(),
      });
    }

    // Handle airbag deployment signal
    if (data.type === 'airbag' && data.deployed) {
      console.log(`[MQTT] Airbag deployment detected for ${vehicleId}`);
      this.triggerAccidentEvent(vehicleId, 10, 'airbag'); // Airbag = critical
    }
  }

  private async triggerAccidentEvent(
    vehicleId: string, 
    decelerationG: number, 
    triggerType: AccidentEvent['triggerType']
  ): Promise<void> {
    const location = this.vehicleLocations.get(vehicleId);
    const speedHistory = this.speedHistory.get(vehicleId) || [];
    const speedAtImpact = speedHistory.length > 0 
      ? speedHistory[speedHistory.length - 1].speed 
      : 0;

    const driverInfo = this.vehicleDriverMap.get(vehicleId);

    const event: AccidentEvent = {
      vehicleId,
      driverId: driverInfo?.driverId,
      ownerId: driverInfo?.ownerId,
      triggerType,
      decelerationG,
      speedAtImpact,
      latitude: location?.latitude || 0,
      longitude: location?.longitude || 0,
      timestamp: new Date(),
    };

    // Notify local callbacks
    this.accidentCallbacks.forEach(cb => cb(event));

    // Send to backend for incident creation
    try {
      await supabase.functions.invoke('iot-accident-detection', {
        body: {
          ...event,
          deviceId: `device-${vehicleId}`,
          timestamp: event.timestamp.toISOString(),
        },
      });
      console.log('[MQTT] Accident event sent to backend');
    } catch (error) {
      console.error('[MQTT] Failed to send accident event:', error);
    }
  }

  // Register vehicle-driver mapping for accident reports
  registerVehicleDriver(vehicleId: string, driverId: string, ownerId?: string): void {
    this.vehicleDriverMap.set(vehicleId, { driverId, ownerId });
  }

  // Subscribe to accident events
  onAccident(callback: AccidentCallback): () => void {
    this.accidentCallbacks.add(callback);
    return () => {
      this.accidentCallbacks.delete(callback);
    };
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

  /**
   * Capture complete IoT telemetry snapshot for incident logging
   * Called when driver reports maintenance/breakdown to preserve vehicle state
   */
  captureIoTSnapshot(vehicleId: string): IoTTelemetrySnapshot {
    const location = this.vehicleLocations.get(vehicleId);
    const diagnostics = this.vehicleDiagnostics.get(vehicleId);
    const sensors = this.vehicleSensors.get(vehicleId);
    const accelerometer = this.lastAccelerometer.get(vehicleId);
    const speedHistory = this.speedHistory.get(vehicleId) || [];

    console.log(`[MQTT] Capturing IoT snapshot for vehicle ${vehicleId}`);

    const snapshot: IoTTelemetrySnapshot = {
      vehicleId,
      capturedAt: new Date().toISOString(),
      location: location ? {
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: 5, // meters (simulated)
      } : null,
      motion: location ? {
        speed: location.speed,
        heading: location.heading,
        isParked: location.isParked,
      } : null,
      vehicle: location ? {
        ignitionStatus: location.ignitionStatus,
        batteryLevel: location.batteryLevel,
        fuelLevel: diagnostics?.fuelLevel,
        engineTemp: diagnostics?.engineTemp,
        odometerReading: diagnostics?.odometer,
      } : null,
      diagnostics: diagnostics ? {
        engineCode: diagnostics.dtcCodes || [],
        checkEngineLightOn: diagnostics.checkEngineLight || false,
        tirePressure: diagnostics.tirePressure,
        brakeWearLevel: diagnostics.brakeWear,
        oilLevel: diagnostics.oilLevel,
        coolantLevel: diagnostics.coolantLevel,
        transmissionTemp: diagnostics.transmissionTemp,
      } : null,
      sensors: {
        lastAccelerometerReading: accelerometer,
        ambientTemp: sensors?.ambientTemp,
        humidity: sensors?.humidity,
      },
      connectivity: {
        signalStrength: diagnostics?.signalStrength || 85,
        lastPingMs: location ? Date.now() - location.timestamp.getTime() : 0,
        firmwareVersion: diagnostics?.firmwareVersion,
      },
    };

    console.log(`[MQTT] IoT snapshot captured:`, snapshot);
    return snapshot;
  }

  /**
   * Request fresh diagnostic data from vehicle
   * Sends command to IoT device to report all current parameters
   */
  async requestDiagnosticReport(vehicleId: string): Promise<void> {
    if (!this.client || !this.isConnected) {
      console.log(`[MQTT] Offline mode: Cannot request diagnostics for ${vehicleId}`);
      return;
    }

    const topic = `rentmaikar/vehicles/${vehicleId}/command`;
    const payload = JSON.stringify({
      command: 'report_diagnostics',
      timestamp: new Date().toISOString(),
      requestId: Math.random().toString(36).slice(2, 11),
      params: {
        includeOBD: true,
        includeSensors: true,
        includeLocation: true,
      },
    });

    return new Promise((resolve) => {
      this.client!.publish(topic, payload, { qos: 1 }, (error) => {
        if (error) {
          console.error('[MQTT] Diagnostic request error:', error);
        } else {
          console.log(`[MQTT] Diagnostic report requested for ${vehicleId}`);
        }
        resolve();
      });
    });
  }
}

// Singleton instance
export const mqttTracker = new MQTTVehicleTracker();
