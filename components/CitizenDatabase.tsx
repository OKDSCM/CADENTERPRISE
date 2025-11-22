
import React, { useState, useEffect } from 'react';
import { Citizen, PhoneTranscript, CaseData, Language } from '../types';
import { simulatePhoneCall } from '../services/geminiService';

interface CitizenDatabaseProps {
  citizens: Citizen[];
  onBack: () => void;
  activeCase: CaseData | null;
  language: Language;
}

export const CitizenDatabase: React.FC<CitizenDatabaseProps> = ({ citizens, onBack, activeCase, language }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCitizen, setSelectedCitizen] = useState<Citizen | null>(null);
  const [calling, setCalling] = useState(false);
  const [transcript, setTranscript] = useState<{sender: 'DISPATCH' | 'CITIZEN', text: string}[]>([]);
  const [inputMsg, setInputMsg] = useState('');
  const [callStatus, setCallStatus] = useState<'IDLE' | 'RINGING' | 'CONNECTED' | 'ENDED'>('IDLE');

  // --- TRANSLATIONS ---
  const t = {
    EN: {
      back: "← BACK",
      dbTitle: "NCIC CITIZEN DATABASE",
      searchPlaceholder: "Search Name, SSN, or ID...",
      recordsFound: "RECORDS FOUND",
      initiateCall: "📞 INITIATE CALL",
      noConnection: "NO ACTIVE CONNECTION",
      dialing: "DIALING...",
      secureLine: "SECURE LINE",
      hangUp: "HANG UP",
      callEnded: "-- CALL ENDED --",
      speak: "Speak...",
      send: "SEND",
      selectRecord: "Select a citizen record",
      residence: "Residence",
      criminalRecord: "Criminal Record",
      relationships: "Relationships",
      notes: "Notes",
      height: "HEIGHT",
      weight: "WEIGHT",
      blood: "BLOOD",
      phone: "PHONE",
      sex: "SEX",
      age: "AGE"
    },
    FI: {
      back: "← TAKAISIN",
      dbTitle: "KANSALAISTIETOKANTA (NCIC)",
      searchPlaceholder: "Hae nimeä, hetua tai ID:tä...",
      recordsFound: "TIETUETTA LÖYTYI",
      initiateCall: "📞 SOITA",
      noConnection: "EI AKTIIVISTA YHTEYTTÄ",
      dialing: "SOITETAAN...",
      secureLine: "TURVALINJA",
      hangUp: "LOPETA",
      callEnded: "-- PUHELU PÄÄTTYNYT --",
      speak: "Puhu...",
      send: "LÄHETÄ",
      selectRecord: "Valitse henkilö listasta",
      residence: "Asuinpaikka",
      criminalRecord: "Rikosrekisteri",
      relationships: "Suhteet",
      notes: "Muistiinpanot",
      height: "PITUUS",
      weight: "PAINO",
      blood: "VERIRYHMÄ",
      phone: "PUH",
      sex: "SUKUPUOLI",
      age: "IKÄ"
    }
  }[language];

  const filtered = citizens.filter(c => 
    (c.firstName.toLowerCase() + ' ' + c.lastName.toLowerCase()).includes(searchTerm.toLowerCase()) ||
    c.ssn.includes(searchTerm) ||
    c.id.includes(searchTerm)
  );

  const handleCall = () => {
    setCallStatus('RINGING');
    setTimeout(() => {
      setCallStatus('CONNECTED');
      setTranscript([{ sender: 'CITIZEN', text: language === 'FI' ? "Haloo? Kuka siellä?" : "Hello? Who is this?" }]);
    }, 2000);
  };

  const handleSendMessage = async () => {
    if (!inputMsg.trim() || !selectedCitizen) return;
    const msg = inputMsg;
    setInputMsg('');
    setTranscript(prev => [...prev, { sender: 'DISPATCH', text: msg }]);
    
    try {
      const response = await simulatePhoneCall(
        selectedCitizen, 
        msg, 
        activeCase, 
        transcript.map(t => ({ sender: t.sender, text: t.text })),
        language
      );
      setTranscript(prev => [...prev, { sender: 'CITIZEN', text: response }]);
    } catch (e) {
      setTranscript(prev => [...prev, { sender: 'CITIZEN', text: "(Connection Error)" }]);
    }
  };

  return (
    <div className="h-full flex bg-slate-100 text-slate-900 font-sans">
      {/* Left: List */}
      <div className="w-1/3 bg-white border-r border-slate-300 flex flex-col">
        <div className="p-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2 mb-4">
            <button onClick={onBack} className="text-slate-500 hover:text-slate-800 font-bold uppercase">{t.back}</button>
            <h2 className="text-lg font-bold text-slate-800 uppercase">{t.dbTitle}</h2>
          </div>
          <input 
            className="w-full p-2 border border-slate-300 rounded bg-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder={t.searchPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div className="text-xs text-slate-500 mt-2 text-right uppercase">
            {filtered.length} {t.recordsFound}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.map(citizen => (
            <div 
              key={citizen.id}
              onClick={() => { setSelectedCitizen(citizen); setTranscript([]); setCallStatus('IDLE'); }}
              className={`p-3 border-b border-slate-100 cursor-pointer hover:bg-blue-50 flex items-center gap-3
                ${selectedCitizen?.id === citizen.id ? 'bg-blue-100 border-blue-200' : ''}
              `}
            >
              <div className="w-8 h-8 rounded-full bg-slate-300 flex items-center justify-center text-xs font-bold text-slate-600 overflow-hidden">
                <img src={citizen.avatarUrl} className="w-full h-full object-cover" />
              </div>
              <div>
                <div className="font-bold text-sm text-slate-800">{citizen.firstName} {citizen.lastName}</div>
                <div className="text-xs text-slate-500">{citizen.occupation} | {citizen.age}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right: Details */}
      <div className="flex-1 bg-slate-100 flex flex-col overflow-hidden">
        {selectedCitizen ? (
          <div className="h-full flex flex-col">
            {/* Detail Header */}
            <div className="p-6 bg-white shadow-sm border-b border-slate-200 flex justify-between items-start">
              <div className="flex gap-6">
                <img src={selectedCitizen.avatarUrl} className="w-32 h-32 rounded bg-slate-200 object-cover border border-slate-300" />
                <div>
                  <h1 className="text-3xl font-bold text-slate-800 mb-1">{selectedCitizen.lastName}, {selectedCitizen.firstName}</h1>
                  <div className="flex gap-2 mb-4">
                    <span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded text-xs font-bold">ID: {selectedCitizen.id}</span>
                    <span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded text-xs font-bold">SSN: {selectedCitizen.ssn}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm text-slate-600">
                    <div><span className="font-bold text-slate-400 w-20 inline-block uppercase">{t.age}:</span> {selectedCitizen.age}</div>
                    <div><span className="font-bold text-slate-400 w-20 inline-block uppercase">{t.sex}:</span> {selectedCitizen.gender}</div>
                    <div><span className="font-bold text-slate-400 w-20 inline-block uppercase">{t.height}:</span> {selectedCitizen.height}</div>
                    <div><span className="font-bold text-slate-400 w-20 inline-block uppercase">{t.weight}:</span> {selectedCitizen.weight}</div>
                    <div><span className="font-bold text-slate-400 w-20 inline-block uppercase">{t.blood}:</span> {selectedCitizen.bloodType}</div>
                    <div><span className="font-bold text-slate-400 w-20 inline-block uppercase">{t.phone}:</span> {selectedCitizen.phone}</div>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <button 
                  onClick={handleCall}
                  disabled={callStatus !== 'IDLE'}
                  className={`px-6 py-3 rounded font-bold shadow text-sm flex items-center gap-2 uppercase
                    ${callStatus === 'IDLE' ? 'bg-green-600 hover:bg-green-500 text-white' : 'bg-slate-300 text-slate-500'}
                  `}
                >
                   {t.initiateCall}
                </button>
              </div>
            </div>

            <div className="flex-1 p-6 flex gap-6 overflow-hidden">
              {/* Additional Info */}
              <div className="w-1/2 space-y-4 overflow-y-auto pr-2">
                <div className="bg-white p-4 rounded border border-slate-200">
                  <h3 className="font-bold text-slate-400 text-xs uppercase mb-2">{t.residence}</h3>
                  <p className="text-slate-800 font-mono text-sm">{selectedCitizen.address}</p>
                </div>
                <div className="bg-white p-4 rounded border border-slate-200">
                  <h3 className="font-bold text-slate-400 text-xs uppercase mb-2">{t.criminalRecord}</h3>
                  <p className="text-red-700 font-mono text-sm">{selectedCitizen.criminalRecord}</p>
                </div>
                <div className="bg-white p-4 rounded border border-slate-200">
                  <h3 className="font-bold text-slate-400 text-xs uppercase mb-2">{t.relationships}</h3>
                  <ul className="list-disc list-inside text-sm text-slate-700">
                    {selectedCitizen.relationships.map((r,i) => <li key={i}>{r}</li>)}
                  </ul>
                </div>
                <div className="bg-white p-4 rounded border border-slate-200">
                  <h3 className="font-bold text-slate-400 text-xs uppercase mb-2">{t.notes}</h3>
                  <p className="text-slate-600 text-sm">{selectedCitizen.notes}</p>
                </div>
              </div>

              {/* Phone UI */}
              <div className="w-1/2 bg-slate-800 rounded-xl shadow-inner border border-slate-700 flex flex-col overflow-hidden relative">
                {callStatus === 'IDLE' && (
                  <div className="absolute inset-0 flex items-center justify-center text-slate-500 font-mono text-sm uppercase">
                    {t.noConnection}
                  </div>
                )}
                {callStatus === 'RINGING' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 z-20">
                    <div className="w-16 h-16 rounded-full bg-green-500 animate-ping mb-4"></div>
                    <div className="text-white font-bold animate-pulse uppercase">{t.dialing}</div>
                    <div className="text-slate-400 text-xs mt-2">{selectedCitizen.phone}</div>
                  </div>
                )}
                
                <div className="bg-slate-900 p-3 border-b border-slate-700 flex justify-between items-center">
                   <div className="flex items-center gap-2">
                     <div className={`w-2 h-2 rounded-full ${callStatus === 'CONNECTED' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                     <span className="text-white text-xs font-bold tracking-wider uppercase">{t.secureLine}</span>
                   </div>
                   {callStatus === 'CONNECTED' && <button onClick={() => setCallStatus('ENDED')} className="text-red-400 text-xs font-bold hover:text-red-300 uppercase">{t.hangUp}</button>}
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-800">
                  {transcript.map((t, i) => (
                     <div key={i} className={`flex ${t.sender === 'DISPATCH' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] p-2 rounded text-sm ${
                          t.sender === 'DISPATCH' ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-900'
                        }`}>
                          {t.text}
                        </div>
                     </div>
                  ))}
                  {callStatus === 'ENDED' && <div className="text-center text-slate-500 text-xs my-4 uppercase">{t.callEnded}</div>}
                </div>

                <div className="p-3 bg-slate-900 border-t border-slate-700 flex gap-2">
                  <input 
                    className="flex-1 bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                    placeholder={t.speak}
                    value={inputMsg}
                    onChange={(e) => setInputMsg(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    disabled={callStatus !== 'CONNECTED'}
                  />
                  <button 
                    onClick={handleSendMessage}
                    disabled={callStatus !== 'CONNECTED'}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-4 rounded text-sm font-bold disabled:opacity-50 uppercase"
                  >
                    {t.send}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-slate-400">
            <div className="text-center">
              <div className="text-6xl mb-4">📂</div>
              <p className="font-bold uppercase">{t.selectRecord}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
