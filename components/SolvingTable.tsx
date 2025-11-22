
import React, { useState, useRef, useEffect } from 'react';
import { CaseData, Citizen, Language, PoliceUnit, FileSystemNode } from '../types';
import { submitToSupervisor, simulatePhoneCall, askAIHelper, performUnitAction } from '../services/geminiService';
import { CitizenDatabase } from './CitizenDatabase';

interface SolvingTableProps {
  activeCase: CaseData;
  citizens: Citizen[];
  onCaseClosed: () => void;
  language: Language;
}

// Mock Data for OS
const AVAILABLE_UNITS: PoliceUnit[] = [
  { id: 'U-101', name: 'Alpha Patrol', type: 'PATROL', status: 'AVAILABLE', specialty: 'General' },
  { id: 'U-FX1', name: 'Forensics Team A', type: 'FORENSICS', status: 'AVAILABLE', specialty: 'Fingerprints/DNA' },
  { id: 'U-FX2', name: 'Cyber Crimes Unit', type: 'FORENSICS', status: 'BUSY', specialty: 'Digital Trace' },
  { id: 'U-K9', name: 'K9 Unit "Rex"', type: 'K9', status: 'AVAILABLE', specialty: 'Tracking' },
  { id: 'U-COR', name: 'Medical Examiner', type: 'CORONER', status: 'ON_SCENE', specialty: 'Autopsy' },
  { id: 'U-SWAT', name: 'SWAT Team 4', type: 'SWAT', status: 'AVAILABLE', specialty: 'Tactical Entry' },
];

