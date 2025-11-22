
import React, { useState, useRef, useEffect } from 'react';
import { DispatchCall, Citizen, Language } from '../types';

interface CityMapProps {
  dispatchQueue: DispatchCall[];
  citizens: Citizen[];
  onSelectDispatch?: (id: number) => void;
  language: Language;
  mapUrl?: string;
}

export const CityMap: React.FC<CityMapProps> = ({ dispatchQueue, citizens, onSelectDispatch, language, mapUrl }) => {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showCitizens, setShowCitizens] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);

  const currentMapUrl = mapUrl || 'https://i.postimg.cc/GmfbF3W8/image.png';

  const t = {
    EN: {
      sector: "MAP SECTOR",
      zoom: "ZOOM",
      hideCit: "HIDE CITIZENS",
      showCit: "SHOW CITIZENS",
      reset: "RESET",
      downtown: "DOWNTOWN"
    },
    FI: {
      sector: "SEKTORI",
      zoom: "ZOOM",
      hideCit: "PIILOTA KANSALAISET",
      showCit: "NÄYTÄ KANSALAISET",
      reset: "NOLLAA",
      downtown: "KESKUSTA"
    }
  }[language];

  // Mouse handlers for Panning
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    const newZoom = Math.max(1, Math.min(5, zoom - e.deltaY * 0.001));
    setZoom(newZoom);
  };

  const resetView = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  return (
    <div className="h-full w-full flex flex-col bg-slate-900 border border-slate-700 rounded overflow-hidden relative group">
      
      {/* Map Container */}
      <div 
        ref={containerRef}
        className="flex-1 relative overflow-hidden cursor-grab active:cursor-grabbing bg-black"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        {/* Transform Layer */}
        <div 
          className="absolute top-0 left-0 w-full h-full transition-transform duration-75 ease-out origin-center"
          style={{ 
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
            backgroundImage: `url('${currentMapUrl}')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        >
          {/* Citizen Markers */}
          {showCitizens && citizens.map(cit => (
            <div
              key={cit.id}
              className="absolute w-2 h-2 bg-blue-400 rounded-full shadow-[0_0_4px_#60a5fa] hover:scale-150 transition-transform z-10"
              style={{ 
                left: `${cit.x}%`, 
                top: `${cit.y}%`,
                transform: `translate(-50%, -50%) scale(${1/zoom})` 
              }}
              title={`${cit.firstName} ${cit.lastName}`}
            />
          ))}

          {/* Dispatch Markers */}
          {dispatchQueue.map(call => (
             <div
               key={call.id}
               className={`absolute w-6 h-6 flex items-center justify-center -translate-x-1/2 -translate-y-1/2 z-20 cursor-pointer
                 ${call.priority === 'HIGH' ? 'text-red-500' : call.priority === 'MEDIUM' ? 'text-amber-500' : 'text-blue-500'}
               `}
               style={{ 
                 left: `${call.x}%`, 
                 top: `${call.y}%`,
                 transform: `translate(-50%, -50%) scale(${1/zoom})`
               }}
             >
                {/* Pulsing effect */}
                <div className={`absolute inset-0 rounded-full opacity-50 animate-ping ${
                  call.priority === 'HIGH' ? 'bg-red-500' : 'bg-blue-500'
                }`}></div>
                
                {/* Icon */}
                <div className={`relative z-10 bg-slate-900 border-2 rounded-full w-4 h-4 flex items-center justify-center
                   ${call.priority === 'HIGH' ? 'border-red-500' : call.priority === 'MEDIUM' ? 'border-amber-500' : 'border-blue-500'}
                `}>
                  <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                </div>

                {/* Hover Tooltip (Visible on hover) */}
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-900/90 text-white text-[8px] px-2 py-1 rounded whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity border border-slate-600">
                  {call.type}
                </div>
             </div>
          ))}

        </div>
      </div>

      {/* Overlay Controls */}
      <div className="absolute top-4 left-4 flex flex-col gap-2 pointer-events-none">
        <div className="bg-slate-900/80 backdrop-blur px-3 py-1 rounded border border-slate-600 text-xs font-mono text-blue-200 shadow-lg uppercase">
          <div>{t.sector}: {t.downtown}</div>
          <div>{t.zoom}: {Math.round(zoom * 100)}%</div>
        </div>
      </div>

      <div className="absolute bottom-4 right-4 flex gap-2 z-30">
        <button 
          onClick={() => setShowCitizens(!showCitizens)}
          className={`px-4 py-2 rounded text-xs font-bold border shadow-lg transition-all uppercase
            ${showCitizens 
              ? 'bg-blue-600 border-blue-400 text-white' 
              : 'bg-slate-800 border-slate-600 text-slate-400 hover:bg-slate-700'}
          `}
        >
          {showCitizens ? t.hideCit : t.showCit}
        </button>
        <div className="flex bg-slate-800 rounded border border-slate-600 overflow-hidden shadow-lg">
          <button onClick={() => setZoom(Math.min(5, zoom + 0.5))} className="px-3 py-2 hover:bg-slate-700 text-white font-bold">+</button>
          <button onClick={() => setZoom(Math.max(1, zoom - 0.5))} className="px-3 py-2 hover:bg-slate-700 text-white font-bold border-l border-slate-700">-</button>
          <button onClick={resetView} className="px-3 py-2 hover:bg-slate-700 text-slate-400 text-xs border-l border-slate-700 uppercase">{t.reset}</button>
        </div>
      </div>

    </div>
  );
};
