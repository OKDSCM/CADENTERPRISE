import React, { useRef, useEffect, useState } from 'react';

interface FrequencyScannerProps {
  onSignalLocked: () => void;
}

export const FrequencyScanner: React.FC<FrequencyScannerProps> = ({ onSignalLocked }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [frequency, setFrequency] = useState(50); // 0 to 100
  const [targetFreq, setTargetFreq] = useState(0);
  const [signalStrength, setSignalStrength] = useState(0);
  const [scanning, setScanning] = useState(false);

  // Initialize random target
  useEffect(() => {
    setTargetFreq(Math.floor(Math.random() * 80) + 10);
  }, []);

  // Audio simulation (visual only here for code brevity, but implies sound)
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let phase = 0;

    const render = () => {
      // Resize
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
      const w = canvas.width;
      const h = canvas.height;

      // Clear
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, w, h);

      // Draw Grid
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x < w; x += 40) { ctx.moveTo(x, 0); ctx.lineTo(x, h); }
      for (let y = 0; y < h; y += 40) { ctx.moveTo(0, y); ctx.lineTo(w, y); }
      ctx.stroke();

      // Draw Noise
      const diff = Math.abs(frequency - targetFreq);
      const proximity = Math.max(0, 1 - diff / 15); // 0 to 1
      setSignalStrength(proximity);

      ctx.beginPath();
      ctx.strokeStyle = proximity > 0.9 ? '#10b981' : '#0ea5e9';
      ctx.lineWidth = 2;

      for (let x = 0; x < w; x++) {
        // Waveform math
        const base = Math.sin((x * 0.02) + phase);
        // Noise reduces as we get closer to target
        const noiseAmount = (1 - proximity) * 50; 
        const noise = (Math.random() - 0.5) * noiseAmount;
        
        // Signal emerges
        const signal = proximity > 0.5 ? Math.sin((x * 0.1) + (phase * 2)) * (proximity * 30) : 0;

        const y = h / 2 + base * 10 + noise + signal;
        
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Target Zone Indicator
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      const targetX = (targetFreq / 100) * w;
      ctx.fillRect(targetX - 20, 0, 40, h);

      // Cursor
      ctx.strokeStyle = '#ef4444';
      const cursorX = (frequency / 100) * w;
      ctx.beginPath();
      ctx.moveTo(cursorX, 0);
      ctx.lineTo(cursorX, h);
      ctx.stroke();

      phase += 0.2;
      animationId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animationId);
  }, [frequency, targetFreq]);

  const handleScan = () => {
    setScanning(true);
    // Simulate "locking on" logic
    if (signalStrength > 0.95) {
      setTimeout(() => {
        onSignalLocked();
        setScanning(false);
      }, 1500);
    } else {
      setTimeout(() => setScanning(false), 500);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-8 bg-slate-950 text-cyan-500">
      <h2 className="text-2xl font-mono mb-4 tracking-widest animate-pulse">INTERCEPTOR PROTOCOL V.9</h2>
      
      <div className="relative w-full max-w-4xl h-64 border-2 border-slate-700 rounded-lg overflow-hidden bg-black shadow-[0_0_30px_rgba(6,182,212,0.1)]">
        <canvas ref={canvasRef} className="w-full h-full" />
        <div className="absolute top-2 right-2 text-xs font-mono text-emerald-500">
          SIGNAL STRENGTH: {(signalStrength * 100).toFixed(1)}%
        </div>
      </div>

      <div className="mt-8 w-full max-w-2xl flex items-center gap-4">
        <span className="font-mono text-sm">700MHz</span>
        <input 
          type="range" 
          min="0" 
          max="100" 
          step="0.1"
          value={frequency} 
          onChange={(e) => setFrequency(parseFloat(e.target.value))}
          className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-crosshair accent-cyan-500"
        />
        <span className="font-mono text-sm">900MHz</span>
      </div>

      <button 
        onClick={handleScan}
        disabled={scanning}
        className={`mt-8 px-12 py-3 font-bold text-black font-mono tracking-widest uppercase transition-all
          ${signalStrength > 0.9 ? 'bg-emerald-500 hover:bg-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.6)]' : 'bg-slate-700 cursor-not-allowed text-slate-400'}
        `}
      >
        {scanning ? 'DECRYPTING STREAM...' : (signalStrength > 0.9 ? 'LOCK SIGNAL' : 'NO SIGNAL')}
      </button>
    </div>
  );
};
