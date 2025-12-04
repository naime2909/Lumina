import React, { useState, useEffect } from 'react';
import { Note, FREQUENCY_MAP } from '../types';
import { DEFAULT_NOTES } from '../constants';
import { bleService } from '../services/bleService';
import { Play, Upload, RefreshCw } from 'lucide-react';

interface NoteSequencerProps {
  isConnected: boolean;
}

const NoteSequencer: React.FC<NoteSequencerProps> = ({ isConnected }) => {
  const [sequence, setSequence] = useState<Note[]>(DEFAULT_NOTES);
  const [isUploading, setIsUploading] = useState(false);
  const [isPlaying, setIsPlaying] = useState<number | null>(null);

  // Audio Context for browser preview
  const [audioCtx, setAudioCtx] = useState<AudioContext | null>(null);

  useEffect(() => {
    // Initialize AudioContext on user interaction usually, but here setup lazy
    if (!audioCtx && typeof window !== 'undefined') {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        setAudioCtx(new AudioContext());
    }
  }, []);

  const handleNoteChange = (index: number, noteName: string) => {
    const freq = FREQUENCY_MAP[noteName];
    if (freq) {
      const newSeq = [...sequence];
      newSeq[index] = { ...newSeq[index], name: noteName, frequency: freq };
      setSequence(newSeq);
      playTone(freq, 100);
    }
  };

  const playTone = (freq: number, duration: number) => {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration/1000);
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration/1000);
  };

  const handlePlaySequence = async () => {
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') await audioCtx.resume();

    for (let i = 0; i < sequence.length; i++) {
        setIsPlaying(i);
        playTone(sequence[i].frequency, 200);
        await new Promise(r => setTimeout(r, 250)); // Wait slightly longer than tone
    }
    setIsPlaying(null);
  };

  const handleUpload = async () => {
    if (!isConnected) {
        alert("Connect to ESP32 via Bluetooth first!");
        return;
    }

    setIsUploading(true);
    try {
        const frequencies = sequence.map(n => n.frequency);
        await bleService.sendNotes(frequencies);
        // Visual feedback
        setTimeout(() => setIsUploading(false), 500);
    } catch (err) {
        console.error(err);
        setIsUploading(false);
    }
  };

  const resetSequence = () => {
    setSequence(DEFAULT_NOTES);
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-2xl mt-6 relative overflow-hidden">
        <h2 className="text-xl font-cyber mb-6 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500 tracking-wider">
            SONIC SEQUENCER
        </h2>

        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 mb-8">
            {sequence.map((note, idx) => (
                <div key={idx} className="flex flex-col gap-2">
                    <div 
                        className={`
                            h-24 rounded-md relative overflow-hidden transition-all duration-200
                            ${isPlaying === idx ? 'bg-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.5)]' : 'bg-gray-800'}
                        `}
                    >
                        {/* Visual Bar representation of pitch */}
                        <div 
                            className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-cyan-600 to-blue-500 opacity-80 transition-all"
                            style={{ height: `${(note.frequency / 700) * 100}%` }}
                        />
                        <span className="absolute top-2 left-0 right-0 text-center text-xs font-mono text-white mix-blend-difference z-10">
                            {idx + 1}
                        </span>
                    </div>
                    
                    <select 
                        value={note.name}
                        onChange={(e) => handleNoteChange(idx, e.target.value)}
                        className="bg-gray-800 text-xs text-center text-cyan-400 border border-gray-700 rounded py-1 focus:outline-none focus:border-cyan-500"
                    >
                        {Object.keys(FREQUENCY_MAP).map(k => (
                            <option key={k} value={k}>{k}</option>
                        ))}
                    </select>
                </div>
            ))}
        </div>

        <div className="flex gap-4">
            <button 
                onClick={handlePlaySequence}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-cyber py-3 rounded-lg flex items-center justify-center gap-2 transition-colors border border-gray-700"
            >
                <Play size={18} /> PREVIEW
            </button>
            
            <button 
                onClick={handleUpload}
                disabled={!isConnected || isUploading}
                className={`
                    flex-1 font-cyber py-3 rounded-lg flex items-center justify-center gap-2 transition-all
                    ${isConnected 
                        ? 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg shadow-cyan-900/50' 
                        : 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700'}
                `}
            >
                {isUploading ? (
                    <span className="animate-spin">⟳</span>
                ) : (
                    <Upload size={18} />
                )}
                {isUploading ? 'SYNCING...' : 'UPLOAD TO DEVICE'}
            </button>

             <button 
                onClick={resetSequence}
                className="px-4 bg-gray-800 hover:bg-red-900/30 text-gray-400 hover:text-red-400 rounded-lg transition-colors border border-gray-700"
                title="Reset to Default"
            >
                <RefreshCw size={18} />
            </button>
        </div>
    </div>
  );
};

export default NoteSequencer;