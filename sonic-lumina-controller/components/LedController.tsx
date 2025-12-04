import React from 'react';
import { PRESET_COLORS } from '../types';
import { bleService } from '../services/bleService';

interface LedControllerProps {
  isConnected: boolean;
}

const LedController: React.FC<LedControllerProps> = ({ isConnected }) => {
  const [activeColor, setActiveColor] = React.useState<string>('Red');
  const [loading, setLoading] = React.useState(false);

  const handleColorChange = async (color: typeof PRESET_COLORS[0]) => {
    setActiveColor(color.name);
    
    // Optimistic UI update
    if (!isConnected) return;

    setLoading(true);
    try {
      await bleService.sendColor(color.r, color.g, color.b);
    } catch (error) {
      console.error('Failed to set color', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-2xl relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-30 transition-opacity">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-cyan-500">
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
        </svg>
      </div>

      <h2 className="text-xl font-cyber mb-6 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 tracking-wider">
        ILLUMINATION CONTROL
      </h2>

      <div className="grid grid-cols-4 gap-4">
        {PRESET_COLORS.map((color) => (
          <button
            key={color.name}
            onClick={() => handleColorChange(color)}
            disabled={loading}
            className={`
              relative aspect-square rounded-lg flex items-center justify-center transition-all duration-300
              ${activeColor === color.name ? 'scale-110 ring-2 ring-white shadow-lg' : 'hover:scale-105 opacity-80'}
            `}
            style={{ 
              backgroundColor: color.hex,
              boxShadow: activeColor === color.name ? `0 0 20px ${color.hex}80` : 'none'
            }}
          >
            {activeColor === color.name && (
              <span className="absolute inset-0 flex items-center justify-center">
                 <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
              </span>
            )}
            <span className="sr-only">{color.name}</span>
          </button>
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