import { BLE_SERVICE_UUID, BLE_CHAR_LED_UUID, BLE_CHAR_NOTES_UUID } from '../constants';

// Define Web Bluetooth interfaces locally since @types/web-bluetooth might be missing in the environment
interface BluetoothDevice extends EventTarget {
  id: string;
  name?: string;
  gatt?: BluetoothRemoteGATTServer;
  addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;
}

interface BluetoothRemoteGATTServer {
  device: BluetoothDevice;
  connected: boolean;
  connect(): Promise<BluetoothRemoteGATTServer>;
  disconnect(): void;
  getPrimaryService(service: string | number): Promise<BluetoothRemoteGATTService>;
}

interface BluetoothRemoteGATTService {
  uuid: string;
  isPrimary: boolean;
  device: BluetoothDevice;
  getCharacteristic(characteristic: string | number): Promise<BluetoothRemoteGATTCharacteristic>;
}

interface BluetoothRemoteGATTCharacteristic {
  service: BluetoothRemoteGATTService;
  uuid: string;
  writeValue(value: BufferSource): Promise<void>;
  readValue(): Promise<DataView>;
}

class BLEService {
  private device: BluetoothDevice | null = null;
  private server: BluetoothRemoteGATTServer | null = null;
  private ledChar: BluetoothRemoteGATTCharacteristic | null = null;
  private notesChar: BluetoothRemoteGATTCharacteristic | null = null;

  isSupported(): boolean {
    return 'bluetooth' in (navigator as any);
  }

  async connect(): Promise<void> {
    if (!this.isSupported()) {
      throw new Error('Bluetooth is not supported in this browser. Please use Chrome (Android) or Bluefy (iOS).');
    }

    try {
      // 1. Request Device
      console.log('Requesting Bluetooth Device...');
      // Using 'as any' to bypass the missing type definition on Navigator
      this.device = await (navigator as any).bluetooth.requestDevice({
        filters: [{ services: [BLE_SERVICE_UUID] }]
      });

      if (!this.device) throw new Error('No device selected');

      this.device.addEventListener('gattserverdisconnected', this.onDisconnected);

      // 2. Connect to Server
      console.log('Connecting to GATT Server...');
      if (!this.device.gatt) throw new Error('GATT not available');
      this.server = await this.device.gatt.connect();

      // 3. Get Service
      console.log('Getting Service...');
      const service = await this.server.getPrimaryService(BLE_SERVICE_UUID);

      // 4. Get Characteristics
      console.log('Getting Characteristics...');
      this.ledChar = await service.getCharacteristic(BLE_CHAR_LED_UUID);
      this.notesChar = await service.getCharacteristic(BLE_CHAR_NOTES_UUID);

      console.log('Connected!');
    } catch (error) {
      console.error('Connection failed', error);
      throw error;
    }
  }

  disconnect() {
    if (this.device && this.device.gatt && this.device.gatt.connected) {
      this.device.gatt.disconnect();
    }
  }

  onDisconnected = () => {
    console.log('Device disconnected');
    // Events handled in UI via state mapping usually
    this.device = null;
    this.server = null;
    this.ledChar = null;
    this.notesChar = null;
  };

  /**
   * Sends RGB values.
   * Format: Uint8Array [Red(0/1), Green(0/1), Blue(0/1)]
   * Note: The C++ code uses 0 or 1 for digital write. 
   * If you want PWM later, you can send 0-255.
   */
  async sendColor(r: number, g: number, b: number): Promise<void> {
    if (!this.ledChar) return;
    try {
      const data = new Uint8Array([r, g, b]);
      await this.ledChar.writeValue(data);
    } catch (err) {
      console.error('Error writing color:', err);
      throw err;
    }
  }

  /**
   * Sends Array of Frequencies (Integers).
   * ESP32 expects an array of 16-bit integers (since frequencies go up to ~4000Hz).
   */
  async sendNotes(frequencies: number[]): Promise<void> {
    if (!this.notesChar) return;
    try {
      // Create a buffer for 16-bit integers (2 bytes per note)
      const buffer = new ArrayBuffer(frequencies.length * 2);
      const view = new Uint16Array(buffer);
      
      frequencies.forEach((freq, index) => {
        view[index] = freq;
      });

      await this.notesChar.writeValue(buffer);
    } catch (err) {
      console.error('Error writing notes:', err);
      throw err;
    }
  }
}

export const bleService = new BLEService();