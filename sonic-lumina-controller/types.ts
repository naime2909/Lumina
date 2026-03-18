export interface Note {
  id: number;
  frequency: number;
  name: string;
}

export enum ConnectionStatus {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  ERROR = 'ERROR'
}

export interface BleDeviceConfig {
  deviceId: string | null;
  status: ConnectionStatus;
  error: string | null;
}

export const FREQUENCY_MAP: Record<string, number> = {
  'C3': 131, 'D3': 147, 'E3': 165, 'F3': 175, 'G3': 196, 'A3': 220, 'B3': 247,
  'C4': 262, 'D4': 294, 'E4': 330, 'F4': 349, 'G4': 392, 'A4': 440, 'B4': 494,
  'C5': 523, 'D5': 587, 'E5': 659
};

export interface ColorRGBW {
  name: string;
  r: number;  // 0-255
  g: number;  // 0-255
  b: number;  // 0-255
  w: number;  // 0-255 (white channel)
  hex: string;
}

export const PRESET_COLORS: ColorRGBW[] = [
  { name: 'Red', r: 255, g: 0, b: 0, w: 0, hex: '#FF0000' },
  { name: 'Green', r: 0, g: 255, b: 0, w: 0, hex: '#00FF00' },
  { name: 'Blue', r: 0, g: 0, b: 255, w: 0, hex: '#0000FF' },
  { name: 'Yellow', r: 255, g: 255, b: 0, w: 0, hex: '#FFFF00' },
  { name: 'Cyan', r: 0, g: 255, b: 255, w: 0, hex: '#00FFFF' },
  { name: 'Purple', r: 255, g: 0, b: 255, w: 0, hex: '#FF00FF' },
  { name: 'Warm White', r: 0, g: 0, b: 0, w: 255, hex: '#FFF5E6' },
  { name: 'Cool White', r: 100, g: 100, b: 255, w: 200, hex: '#E8E8FF' },
  { name: 'Sunset', r: 255, g: 80, b: 0, w: 60, hex: '#FF5000' },
  { name: 'Ocean', r: 0, g: 100, b: 255, w: 30, hex: '#0064FF' },
  { name: 'Off', r: 0, g: 0, b: 0, w: 0, hex: '#1a1a1a' },
];