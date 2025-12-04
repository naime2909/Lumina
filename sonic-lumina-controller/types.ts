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

export const PRESET_COLORS = [
  { name: 'Red', r: 1, g: 0, b: 0, hex: '#FF0000' },
  { name: 'Green', r: 0, g: 1, b: 0, hex: '#00FF00' },
  { name: 'Blue', r: 0, g: 0, b: 1, hex: '#0000FF' },
  { name: 'Yellow', r: 1, g: 1, b: 0, hex: '#FFFF00' },
  { name: 'Cyan', r: 0, g: 1, b: 1, hex: '#00FFFF' },
  { name: 'Purple', r: 1, g: 0, b: 1, hex: '#FF00FF' },
  { name: 'White', r: 1, g: 1, b: 1, hex: '#FFFFFF' },
  { name: 'Off', r: 0, g: 0, b: 0, hex: '#1a1a1a' },
];