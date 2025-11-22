import React, { useState, useEffect } from 'react';

export const CCTVGrid: React.FC = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const cameras = [
    { id: 'CAM-01', label: 'MAIN LOBBY', seed: 'hallway' },
    { id: 'CAM-02', label: 'PARKING B1', seed: 'parking' },
    { id: 'CAM-03', label: 'ELEVATORS', seed: 'elevator' },
    { id: 'CAM-04', label: 'EXTERIOR N', seed: 'street' },
  ];

  return (
    <div className="grid grid-cols-2 gap-px h-full bg-slate-900 border-8 border-slate-800 rounded shadow-inner">
      {cameras.map((cam) => (
        <div key={cam.id} className="relative overflow-hidden bg-black group">
          {/* Simulated live feed */}
          <img 
            src={`https://picsum.photos/seed/${cam.seed}/400/300?grayscale`} 
            alt={cam.label}
            className="w-full h-full object-cover opacity-70 group-hover:opacity-90 transition-opacity duration-500"
          />
          {/* Overlay Info */}
          <div className="absolute top-2 left-2 bg-black/50 px-1">
             <span className="text-[10px] font-mono text-white font-bold">{cam.id}</span>
          </div>
          <div className="absolute top-2 right-2">
            <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></div>
          </div>
          <div className="absolute bottom-1 right-2 bg-black/50 px-1">
            <span className="text-[10px] font-mono text-white">{time.toLocaleTimeString()}</span>
          </div>
          <div className="absolute bottom-1 left-2 bg-black/50 px-1">
            <span className="text-[10px] font-mono text-white">{cam.label}</span>
          </div>
        </div>
      ))}
    </div>
  );
};