export const SolvingTable: React.FC<SolvingTableProps> = ({ activeCase, citizens, onCaseClosed, language }) => {
  const [notes, setNotes] = useState('');
  const [selectedSuspectId, setSelectedSuspectId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [supervisorFeedback, setSupervisorFeedback] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'WARRANT' | 'AI_HELPER'>('WARRANT');
  const [systemOpen, setSystemOpen] = useState(false); // The OS Modal

  // --- PHONE STATE ---
  const [activeCallSuspect, setActiveCallSuspect] = useState<Citizen | null>(null);
  const [callStatus, setCallStatus] = useState<'IDLE' | 'RINGING' | 'CONNECTED' | 'ENDED'>('IDLE');
  const [callTranscript, setCallTranscript] = useState<{sender: 'DISPATCH' | 'CITIZEN' | 'UNIT', text: string}[]>([]);
  const [callInput, setCallInput] = useState('');
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // --- AI HELPER STATE ---
  const [aiChatHistory, setAiChatHistory] = useState<{sender: 'USER' | 'AI', text: string}[]>([
    { sender: 'AI', text: `CAD ASSISTANT v4.0 ONLINE. ${language === 'FI' ? 'Odotetaan kyselyä tapauksesta' : 'Awaiting query regarding case'} ${activeCase.caseNumber}` }
  ]);
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const aiEndRef = useRef<HTMLDivElement>(null);

  // --- SYSTEM OS STATE ---
  const [osTab, setOsTab] = useState<'FILES' | 'CONTACTS'>('FILES');
  const [currentFolderId, setCurrentFolderId] = useState<string>('root');
  const [selectedFile, setSelectedFile] = useState<FileSystemNode | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<PoliceUnit | null>(null);
  const [unitActionInput, setUnitActionInput] = useState('');
  const [unitResponse, setUnitResponse] = useState<string>('');

  // --- FILE SYSTEM DATA (Dynamic based on case) ---
  const [fileSystem, setFileSystem] = useState<FileSystemNode[]>([]);

  useEffect(() => {
    // Initialize Files based on case data
    setFileSystem([
      { id: 'root', name: 'ROOT', type: 'FOLDER', children: [
         { id: 'f1', name: 'POLICE_DB', type: 'FOLDER', parentId: 'root', children: [
             { id: 'warrants', name: 'WARRANTS.db', type: 'FILE', fileType: 'TEXT', content: 'ACTIVE WARRANTS DATABASE\n\nWARNING: AUTHORIZED PERSONNEL ONLY.\n\nCheck suspects against NCIC before arrest.', parentId: 'f1' },
             { id: 'codes', name: 'PENAL_CODES.txt', type: 'FILE', fileType: 'TEXT', content: '187 - Homicide\n211 - Robbery\n459 - Burglary\n415 - Disturbing the Peace', parentId: 'f1' }
         ]},
         { id: 'f2', name: 'MEDICAL_RECORDS', type: 'FOLDER', parentId: 'root', children: activeCase.suspects.map((s, i) => ({
             id: `med_${s.id}`, name: `${s.lastName}_${s.firstName}.med`, type: 'FILE', fileType: 'RECORD', 
             content: `PATIENT: ${s.lastName}, ${s.firstName}\nBLOOD: ${s.bloodType}\nALLERGIES: None\nRECENT VISITS: Routine checkup 3 months ago.`, parentId: 'f2'
         }))},
         { id: 'f3', name: 'CCTV_ARCHIVE', type: 'FOLDER', parentId: 'root', children: [
             { id: 'cctv1', name: 'CAM_01_LOBBY.img', type: 'FILE', fileType: 'IMAGE', content: 'https://picsum.photos/seed/lobby/400/300', parentId: 'f3' },
             { id: 'cctv2', name: 'CAM_02_STREET.img', type: 'FILE', fileType: 'IMAGE', content: 'https://picsum.photos/seed/street/400/300', parentId: 'f3' }
         ]},
         { id: 'f4', name: 'EVIDENCE_LOCKER', type: 'FOLDER', parentId: 'root', children: activeCase.evidence.map(e => ({
             id: `ev_${e.id}`, name: `EVID_${e.id}.log`, type: 'FILE', fileType: 'TEXT', content: `TYPE: ${e.type}\nDESC: ${e.description}\nLOC: ${e.location}\nTIME: ${e.timestamp}`, parentId: 'f4'
         }))}
      ]}
    ]);
  }, [activeCase]);

  // Scroll Effects
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [callTranscript, callStatus]);

  useEffect(() => {
    aiEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [aiChatHistory, aiLoading]);


  // --- TRANSLATIONS ---
  const t = {
    EN: {
      activeIncident: "ACTIVE INCIDENT",
      secureConn: "SECURE CONNECTION ESTABLISHED",
      sceneImage: "INCIDENT SCENE",
      dispatchNotes: "Dispatcher Notes",
      loggedEvidence: "Logged Evidence",
      identifiedPersons: "Identified Persons",
      caseSubmission: "CASE SUBMISSION",
      aiAssistant: "AI ASSISTANT",
      targetSubject: "Target Subject",
      selectSuspect: "Select a suspect from list",
      probableCause: "Probable Cause Statement",
      placeholderReason: "Summarize evidence linking subject to crime...",
      processing: "PROCESSING...",
      submitWarrant: "SUBMIT WARRANT REQUEST",
      askPlaceholder: "Ask about evidence or codes...",
      ask: "ASK",
      commOffline: "COMMUNICATION OFFLINE",
      dialing: "DIALING...",
      callTerminated: "CALL TERMINATED",
      connected: "CONNECTED",
      endCall: "END CALL",
      readyToCall: "Ready to initiate outgoing call...",
      speakToSuspect: "Speak to suspect...",
      selectToCall: "Select a suspect to call...",
      send: "SEND",
      memo: "OFFICIAL MEMORANDUM",
      to: "TO: DISPATCH UNIT",
      from: "FROM: WATCH COMMANDER",
      subject: "SUBJECT: WARRANT APPLICATION REVIEW",
      status: "STATUS",
      approved: "APPROVED",
      denied: "DENIED",
      acknowledge: "ACKNOWLEDGE & CLOSE",
      call: "CALL",
      active: "ACTIVE",
      openSystem: "🖥️ SYSTEM ACCESS",
      systemTitle: "POLICE DEPARTMENT TERMINAL v9.0",
      files: "DATABASE FILES",
      contacts: "UNIT CONTACTS",
      dispatch: "DISPATCH",
      unitResponse: "UNIT RESPONSE",
      dispatchOrder: "Give orders to unit...",
      folderEmpty: "FOLDER IS EMPTY",
      back: "BACK"
    },
    FI: {
      activeIncident: "AKTIIVINEN TAPAUS",
      secureConn: "TURVALLINEN YHTEYS MUODOSTETTU",
      sceneImage: "RIKOSPAIKKA",
      dispatchNotes: "Hätäkeskuksen muistiinpanot",
      loggedEvidence: "Kirjatut todisteet",
      identifiedPersons: "Tunnistetut henkilöt",
      caseSubmission: "TAPAUSRAPORTTI",
      aiAssistant: "TEKOÄLYAVUSTAJA",
      targetSubject: "Kohdehenkilö",
      selectSuspect: "Valitse epäilty listasta",
      probableCause: "Pidätysmääräyksen perusteet",
      placeholderReason: "Tiivistä todisteet jotka yhdistävät epäillyn rikokseen...",
      processing: "KÄSITELLÄÄN...",
      submitWarrant: "LÄHETÄ PIDÄTYSMÄÄRÄYS",
      askPlaceholder: "Kysy todisteista tai koodeista...",
      ask: "KYSY",
      commOffline: "YHTEYS KATKAISTU",
      dialing: "SOITETAAN...",
      callTerminated: "PUHELU PÄÄTTYNYT",
      connected: "YHDISTETTY",
      endCall: "LOPETA",
      readyToCall: "Valmis soittamaan...",
      speakToSuspect: "Puhu epäillylle...",
      selectToCall: "Valitse henkilö...",
      send: "LÄHETÄ",
      memo: "VIRALLINEN MUISTIO",
      to: "VASTAANOTTAJA: HÄTÄKESKUS",
      from: "LÄHETTÄJÄ: VUOROPÄÄLLIKKÖ",
      subject: "AIHE: PIDÄTYSLUVAN TARKISTUS",
      status: "TILA",
      approved: "HYVÄKSYTTY",
      denied: "HYYLÄTTY",
      acknowledge: "KUITTAA & SULJE",
      call: "SOITA",
      active: "AKTIIVINEN",
      openSystem: "🖥️ JÄRJESTELMÄ",
      systemTitle: "POLIISILAITOKSEN TERMINAALI v9.0",
      files: "TIETOKANNAT",
      contacts: "YKSIKÖT",
      dispatch: "LÄHETÄ",
      unitResponse: "YKSIKÖN VASTAUS",
      dispatchOrder: "Anna käsky yksikölle...",
      folderEmpty: "KANSIO TYHJÄ",
      back: "TAKAISIN"
    }
  }[language];

  // --- HANDLERS ---

  // Submit Warrant
  const handleSubmitCase = async () => {
    if (!selectedSuspectId) return;
    setSubmitting(true);
    try {
      const feedback = await submitToSupervisor(activeCase, selectedSuspectId, notes, language);
      setSupervisorFeedback(feedback);
    } catch (e) {
      setSupervisorFeedback("ERROR: Supervisor line unreachable.");
    } finally {
      setSubmitting(false);
    }
  };

  // Phone System
  const initiateCall = (suspect: Citizen) => {
    if (callStatus !== 'IDLE' && activeCallSuspect?.id !== suspect.id) {
      setCallStatus('ENDED');
    }
    setActiveCallSuspect(suspect);
    setCallStatus('RINGING');
    setCallTranscript([]);
    setTimeout(() => {
      setCallStatus('CONNECTED');
      setCallTranscript([{ sender: 'CITIZEN', text: language === 'FI' ? "Haloo? Kuka siellä?" : "Hello? Who is this?" }]);
    }, 2500);
  };

  const sendCallMessage = async () => {
    if (!callInput.trim() || !activeCallSuspect) return;
    const msg = callInput;
    setCallInput('');
    setCallTranscript(prev => [...prev, { sender: 'DISPATCH', text: msg }]);
    
    try {
      const response = await simulatePhoneCall(
        activeCallSuspect, 
        msg, 
        activeCase, 
        callTranscript.map(t => ({ sender: t.sender as string, text: t.text })),
        language
      );
      setCallTranscript(prev => [...prev, { sender: 'CITIZEN', text: response }]);
    } catch (e) {
      setCallTranscript(prev => [...prev, { sender: 'CITIZEN', text: "(Connection Error)" }]);
    }
  };

  // AI Helper System
  const sendAiQuery = async () => {
    if (!aiInput.trim()) return;
    const query = aiInput;
    setAiInput('');
    setAiChatHistory(prev => [...prev, { sender: 'USER', text: query }]);
    setAiLoading(true);

    try {
      const response = await askAIHelper(query, activeCase, language);
      setAiChatHistory(prev => [...prev, { sender: 'AI', text: response }]);
    } catch (e) {
      setAiChatHistory(prev => [...prev, { sender: 'AI', text: "System Error." }]);
    } finally {
      setAiLoading(false);
    }
  };

  // System Handlers
  const getRecursiveFiles = (nodeId: string): FileSystemNode[] => {
    const findNode = (nodes: FileSystemNode[]): FileSystemNode | undefined => {
      for (const node of nodes) {
        if (node.id === nodeId) return node;
        if (node.children) {
          const found = findNode(node.children);
          if (found) return found;
        }
      }
      return undefined;
    };
    const node = findNode(fileSystem);
    return node?.children || [];
  };

  const handleUnitDispatch = async () => {
    if (!selectedUnit || !unitActionInput.trim()) return;
    const instruction = unitActionInput;
    setUnitActionInput('');
    setUnitResponse(language === 'FI' ? "Yksikkö vastaa..." : "Unit responding...");
    
    try {
      const response = await performUnitAction(selectedUnit, instruction, activeCase, language);
      setUnitResponse(response);
    } catch(e) {
      setUnitResponse("COMMS ERROR");
    }
  };


  // --- RENDER HELPERS ---

  const renderSystemModal = () => {
    if (!systemOpen) return null;
    const currentFiles = getRecursiveFiles(currentFolderId);

    return (
       <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-8">
          <div className="bg-slate-900 w-full max-w-5xl h-[80vh] rounded-lg border-2 border-slate-600 shadow-2xl flex flex-col overflow-hidden">
             {/* OS Header */}
             <div className="bg-slate-800 p-4 flex justify-between items-center border-b border-slate-700">
                <div className="flex items-center gap-3">
                   <div className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-400 cursor-pointer" onClick={() => setSystemOpen(false)}></div>
                   <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                   <div className="w-3 h-3 rounded-full bg-green-500"></div>
                   <span className="ml-4 font-mono text-slate-300 font-bold tracking-wider">{t.systemTitle}</span>
                </div>
                <div className="text-xs font-mono text-blue-400 animate-pulse">CONNECTED TO SECURE SERVER</div>
             </div>

             <div className="flex flex-1 overflow-hidden">
                {/* Sidebar */}
                <div className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col">
                   <button 
                     onClick={() => setOsTab('FILES')} 
                     className={`p-4 text-left font-bold border-l-4 hover:bg-slate-900 transition-colors ${osTab === 'FILES' ? 'border-blue-500 text-blue-400 bg-slate-900' : 'border-transparent text-slate-500'}`}
                   >
                     📂 {t.files}
                   </button>
                   <button 
                     onClick={() => setOsTab('CONTACTS')} 
                     className={`p-4 text-left font-bold border-l-4 hover:bg-slate-900 transition-colors ${osTab === 'CONTACTS' ? 'border-green-500 text-green-400 bg-slate-900' : 'border-transparent text-slate-500'}`}
                   >
                     📡 {t.contacts}
                   </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 bg-slate-900 p-6 overflow-hidden flex flex-col">
                   
                   {/* FILES VIEW */}
                   {osTab === 'FILES' && (
                      <div className="flex h-full gap-4">
                         {/* File Browser */}
                         <div className="w-1/2 border border-slate-700 rounded bg-slate-950 flex flex-col">
                            <div className="p-2 border-b border-slate-800 bg-slate-900 flex items-center gap-2">
                               {currentFolderId !== 'root' && (
                                 <button onClick={() => setCurrentFolderId('root')} className="text-xs bg-slate-700 px-2 py-1 rounded text-white hover:bg-slate-600">{t.back}</button>
                               )}
                               <span className="font-mono text-xs text-slate-400">/{currentFolderId.replace('root','home')}</span>
                            </div>
                            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                               {currentFiles.map(node => (
                                 <div 
                                   key={node.id} 
                                   onClick={() => node.type === 'FOLDER' ? setCurrentFolderId(node.id) : setSelectedFile(node)}
                                   className={`p-2 rounded cursor-pointer flex items-center gap-2 text-sm font-mono border border-transparent
                                     ${selectedFile?.id === node.id ? 'bg-blue-900/30 border-blue-800 text-blue-200' : 'hover:bg-slate-800 text-slate-300'}
                                   `}
                                 >
                                   <span>{node.type === 'FOLDER' ? '📁' : (node.fileType === 'IMAGE' ? '🖼️' : '📄')}</span>
                                   {node.name}
                                 </div>
                               ))}
                               {currentFiles.length === 0 && <div className="text-slate-600 text-xs italic p-4">{t.folderEmpty}</div>}
                            </div>
                         </div>
                         {/* File Preview */}
                         <div className="w-1/2 border border-slate-700 rounded bg-black flex flex-col overflow-hidden">
                            {selectedFile ? (
                               <div className="flex flex-col h-full">
                                  <div className="p-2 bg-slate-800 text-white text-xs font-bold border-b border-slate-700">{selectedFile.name}</div>
                                  <div className="flex-1 p-4 overflow-auto">
                                     {selectedFile.fileType === 'IMAGE' ? (
                                        <img src={selectedFile.content} className="max-w-full border border-slate-700" />
                                     ) : (
                                        <pre className="text-green-400 font-mono text-xs whitespace-pre-wrap">{selectedFile.content}</pre>
                                     )}
                                  </div>
                               </div>
                            ) : (
                               <div className="flex items-center justify-center h-full text-slate-600 font-mono text-sm">NO FILE SELECTED</div>
                            )}
                         </div>
                      </div>
                   )}

                   {/* CONTACTS VIEW */}
                   {osTab === 'CONTACTS' && (
                      <div className="flex h-full gap-6">
                         <div className="w-1/3 overflow-y-auto space-y-2 pr-2">
                            {AVAILABLE_UNITS.map(unit => (
                               <div 
                                 key={unit.id} 
                                 onClick={() => { setSelectedUnit(unit); setUnitResponse(''); }}
                                 className={`p-3 rounded border cursor-pointer transition-all
                                   ${selectedUnit?.id === unit.id ? 'bg-slate-800 border-green-500 shadow-[0_0_10px_rgba(34,197,94,0.2)]' : 'bg-slate-950 border-slate-800 hover:border-slate-600'}
                                 `}
                               >
                                  <div className="flex justify-between items-center mb-1">
                                     <span className="font-bold text-slate-200 text-sm">{unit.name}</span>
                                     <span className={`text-[10px] px-1.5 rounded ${unit.status === 'AVAILABLE' ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>{unit.status}</span>
                                  </div>
                                  <div className="text-xs text-slate-500 font-mono">{unit.type} // {unit.specialty}</div>
                               </div>
                            ))}
                         </div>
                         <div className="flex-1 bg-slate-950 rounded border border-slate-800 flex flex-col p-4">
                            {selectedUnit ? (
                               <>
                                  <h3 className="text-lg font-bold text-white mb-1">{selectedUnit.name} <span className="text-sm text-slate-500 font-mono">({selectedUnit.id})</span></h3>
                                  <div className="text-xs text-blue-400 mb-6 font-mono uppercase">SECURE DIGITAL RADIO LINK // ENCRYPTED</div>
                                  
                                  <div className="flex-1 bg-black rounded border border-slate-800 p-4 mb-4 overflow-y-auto font-mono text-sm">
                                     {unitResponse ? (
                                        <div className="text-green-400">
                                           <span className="text-green-700 mr-2">[{selectedUnit.id}]:</span>
                                           {unitResponse}
                                        </div>
                                     ) : (
                                        <div className="text-slate-600 italic">Channel Open...</div>
                                     )}
                                  </div>

                                  <div className="flex gap-2">
                                     <input 
                                       className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 text-white font-mono text-sm focus:border-green-500 outline-none"
                                       placeholder={t.dispatchOrder}
                                       value={unitActionInput}
                                       onChange={(e) => setUnitActionInput(e.target.value)}
                                       onKeyDown={(e) => e.key === 'Enter' && handleUnitDispatch()}
                                     />
                                     <button onClick={handleUnitDispatch} className="bg-green-700 hover:bg-green-600 text-white px-6 py-3 rounded font-bold text-sm uppercase">{t.dispatch}</button>
                                  </div>
                               </>
                            ) : (
                               <div className="flex items-center justify-center h-full text-slate-700">SELECT A UNIT</div>
                            )}
                         </div>
                      </div>
                   )}
                </div>
             </div>
          </div>
       </div>
    );
  };

  // --- MAIN RENDER ---

  if (supervisorFeedback) {
    return (
      <div className="fixed inset-0 bg-slate-900/90 z-50 flex items-center justify-center p-12 backdrop-blur-sm">
        <div className="max-w-2xl w-full bg-white shadow-2xl rounded-lg overflow-hidden border-4 border-slate-300">
          <div className="bg-blue-900 px-6 py-4 flex justify-between items-center">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">{t.memo}</h2>
            <div className="text-blue-200 font-mono text-xs">REF: {activeCase.caseNumber}</div>
          </div>
          <div className="p-10 bg-white text-slate-900 font-mono text-sm leading-relaxed whitespace-pre-wrap">
            {t.to}
            {"\n"}{t.from}
            {"\n"}DATE: {new Date().toLocaleDateString()}
            {"\n"}{t.subject}
            {"\n"}
            ------------------------------------------------
            {"\n"}
            {supervisorFeedback}
            {"\n"}
            ------------------------------------------------
            {"\n"}{t.status}: {supervisorFeedback.includes("Authorized") || supervisorFeedback.includes("Warrant Authorized") || supervisorFeedback.includes("Hyväksyn") ? t.approved : t.denied}
          </div>
          <div className="p-4 bg-slate-100 flex justify-end border-t border-slate-200">
            <button 
              onClick={onCaseClosed}
              className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded shadow-sm text-sm uppercase"
            >
              {t.acknowledge}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-200 text-slate-900 font-sans">
      {renderSystemModal()}

      {/* Header */}
      <div className="h-12 bg-slate-800 text-white flex items-center justify-between px-4 shadow-md z-10 flex-shrink-0">
        <div className="flex items-center gap-4">
           <span className="font-bold text-lg tracking-tight">CAD <span className="text-blue-400">ENTERPRISE</span></span>
           <span className="h-6 w-px bg-slate-600"></span>
           <span className="font-mono text-yellow-400 text-sm animate-pulse uppercase">{t.activeIncident}: {activeCase.caseNumber}</span>
        </div>
        <div className="flex items-center gap-4">
           <button 
             onClick={() => setSystemOpen(true)}
             className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1 rounded text-xs font-bold shadow-lg flex items-center gap-2 transition-transform active:scale-95"
           >
             {t.openSystem}
           </button>
           <div className="text-slate-400 text-xs font-mono uppercase">{t.secureConn}</div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        
        {/* COLUMN 1: CASE CONTEXT (35%) */}
        <div className="w-[35%] flex flex-col border-r border-slate-300 bg-slate-50">
          {/* Scene Image */}
          <div className="h-64 bg-black relative group shrink-0">
            <img src={activeCase.imageUrl} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4 pt-12">
              <h2 className="text-white font-bold text-xl">{activeCase.title}</h2>
              <div className="flex gap-2 mt-1">
                 <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase">{t.sceneImage}</span>
                 <span className="text-slate-300 text-xs font-mono">{activeCase.location}</span>
              </div>
            </div>
          </div>

          {/* Info & Evidence */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
             <div>
               <h3 className="text-xs font-bold text-slate-500 uppercase mb-2 border-b border-slate-200 pb-1">{t.dispatchNotes}</h3>
               <p className="text-sm text-slate-700 bg-white p-3 rounded border border-slate-200 shadow-sm">
                 {activeCase.description}
               </p>
             </div>

             <div>
               <h3 className="text-xs font-bold text-slate-500 uppercase mb-2 border-b border-slate-200 pb-1">{t.loggedEvidence}</h3>
               <div className="space-y-2">
                 {activeCase.evidence.map(ev => (
                   <div key={ev.id} className="bg-white p-3 rounded border-l-4 border-blue-400 shadow-sm text-sm">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-bold text-slate-800">{ev.type}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{ev.timestamp}</span>
                      </div>
                      <div className="text-slate-600">{ev.description}</div>
                   </div>
                 ))}
               </div>
             </div>
          </div>
        </div>

        {/* COLUMN 2: SUSPECTS (30%) */}
        <div className="w-[30%] border-r border-slate-300 bg-slate-100 flex flex-col">
          <div className="p-3 bg-slate-200 border-b border-slate-300 font-bold text-xs text-slate-600 uppercase flex justify-between items-center">
             <span>{t.identifiedPersons}</span>
             <span className="bg-slate-300 px-2 rounded-full text-slate-600">{activeCase.suspects.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {activeCase.suspects.map(suspect => (
              <div 
                key={suspect.id}
                onClick={() => setSelectedSuspectId(suspect.id)}
                className={`bg-white rounded border transition-all relative overflow-hidden group
                  ${selectedSuspectId === suspect.id ? 'border-blue-500 ring-1 ring-blue-500 shadow-md' : 'border-slate-200 hover:border-blue-300'}
                `}
              >
                <div className="flex p-3 gap-3">
                   <img src={suspect.avatarUrl} className="w-16 h-16 object-cover rounded bg-slate-100" />
                   <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <h4 className="font-bold text-slate-800 truncate">{suspect.lastName}, {suspect.firstName}</h4>
                        {activeCallSuspect?.id === suspect.id && callStatus === 'CONNECTED' && (
                           <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" title="On Call"></span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mb-2">{suspect.occupation}</p>
                      <div className="flex gap-2">
                         <button 
                            onClick={(e) => { e.stopPropagation(); initiateCall(suspect); }}
                            className={`flex-1 text-xs font-bold py-1.5 rounded border flex items-center justify-center gap-1 uppercase
                              ${activeCallSuspect?.id === suspect.id && callStatus !== 'ENDED'
                                ? 'bg-green-600 text-white border-green-700' 
                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-green-50 hover:text-green-700 hover:border-green-200'}
                            `}
                         >
                            <span>📞</span> {activeCallSuspect?.id === suspect.id && callStatus !== 'ENDED' ? t.active : t.call}
                         </button>
                      </div>
                   </div>
                </div>
                <div className="px-3 pb-3 pt-0">
                   <div className="text-[10px] bg-slate-50 p-2 rounded border border-slate-100 text-slate-500">
                      <span className="font-bold">ALIBI:</span> {suspect.notes}
                   </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* COLUMN 3: OPERATIONS & COMMS (35%) */}
        <div className="w-[35%] bg-white flex flex-col z-10 shadow-xl">
          
          {/* TOP: TABS AREA (Fixed smaller height to give phone more space) */}
          <div className="h-[40%] flex flex-col border-b-4 border-slate-200">
            <div className="flex border-b border-slate-200 shrink-0">
              <button 
                onClick={() => setActiveTab('WARRANT')}
                className={`flex-1 py-2 text-xs font-bold tracking-wider ${activeTab === 'WARRANT' ? 'bg-white text-blue-600 border-b-2 border-blue-600' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
              >
                {t.caseSubmission}
              </button>
              <button 
                onClick={() => setActiveTab('AI_HELPER')}
                className={`flex-1 py-2 text-xs font-bold tracking-wider ${activeTab === 'AI_HELPER' ? 'bg-white text-purple-600 border-b-2 border-purple-600' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
              >
                {t.aiAssistant}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-0 bg-slate-50 relative">
               {activeTab === 'WARRANT' && (
                <div className="p-4 flex flex-col h-full">
                  <div className="mb-2 shrink-0">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">{t.targetSubject}</label>
                    <div className="p-2 bg-white border border-slate-200 rounded text-xs font-bold text-slate-800 flex items-center justify-between">
                      {selectedSuspectId 
                        ? <span>{activeCase.suspects.find(s => s.id === selectedSuspectId)?.firstName} {activeCase.suspects.find(s => s.id === selectedSuspectId)?.lastName}</span>
                        : <span className="text-slate-400 italic font-normal">{t.selectSuspect}</span>}
                    </div>
                  </div>
                  <div className="flex-1 flex flex-col mb-2 min-h-0">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">{t.probableCause}</label>
                    <textarea
                      className="flex-1 w-full bg-white border border-slate-300 rounded p-2 text-xs text-slate-700 focus:outline-none focus:border-blue-500 resize-none"
                      placeholder={t.placeholderReason}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>
                  <button
                    onClick={handleSubmitCase}
                    disabled={!selectedSuspectId || submitting}
                    className={`w-full py-3 rounded font-bold text-xs tracking-wide transition-all shadow uppercase shrink-0
                      ${!selectedSuspectId 
                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                        : submitting 
                          ? 'bg-amber-400 text-amber-900'
                          : 'bg-red-600 hover:bg-red-700 text-white'
                      }
                    `}
                  >
                    {submitting ? t.processing : t.submitWarrant}
                  </button>
                </div>
              )}

              {activeTab === 'AI_HELPER' && (
                <div className="flex flex-col h-full bg-slate-900">
                   <div className="flex-1 p-3 space-y-2 overflow-y-auto">
                      {aiChatHistory.map((msg, idx) => (
                         <div key={idx} className={`flex ${msg.sender === 'USER' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[90%] p-2 rounded-lg text-xs leading-relaxed shadow-sm ${
                               msg.sender === 'USER' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-bl-none'
                            }`}>
                               {msg.text}
                            </div>
                         </div>
                      ))}
                      {aiLoading && <div className="text-slate-500 text-[10px] italic p-1">System analyzing...</div>}
                      <div ref={aiEndRef} />
                   </div>
                   <div className="p-2 bg-slate-950 border-t border-slate-800 flex gap-2 shrink-0">
                      <input 
                         className="flex-1 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-purple-500"
                         placeholder={t.askPlaceholder}
                         value={aiInput}
                         onChange={(e) => setAiInput(e.target.value)}
                         onKeyDown={(e) => e.key === 'Enter' && sendAiQuery()}
                         disabled={aiLoading}
                      />
                      <button onClick={sendAiQuery} disabled={aiLoading} className="bg-purple-600 text-white px-2 rounded text-[10px] font-bold hover:bg-purple-500 uppercase">{t.ask}</button>
                   </div>
                </div>
              )}
            </div>
          </div>

          {/* BOTTOM: ACTIVE CALL TERMINAL (Fills Remaining Space - Much Bigger) */}
          <div className="flex-1 bg-slate-800 flex flex-col overflow-hidden relative border-t-4 border-slate-900">
             <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-slate-700 via-slate-500 to-slate-700 opacity-20"></div>
             
             {/* Call Status Header */}
             <div className="bg-slate-900 p-2 px-3 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-2">
                   <div className={`w-2 h-2 rounded-full ${callStatus === 'CONNECTED' ? 'bg-green-500 animate-pulse' : callStatus === 'RINGING' ? 'bg-yellow-500 animate-bounce' : 'bg-slate-600'}`}></div>
                   <span className="text-[10px] font-bold text-slate-300 tracking-widest uppercase">
                      {callStatus === 'IDLE' ? t.commOffline : 
                       callStatus === 'RINGING' ? t.dialing : 
                       callStatus === 'ENDED' ? t.callTerminated : 
                       `${t.connected}: ${activeCallSuspect?.lastName.toUpperCase()}`}
                   </span>
                </div>
                {callStatus === 'CONNECTED' && <button onClick={() => setCallStatus('ENDED')} className="text-[10px] text-red-400 font-bold hover:text-red-300 uppercase">{t.endCall}</button>}
             </div>

             {/* Chat Area (Auto-scrolling) */}
             <div className="flex-1 bg-slate-800 p-4 overflow-y-auto space-y-3 border-b border-slate-700 scroll-smooth">
                {callStatus === 'IDLE' ? (
                   <div className="h-full flex flex-col items-center justify-center text-slate-600 text-xs font-mono gap-2">
                      <span className="text-2xl opacity-20">📞</span>
                      <span>{t.readyToCall}</span>
                   </div>
                ) : (
                   callTranscript.map((t, i) => (
                     <div key={i} className={`flex ${t.sender === 'DISPATCH' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[90%] px-3 py-2 rounded-lg text-sm shadow-md ${
                          t.sender === 'DISPATCH' ? 'bg-blue-900 text-blue-100 rounded-br-none' : 'bg-slate-700 text-slate-200 rounded-bl-none'
                        }`}>
                          <span className="font-bold opacity-50 text-[9px] block mb-0.5">{t.sender}</span>
                          {t.text}
                        </div>
                     </div>
                   ))
                )}
                <div ref={transcriptEndRef} />
             </div>

             {/* Input Area */}
             <div className="p-3 bg-slate-900 flex gap-2 shrink-0">
                <input 
                  className="flex-1 bg-slate-800 border border-slate-600 rounded px-3 py-3 text-white text-xs focus:outline-none focus:border-green-500 placeholder:text-slate-600"
                  placeholder={callStatus === 'CONNECTED' ? t.speakToSuspect : t.selectToCall}
                  value={callInput}
                  onChange={(e) => setCallInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendCallMessage()}
                  disabled={callStatus !== 'CONNECTED'}
                />
                <button 
                  onClick={sendCallMessage}
                  disabled={callStatus !== 'CONNECTED'}
                  className="bg-green-700 hover:bg-green-600 disabled:bg-slate-700 disabled:text-slate-500 text-white px-4 rounded text-xs font-bold transition-colors uppercase tracking-wide"
                >
                  {t.send}
                </button>
             </div>
          </div>

        </div>
      </div>
    </div>
  );
};
