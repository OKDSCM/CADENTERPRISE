
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { CaseData, Citizen, Language } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const SCENE_IMAGES = [
  "https://i.postimg.cc/BQXSX1zB/image.png",
  "https://i.postimg.cc/PJckm2cH/image.png",
  "https://i.postimg.cc/jdJpp6mR/image.png",
  "https://i.postimg.cc/85X8SZTs/image.png",
  "https://i.postimg.cc/MTnwXCPG/image.png",
  "https://i.postimg.cc/FKB5tPrh/image.png",
  "https://i.postimg.cc/sXgFqkdP/image.png",
  "https://i.postimg.cc/sgjtMFx8/image.png"
];

// Schema for generating realistic cases
const CASE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    type: { type: Type.STRING, description: "Crime type: BURGLARY, ASSAULT, VANDALISM, MISSING PERSON, NOISE COMPLAINT" },
    title: { type: Type.STRING, description: "Short police code or incident name (e.g. 459 Burglary)" },
    caseNumber: { type: Type.STRING, description: "Format: 24-XXXX" },
    description: { type: Type.STRING, description: "The initial 911 call transcript or officer field report." },
    location: { type: Type.STRING, description: "Address or location name." },
    priority: { type: Type.STRING, enum: ["LOW", "MEDIUM", "HIGH", "IMMEDIATE"] },
    timestamp: { type: Type.STRING, description: "Time of incident (24h format)" },
    suspects: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          firstName: { type: Type.STRING },
          lastName: { type: Type.STRING },
          age: { type: Type.NUMBER },
          occupation: { type: Type.STRING },
          address: { type: Type.STRING },
          criminalRecord: { type: Type.STRING, description: "Prior history or 'None'" },
          notes: { type: Type.STRING, description: "Alibi or initial statement" },
          isGuilty: { type: Type.BOOLEAN }, // Internal flag
          motive: { type: Type.STRING }, // Internal logic
        },
        required: ["id", "firstName", "lastName", "age", "occupation", "address", "criminalRecord", "notes", "isGuilty", "motive"],
      },
    },
    evidence: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          type: { type: Type.STRING, enum: ["FORENSIC", "DIGITAL", "WITNESS", "CAMERA"] },
          description: { type: Type.STRING },
          location: { type: Type.STRING },
          timestamp: { type: Type.STRING },
          relatedSuspectId: { type: Type.STRING },
        },
        required: ["id", "type", "description", "location", "timestamp"],
      },
    },
    correctSolution: {
      type: Type.OBJECT,
      properties: {
        guiltySuspectId: { type: Type.STRING },
        reasoning: { type: Type.STRING, description: "Why they are guilty based on evidence." },
      },
      required: ["guiltySuspectId", "reasoning"],
    },
  },
  required: ["type", "title", "caseNumber", "description", "location", "priority", "timestamp", "suspects", "evidence", "correctSolution"],
};

export const generateCase = async (lang: Language): Promise<CaseData> => {
  const langInstruction = lang === 'FI' ? "GENERATE ALL CONTENT IN FINNISH (SUOMI). Use Finnish names for locations/people if appropriate." : "Generate content in English.";

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Generate a realistic urban police investigation case. No sci-fi. Realistic crimes only. 3 to 4 suspects. Only 1 is guilty. Make the evidence subtle but solvable. ${langInstruction}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: CASE_SCHEMA,
        temperature: 0.9,
      },
    });

    const data = JSON.parse(response.text || "{}");
    
    // Enhance suspect data to match the 'Citizen' type completely
    const enhancedSuspects = data.suspects.map((s: any) => ({
      ...s,
      gender: Math.random() > 0.5 ? 'Male' : 'Female',
      ssn: `${Math.floor(100+Math.random()*899)}-${Math.floor(10+Math.random()*89)}-${Math.floor(1000+Math.random()*8999)}`,
      phone: `555-${Math.floor(100+Math.random()*899)}-${Math.floor(1000+Math.random()*8999)}`,
      height: `${5 + Math.floor(Math.random()*2)}'${Math.floor(Math.random()*11)}"`,
      weight: `${140 + Math.floor(Math.random()*100)} lbs`,
      bloodType: ['A+', 'O+', 'B-', 'AB+'][Math.floor(Math.random()*4)],
      relationships: ["Unknown"],
      avatarUrl: `https://ui-avatars.com/api/?name=${s.firstName}+${s.lastName}&background=random`,
      isSuspectInCaseId: data.id,
    }));

    // Select random scene image
    const randomImage = SCENE_IMAGES[Math.floor(Math.random() * SCENE_IMAGES.length)];

    return { ...data, id: crypto.randomUUID(), suspects: enhancedSuspects, imageUrl: randomImage };
  } catch (error) {
    console.error("Failed to generate case:", error);
    throw error;
  }
};

