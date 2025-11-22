
import React, { useState, useEffect, useMemo } from 'react';
import { GameState, CaseData, Citizen, DispatchCall, Language } from './types';
import { CityMap } from './components/CityMap';
import { SolvingTable } from './components/SolvingTable';
import { CitizenDatabase } from './components/CitizenDatabase';
import { generateCase } from './services/geminiService';

// --- MOCK DATA GENERATOR ---
const generateMockCitizens = (count: number): Citizen[] => {
  const firstNames = ["John", "Jane", "Michael", "Emily", "David", "Sarah", "Robert", "Jessica", "William", "Ashley", "James", "Linda", "George", "Patricia", "Joseph", "Elizabeth", "Thomas", "Jennifer", "Charles", "Maria"];
  const lastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin"];
  const streets = ["Maple", "Oak", "Washington", "Park", "Lake", "Hill", "Cedar", "High", "Elm", "Main"];
  const jobs = ["Accountant", "Nurse", "Teacher", "Engineer", "Sales", "Driver", "Clerk", "Manager", "Student", "Retired", "Mechanic", "Chef", "Security", "Artist", "Unemployed"];

  return Array.from({ length: count }).map((_, i) => {
    const fn = firstNames[Math.floor(Math.random() * firstNames.length)];
    const ln = lastNames[Math.floor(Math.random() * lastNames.length)];
    return {
      id: `CIT-${10000 + i}`,
      firstName: fn,
      lastName: ln,
      age: 18 + Math.floor(Math.random() * 60),
      gender: Math.random() > 0.5 ? 'Male' : 'Female',
      occupation: jobs[Math.floor(Math.random() * jobs.length)],
      address: `${Math.floor(Math.random() * 900) + 100} ${streets[Math.floor(Math.random() * streets.length)]} St`,
      ssn: `${Math.floor(100+Math.random()*899)}-${Math.floor(10+Math.random()*89)}-${Math.floor(1000+Math.random()*8999)}`,
      phone: `555-${Math.floor(100+Math.random()*899)}-${Math.floor(1000+Math.random()*8999)}`,
      height: `${5 + Math.floor(Math.random()*2)}'${Math.floor(Math.random()*11)}"`,
      weight: `${130 + Math.floor(Math.random()*100)} lbs`,
      bloodType: ['A+', 'O+', 'B-', 'AB+'][Math.floor(Math.random()*4)],
      relationships: [`Mother: ${lastNames[Math.floor(Math.random()*lastNames.length)]}`, "Single"],
      criminalRecord: Math.random() > 0.9 ? "Minor Traffic Violations" : "Clean",
      notes: "No active alerts.",
      avatarUrl: `https://ui-avatars.com/api/?name=${fn}+${ln}&background=random`,
      x: Math.random() * 100,
      y: Math.random() * 100,
    };
  });
};

// --- TRANSLATIONS ---
const translations = {
  EN: {
    unit: "UNIT 44-ALPHA // LOGGED IN",
    openDb: "📂 OPEN CITIZEN DATABASE",
    activeQueue: "ACTIVE DISPATCH QUEUE",
    respond: "RESPOND",
    autoRefresh: "AUTO-REFRESH ENABLED",
    downloading: "DOWNLOADING INCIDENT DATA...",
    mapSystem: "GEOSPATIAL DISPATCH SYSTEM v2.1",
    grid: "GRID",
    priority: "PRIORITY"
  },
  FI: {
    unit: "YKSIKKÖ 44-ALPHA // KIRJAUTUNUT",
    openDb: "📂 AVAA KANSALAISTIETOKANTA",
    activeQueue: "AKTIIVINEN HÄLYTYSJONO",
    respond: "VASTAA",
    autoRefresh: "AUTOMAATTINEN PÄIVITYS KÄYTÖSSÄ",
    downloading: "LADATAAN TAPAUSTIETOJA...",
    mapSystem: "PAIKKATIETOJÄRJESTELMÄ v2.1",
    grid: "RUUTU",
    priority: "PRIORITEETTI"
  }
};

