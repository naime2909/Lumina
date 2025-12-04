// These UUIDs must match the ones defined in your Arduino/ESP32 code
// Service UUID
export const BLE_SERVICE_UUID = '19b10000-e8f2-537e-4f6c-d104768a1214';

// Characteristics
export const BLE_CHAR_LED_UUID = '19b10001-e8f2-537e-4f6c-d104768a1214';
export const BLE_CHAR_NOTES_UUID = '19b10002-e8f2-537e-4f6c-d104768a1214';

export const DEFAULT_NOTES = [
  { id: 0, frequency: 262, name: 'C4' },
  { id: 1, frequency: 294, name: 'D4' },
  { id: 2, frequency: 133, name: 'C3' }, // Approx for C3 in original code was 133
  { id: 3, frequency: 262, name: 'C4' },
  { id: 4, frequency: 133, name: 'C3' },
  { id: 5, frequency: 440, name: 'A4' },
  { id: 6, frequency: 494, name: 'B4' },
  { id: 7, frequency: 523, name: 'C5' },
];