export const simulatePhoneCall = async (
  citizen: Citizen, 
  message: string, 
  activeCase: CaseData | null,
  chatHistory: {sender: string, text: string}[],
  lang: Language
): Promise<string> => {
  
  const langInstruction = lang === 'FI' ? "REPLY IN FINNISH (SUOMI)." : "Reply in English.";

  // Is this person involved in the active case?
  const isSuspect = activeCase?.suspects.find(s => s.id === citizen.id);
  const contextInfo = isSuspect 
    ? `YOU ARE A SUSPECT in the case: ${activeCase?.title}. 
       Your secret status: ${isSuspect.isGuilty ? "GUILTY" : "INNOCENT"}.
       Your secret motive/alibi: ${isSuspect.notes}.
       The police are calling you. If guilty, be defensive or lie. If innocent, be helpful but nervous.`
    : `You are a random citizen named ${citizen.firstName} ${citizen.lastName}. 
       You work as a ${citizen.occupation}. 
       You have NO knowledge of any crime. 
       A police dispatcher is calling you randomly. You should be confused, annoyed, or helpful depending on your mood. 
       Ask why they are calling you.`;

  const context = `
    Roleplay Instruction:
    ${contextInfo}
    ${langInstruction}
    
    Conversation History:
    ${chatHistory.map(m => `${m.sender}: ${m.text}`).join('\n')}
    
    Dispatcher: "${message}"
    
    Reply as ${citizen.firstName}. Keep it short and realistic (under 30 words). Spoken style.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: context,
  });

  return response.text || "(Line disconnected)";
};

export const askAIHelper = async (query: string, currentCase: CaseData, lang: Language): Promise<string> => {
  const langInstruction = lang === 'FI' ? "REPLY IN FINNISH (SUOMI)." : "Reply in English.";

  const context = `
    You are a POLICE AI ASSISTANT (CAD System Helper).
    ${langInstruction}
    
    Current Case Context:
    Crime: ${currentCase.title}
    Desc: ${currentCase.description}
    Evidence: ${JSON.stringify(currentCase.evidence)}
    Suspects: ${currentCase.suspects.map(s => s.firstName + ' ' + s.lastName + ' (' + s.occupation + ')').join(', ')}

    User Query: "${query}"

    Instructions:
    - Answer helpfuly based on police procedures and the facts above.
    - Do NOT reveal who is guilty. Help the user deduct it.
    - Be concise, professional, and robotic.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: context,
  });

  return response.text || "System offline.";
}

export const submitToSupervisor = async (currentCase: CaseData, userAccusationId: string, userNotes: string, lang: Language): Promise<string> => {
  const guilty = currentCase.suspects.find(s => s.isGuilty);
  const accused = currentCase.suspects.find(s => s.id === userAccusationId);
  const langInstruction = lang === 'FI' ? "REPLY IN FINNISH (SUOMI)." : "Reply in English.";

  const context = `
    You are the WATCH COMMANDER (Police Supervisor).
    Dispatcher is requesting an ARREST WARRANT.
    ${langInstruction}

    Case Facts:
    Guilty Party: ${guilty?.firstName} ${guilty?.lastName}
    Reasoning: ${currentCase.correctSolution.reasoning}

    Dispatcher Request:
    Suspect: ${accused?.firstName} ${accused?.lastName}
    Evidence Notes: ${userNotes}

    Task:
    1. If Dispatcher is CORRECT: Approve. "Warrant Authorized. Good work."
    2. If WRONG: Deny. Explain succinctly why the evidence doesn't fit. Be professional and stern.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: context,
  });

  return response.text || "Supervisor is offline.";
};