const App: React.FC = () => {
  const [language, setLanguage] = useState<Language | null>(null);
  const [gameState, setGameState] = useState<GameState>(GameState.DASHBOARD);
  const [activeCase, setActiveCase] = useState<CaseData | null>(null);
  const [loadingCase, setLoadingCase] = useState(false);
  const [citizenDB, setCitizenDB] = useState<Citizen[]>([]);
  
  useEffect(() => {
    setCitizenDB(generateMockCitizens(200));
  }, []);

  // Pending Dispatch Queue - Always full
  const [dispatchQueue, setDispatchQueue] = useState<DispatchCall[]>([
    { id: 101, type: "DOMESTIC DISTURBANCE", priority: "HIGH", time: "21:04", x: 45, y: 30 },
    { id: 102, type: "SUSPICIOUS PERSON", priority: "LOW", time: "21:15", x: 12, y: 78 },
    { id: 103, type: "SILENT ALARM", priority: "HIGH", time: "21:22", x: 67, y: 22 },
    { id: 104, type: "NOISE COMPLAINT", priority: "LOW", time: "21:28", x: 89, y: 55 },
    { id: 105, type: "VANDALISM REPORT", priority: "MEDIUM", time: "21:35", x: 33, y: 60 }
  ]);

  // Replenish queue periodically
  useEffect(() => {
    const interval = setInterval(() => {
      if (dispatchQueue.length < 6) {
        const types = ["911 HANGUP", "THEFT REPORT", "TRESPASSING", "TRAFFIC ACCIDENT", "ASSAULT REPORT"];
        const newCall = {
          id: Date.now(),
          type: types[Math.floor(Math.random() * types.length)],
          priority: Math.random() > 0.7 ? "HIGH" : "MEDIUM",
          time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
          x: Math.random() * 100,
          y: Math.random() * 100
        };
        setDispatchQueue(prev => [...prev, newCall]);
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [dispatchQueue]);

  const handleOpenCase = async () => {
    if (!language) return;
    setLoadingCase(true);
    try {
      const newCase = await generateCase(language);
      setActiveCase(newCase);
      // Add coords to new suspects and ensure they are in the map DB
      const enhancedSuspects = newCase.suspects.map(s => ({
        ...s,
        x: Math.random() * 100,
        y: Math.random() * 100
      }));
      
      // Update active case with positioned suspects
      const caseWithPos = { ...newCase, suspects: enhancedSuspects };
      setActiveCase(caseWithPos);

      // Add suspects to citizen DB
      setCitizenDB(prev => [...enhancedSuspects, ...prev]); 
      setGameState(GameState.ACTIVE_CASE);
    } catch (e) {
      console.error("Failed to load case", e);
    } finally {
      setLoadingCase(false);
    }
  };

  const handleCloseCase = () => {
    setActiveCase(null);
    setGameState(GameState.DASHBOARD);
    setDispatchQueue(prev => prev.slice(1)); // Remove one from queue
  };

  if (!language) {
    return (
      <div className="w-screen h-screen bg-slate-900 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-2xl text-center max-w-md w-full border-4 border-blue-500">
          <h1 className="text-2xl font-bold mb-6 text-slate-800 uppercase tracking-widest">Sentinel CAD System</h1>
          <p className="mb-8 text-slate-600 font-mono">Select Interface Language / Valitse kieli</p>
          <div className="flex flex-col gap-4">
            <button 
              onClick={() => setLanguage('EN')}
              className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded transition-all shadow-lg text-lg"
            >
              ENGLISH
            </button>
            <button 
              onClick={() => setLanguage('FI')}
              className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded transition-all shadow-lg text-lg"
            >
              SUOMI (FINNISH)
            </button>
          </div>
        </div>
      </div>
    );
  }

  const t = translations[language];

  const renderDashboard = () => (
    <div className="h-full p-6 grid grid-cols-12 gap-6 bg-slate-900">
      {/* Top Bar */}
      <div className="col-span-12 h-14 flex items-center justify-between bg-slate-800 rounded px-6 shadow border-b border-slate-700">
        <div className="flex items-center gap-4">
          <div className="text-blue-400 font-bold tracking-wider text-xl">SENTINEL <span className="text-white">CAD</span></div>
          <div className="h-6 w-px bg-slate-600"></div>
          <div className="text-slate-400 text-sm uppercase">{t.unit}</div>
        </div>
        <button 
          onClick={() => setGameState(GameState.CITIZEN_DB)}
          className="bg-blue-700 hover:bg-blue-600 text-white px-4 py-2 rounded text-sm font-bold flex items-center gap-2"
        >
          {t.openDb}
        </button>
      </div>

      {/* Left: Map / Operations */}
      <div className="col-span-8 bg-black rounded border border-slate-700 p-1 flex flex-col shadow-lg relative overflow-hidden">
        <div className="absolute top-3 left-3 z-20 bg-slate-900/80 text-blue-200 text-[10px] font-bold px-2 py-0.5 rounded border border-slate-600 backdrop-blur uppercase">
          {t.mapSystem}
        </div>
        <div className="flex-1 h-full">
          <CityMap dispatchQueue={dispatchQueue} citizens={citizenDB} language={language} />
        </div>
      </div>

      {/* Right: Dispatch Queue */}
      <div className="col-span-4 bg-slate-800 rounded border border-slate-700 flex flex-col shadow-lg overflow-hidden">
         <div className="p-3 bg-slate-700 border-b border-slate-600 flex justify-between items-center">
           <h2 className="font-bold text-slate-200 text-sm uppercase">{t.activeQueue}</h2>
           <div className="flex gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
           </div>
         </div>
         <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {loadingCase && (
               <div className="p-4 bg-blue-900/30 border border-blue-500/30 text-blue-200 text-center text-xs font-mono animate-pulse uppercase">
                 {t.downloading}
               </div>
            )}
            {dispatchQueue.map((call) => (
              <div key={call.id} className="bg-slate-700 p-3 rounded border-l-4 border-slate-500 hover:bg-slate-600 transition-colors group">
                <div className="flex justify-between mb-1">
                  <span className="text-white font-bold text-sm">{call.type}</span>
                  <span className="text-slate-400 text-xs font-mono">{call.time}</span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono mb-2 uppercase">
                  {t.grid}: {Math.floor(call.x)},{Math.floor(call.y)}
                </div>
                <div className="flex justify-between items-center mt-1">
                   <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                     call.priority === 'HIGH' ? 'bg-red-900 text-red-200' : 
                     call.priority === 'MEDIUM' ? 'bg-amber-900 text-amber-200' : 
                     'bg-blue-900 text-blue-200'
                   }`}>{call.priority} {t.priority}</span>
                   <button 
                     onClick={handleOpenCase}
                     disabled={loadingCase}
                     className="bg-slate-200 hover:bg-white text-slate-900 text-xs font-bold px-3 py-1 rounded shadow-sm uppercase"
                   >
                     {t.respond}
                   </button>
                </div>
              </div>
            ))}
         </div>
         <div className="bg-slate-900 p-2 text-center text-[10px] text-slate-500 border-t border-slate-700 uppercase">
           {t.autoRefresh}
         </div>
      </div>
    </div>
  );

  return (
    <div className="w-screen h-screen bg-slate-900 text-slate-200 font-sans overflow-hidden relative">
      {gameState === GameState.DASHBOARD && renderDashboard()}
      
      {gameState === GameState.ACTIVE_CASE && activeCase && (
        <SolvingTable activeCase={activeCase} citizens={citizenDB} onCaseClosed={handleCloseCase} language={language} />
      )}

      {gameState === GameState.CITIZEN_DB && (
        <CitizenDatabase 
          citizens={citizenDB} 
          onBack={() => setGameState(GameState.DASHBOARD)} 
          activeCase={activeCase}
          language={language}
        />
      )}
    </div>
  );
};

export default App;
