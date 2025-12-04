import React, { useState } from 'react';
import { ConnectionStatus } from './types';
import { bleService } from './services/bleService';
import LedController from './components/LedController';
import NoteSequencer from './components/NoteSequencer';
import { Bluetooth, BluetoothConnected, BluetoothOff, Info } from 'lucide-react';

const App: React.FC = () => {
  const [status, setStatus] = useState<ConnectionStatus>(ConnectionStatus.DISCONNECTED);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(false);

  const handleConnect = async () => {
    setStatus(ConnectionStatus.CONNECTING);
    setErrorMsg(null);
    try {
      await bleService.connect();
      setStatus(ConnectionStatus.CONNECTED);
    } catch (err: any) {
      console.error(err);
      setStatus(ConnectionStatus.ERROR);
      setErrorMsg(err.message || 'Connection failed');
      // Reset status after a delay so user can try again
      setTimeout(() => setStatus(ConnectionStatus.DISCONNECTED), 4000);
    }
  };

  const handleDisconnect = () => {
    bleService.disconnect();
    setStatus(ConnectionStatus.DISCONNECTED);
  };

  return (
    <div className="min-h-screen bg-black text-gray-100 pb-20 selection:bg-cyan-500 selection:text-black">
      {/* Dynamic Background Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-900/20 blur-[100px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-cyan-900/10 blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-md mx-auto px-4 pt-8">
        
        {/* Header */}
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-cyber font-bold tracking-tighter text-white">
              SONIC<span className="text-cyan-500">LUMINA</span>
            </h1>
            <p className="text-xs text-gray-500 tracking-widest mt-1">ESP32 REMOTE INTERFACE_V1.0</p>
          </div>
          <button 
            onClick={() => setShowInfo(!showInfo)}
            className="p-2 text-gray-500 hover:text-cyan-400 transition-colors"
          >
            <Info size={24} />
          </button>
        </header>

        {/* Info Modal */}
        {showInfo && (
          <div className="mb-6 bg-gray-900/90 border border-gray-700 p-4 rounded-lg text-sm text-gray-300">
            <h3 className="text-cyan-400 font-bold mb-2">How to Connect</h3>
            <ul className="list-disc pl-4 space-y-1 mb-4">
              <li>Ensure Bluetooth is ON.</li>
              <li>Use Chrome (Android) or Bluefy (iOS).</li>
              <li>Upload BLE Sketch to ESP32.</li>
            </ul>
            <h3 className="text-cyan-400 font-bold mb-2">Deploy</h3>
            <p>Host this page on Netlify or GitHub Pages.</p>
          </div>
        )}

        {/* Connection Status / Button */}
        <div className="mb-8">
          {status === ConnectionStatus.CONNECTED ? (
            <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-green-500 rounded-full p-2 animate-pulse">
                  <BluetoothConnected size={20} className="text-black" />
                </div>
                <div>
                  <div className="font-bold text-green-400">SYSTEM ONLINE</div>
                  <div className="text-xs text-green-600 font-mono">LINK ESTABLISHED</div>
                </div>
              </div>
              <button 
                onClick={handleDisconnect}
                className="px-3 py-1 bg-green-900/50 hover:bg-green-900 text-green-400 text-xs rounded border border-green-700 transition-colors"
              >
                DISCONNECT
              </button>
            </div>
          ) : (
            <button
              onClick={handleConnect}
              disabled={status === ConnectionStatus.CONNECTING}
              className={`
                w-full py-6 rounded-xl border-2 flex flex-col items-center justify-center gap-2 transition-all duration-300 group
                ${status === ConnectionStatus.ERROR 
                  ? 'border-red-500 bg-red-900/10 text-red-500' 
                  : 'border-cyan-500/50 bg-cyan-950/20 hover:bg-cyan-900/30 hover:border-cyan-400 hover:shadow-[0_0_20px_rgba(6,182,212,0.3)]'}
              `}
            >
              {status === ConnectionStatus.CONNECTING ? (
                <>
                  <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                  <span className="font-cyber tracking-widest text-cyan-500 mt-2">SCANNING...</span>
                </>
              ) : status === ConnectionStatus.ERROR ? (
                <>
                  <BluetoothOff size={32} />
                  <span className="font-bold">{errorMsg || 'CONNECTION FAILED'}</span>
                  <span className="text-xs opacity-70">TAP TO RETRY</span>
                </>
              ) : (
                <>
                  <Bluetooth size={32} className="text-cyan-400 group-hover:scale-110 transition-transform" />
                  <span className="font-cyber font-bold text-lg text-cyan-100">INITIALIZE CONNECTION</span>
                  <span className="text-xs text-cyan-600 font-mono">SEARCH FOR ESP32 DEVICE</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Modules */}
        <div className={`transition-opacity duration-500 ${status === ConnectionStatus.CONNECTED ? 'opacity-100' : 'opacity-50 pointer-events-none blur-[1px]'}`}>
             {/* Note: In a real app, we might want to let them play with the UI even if disconnected (Simulation Mode), 
                 so we can remove pointer-events-none if desired. I'll leave opacity to indicate connection state but allow interaction for "Demo" feel. */}
        </div>
        
        <div className={status !== ConnectionStatus.CONNECTED ? "opacity-90" : ""}>
             <LedController isConnected={status === ConnectionStatus.CONNECTED} />
             <NoteSequencer isConnected={status === ConnectionStatus.CONNECTED} />
        </div>

      </div>
    </div>
  );
};

export default App;