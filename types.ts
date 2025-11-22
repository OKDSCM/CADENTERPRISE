
export type Language = 'EN' | 'FI';

export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD' | 'INSANE' | 'UNSOLVABLE';

export enum GameState {
  DASHBOARD = 'DASHBOARD',
  ACTIVE_CASE = 'ACTIVE_CASE',
  CITIZEN_DB = 'CITIZEN_DB',
}

export interface Citizen {
  id: string;
  firstName: string;
  lastName: string;
  age: number;
  gender: 'Male' | 'Female';
  occupation: string;
  address: string;
  ssn: string; // Social Security
  phone: string;
  height: string;
  weight: string;
  bloodType: string;
  relationships: string[];
  criminalRecord: string;
  notes: string;
  avatarUrl: string;
  isSuspectInCaseId?: string; // If they are involved in a generated case
  isGuilty?: boolean;
  motive?: string;
  x: number; // Map Coordinate X (0-100)
  y: number; // Map Coordinate Y (0-100)
}

export interface DispatchCall {
  id: number;
  type: string;
  priority: string;
  time: string;
  x: number; // Map Coordinate X (0-100)
  y: number; // Map Coordinate Y (0-100)
}

export interface PhoneTranscript {
  id: string;
  citizenId: string;
  messages: { sender: 'DISPATCH' | 'CITIZEN', text: string }[];
}

export interface Evidence {
  id: string;
  type: 'FORENSIC' | 'DIGITAL' | 'WITNESS' | 'CAMERA';
  description: string;
  location: string;
  timestamp: string;
  relatedSuspectId?: string;
}

export interface CaseData {
  id: string;
  caseNumber: string;
  type: string; // e.g. "ASSAULT", "THEFT"
  title: string;
  description: string;
  location: string;
  imageUrl: string; // Scene image URL
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'IMMEDIATE';
  timestamp: string;
  suspects: Citizen[]; // Suspects are a subset of Citizens
  evidence: Evidence[];
  correctSolution: {
    guiltySuspectId: string;
    reasoning: string;
  };
}

export interface ChatMessage {
  id: string;
  sender: 'DISPATCHER' | 'DATABASE' | 'SUPERVISOR' | 'AI_HELPER';
  text: string;
  timestamp: number;
  isSystem?: boolean;
}

export interface Emergency {
  id: string;
  type: 'DECISION' | 'TRACKING';
  title: string;
  description: string;
  options?: { label: string; correct: boolean }[];
  duration: number; // seconds
  active: boolean;
}

// --- NEW TYPES FOR SYSTEM UPDATE ---

export interface PoliceUnit {
  id: string;
  name: string;
  type: 'FORENSICS' | 'SWAT' | 'K9' | 'CORONER' | 'PATROL';
  status: 'AVAILABLE' | 'BUSY' | 'ON_SCENE';
  specialty: string;
}

export interface FileSystemNode {
  id: string;
  name: string;
  type: 'FOLDER' | 'FILE';
  fileType?: 'TEXT' | 'IMAGE' | 'RECORD' | 'VIDEO';
  content?: string;
  children?: FileSystemNode[];
  parentId?: string;
}

export interface MapConfig {
  id: string;
  name: string;
  url: string;
}
