export type RiskLevel = 'low' | 'medium' | 'high';

export interface AnalysisResult {
  id: string;
  timestamp: number;
  fileName: string;
  riskScore: number;
  voiceAuthenticity: number;
  scamIntent: number;
  keywords: string[];
  confidence: number;
  status: 'Safe' | 'Suspicious' | 'High Risk';
}

export type Page = 'splash' | 'about' | 'login' | 'signup' | 'upload' | 'result' | 'dashboard';
