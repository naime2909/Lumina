import React, { useState, useCallback, useRef } from 'react';
import { PRESET_COLORS, ColorRGBW } from '../types';
import { bleService } from '../services/bleService';

interface LedControllerProps {
  isConnected: boolean;
}

interface RGBWState {
  r: number;
  g: number;
  b: number;
  w: number;
}

const CHANNEL_CONFIG = [
  { key: 'r' as const, label: 'R', color: '#FF0000', trackBg: 'from-black to-red-500' },
  { key: 'g' as const, label: 'G', color: '#00FF00', trackBg: 'from-black to-green-500' },
  { key: 'b' as const, label: 'B', color: '#0000FF', trackBg: 'from-black to-blue-500' },
  { key: 'w' as const, label: 'W', color: '#FFFBE6', trackBg: 'from-gray-800 to-yellow-100' },
];

const LedController: React.FC<LedControllerProps> = ({ isConnected }) => {
  const [color, setColor] = useState<RGBWState>({ r: 0, g: 0, b: 0, w: 0 });
  const [brightness, setBrightness] = useState(255);
  const [activePreset, setActivePreset] = useState<string | null>('Off');
  const [loading, setLoading] = useState(false);
  const sendTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getScaledColor = useCallback((c: RGBWState, bright: number): RGBWState => {
    const scale = bright / 255;
    return {
      r: Math.round(c.r * scale),
      g: Math.round(c.g * scale),
      b: Math.round(c.b * scale),
      w: Math.round(c.w * scale),
    };
  }, []);

  const sendColor = useCallback((c: RGBWState, bright: number) => {
    if (!isConnected) return;

    // Debounce BLE writes to avoid flooding
    if (sendTimeoutRef.current) clearTimeout(sendTimeoutRef.current);
    sendTimeoutRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const scaled = getScaledColor(c, bright);
        await bleService.sendColor(scaled.r, scaled.g, scaled.b, scaled.w);
      } catch (error) {
        console.error('Failed to set color', error);
      } finally {
        setLoading(false);
      }
    }, 30);
  }, [isConnected, getScaledColor]);

  const handleSliderChange = (channel: keyof RGBWState, value: number) => {
    const newColor = { ...color, [channel]: value };
    setColor(newColor);
    setActivePreset(null);
    sendColor(newColor, brightness);
  };

  const handleBrightnessChange = (value: number) => {
    setBrightness(value);
    sendColor(color, value);
  };

  const handlePresetClick = (preset: ColorRGBW) => {
    const newColor = { r: preset.r, g: preset.g, b: preset.b, w: preset.w };
    setColor(newColor);
    setActivePreset(preset.name);
    if (preset.name === 'Off') {
      setBrightness(255);
    }
    sendColor(newColor, preset.name === 'Off' ? 255 : brightness);
  };

  const previewHex = (() => {
    const scaled = getScaledColor(color, brightness);
    // Blend white channel into RGB for preview
    const r = Math.min(255, scaled.r + scaled.w);
    const g = Math.min(255, scaled.g + scaled.w);
    const b = Math.min(255, scaled.b + scaled.w);
    return `rgb(${r}, ${g}, ${b})`;
  })();

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-2xl relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-30 transition-opacity">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-cyan-500">
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
        </svg>
      </div>

      <h2 className="text-xl font-cyber mb-4 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 tracking-wider">
        RGBW STRIP CONTROL
      </h2>

      {/* Color Preview */}
      <div className="mb-5 flex items-center gap-4">
        <div
          className="w-16 h-16 rounded-lg border-2 border-gray-700 shadow-lg transition-all duration-200"
          style={{
            backgroundColor: previewHex,
            boxShadow: `0 0 25px ${previewHex}60`,
          }}
        />
        <div className="flex-1">
          <div className="text-xs font-mono text-gray-500 mb-1">
            R:{color.r} G:{color.g} B:{color.b} W:{color.w}
          </div>
          <div className="text-xs font-mono text-gray-600">
            BRIGHTNESS: {Math.round((brightness / 255) * 100)}%
          </div>
        </div>
        {loading && (
          <div className="w-4 h-4 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        )}
      </div>

      {/* RGBW Sliders */}
      <div className="space-y-3 mb-5">
        {CHANNEL_CONFIG.map(({ key, label, color: channelColor, trackBg }) => (
          <div key={key} className="flex items-center gap-3">
            <span
              className="w-6 text-center text-sm font-bold font-mono"
              style={{ color: channelColor }}
            >
              {label}
            </span>
            <div className="flex-1 relative h-6 flex items-center">
              <div className={`absolute inset-0 rounded-full bg-gradient-to-r ${trackBg} opacity-30 h-2 top-1/2 -translate-y-1/2`} />
              <input
                type="range"
                min={0}
                max={255}
                value={color[key]}
                onChange={(e) => handleSliderChange(key, parseInt(e.target.value))}
                className="w-full h-2 appearance-none bg-transparent relative z-10 cursor-pointer
                  [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
                  [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white
                  [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:cursor-pointer
                  [&::-webkit-slider-runnable-track]:h-2 [&::-webkit-slider-runnable-track]:rounded-full"
                style={{
                  // @ts-ignore
                  '--thumb-color': channelColor,
                }}
              />
              <style>{`
                input[type="range"][style*="--thumb-color: ${channelColor}"] {
                  &::-webkit-slider-thumb { background-color: ${channelColor}; }
                }
              `}</style>
            </div>
            <span className="w-10 text-right text-xs font-mono text-gray-400">
              {color[key]}
            </span>
          </div>
        ))}
      </div>

      {/* Brightness Slider */}
      <div className="mb-5 flex items-center gap-3">
        <span className="w-6 text-center text-sm font-mono text-yellow-300">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="inline">
            <circle cx="12" cy="12" r="5" />
            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
          </svg>
        </span>
        <div className="flex-1 relative h-6 flex items-center">
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-gray-900 to-yellow-200 opacity-30 h-2 top-1/2 -translate-y-1/2" />
          <input
            type="range"
            min={0}
            max={255}
            value={brightness}
            onChange={(e) => handleBrightnessChange(parseInt(e.target.value))}
            className="w-full h-2 appearance-none bg-transparent relative z-10 cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
              [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-yellow-300 [&::-webkit-slider-thumb]:border-2
              [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:cursor-pointer
              [&::-webkit-slider-runnable-track]:h-2 [&::-webkit-slider-runnable-track]:rounded-full"
          />
        </div>
        <span className="w-10 text-right text-xs font-mono text-gray-400">
          {Math.round((brightness / 255) * 100)}%
        </span>
      </div>

      {/* Preset Colors */}
      <div className="mb-2">
        <h3 className="text-xs font-mono text-gray-500 mb-2 tracking-wider">PRESETS</h3>
        <div className="grid grid-cols-6 gap-2">
          {PRESET_COLORS.map((preset) => (
            <button
              key={preset.name}
              onClick={() => handlePresetClick(preset)}
              title={preset.name}
              className={`
                relative aspect-square rounded-lg flex items-center justify-center transition-all duration-200
                ${activePreset === preset.name ? 'scale-110 ring-2 ring-cyan-400 shadow-lg' : 'hover:scale-105 opacity-80 hover:opacity-100'}
              `}
              style={{
                backgroundColor: preset.hex,
                boxShadow: activePreset === preset.name ? `0 0 15px ${preset.hex}80` : 'none',
              }}
            >
              {activePreset === preset.name && (
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Preset Labels */}
      <div className="grid grid-cols-6 gap-2 mb-2">
        {PRESET_COLORS.map((preset) => (
          <span key={preset.name} className="text-[8px] text-center text-gray-600 font-mono truncate">
            {preset.name}
          </span>
        ))}
      </div>

      {!isConnected && (
        <div className="mt-4 text-xs text-center text-gray-500 font-mono">
          [ SIMULATION MODE - CONNECT DEVICE TO SYNC ]
        </div>
      )}
    </div>
  );
};

export default LedController;
