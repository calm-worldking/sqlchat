'use client';

interface Settings {
  contextLength: number;
  // Add more settings here as needed
}

interface ColumnInfo {
  table_name: string;
  column_name: string;
  data_type: string;
  is_nullable: string;
  suggested_content: string;
  confidence: number;
  empty_description: boolean;
}

// Storage keys
const SESSION_ID_KEY = 'sql_chat_session_id';
const SETTINGS_KEY = 'sql_chat_settings';
const COLUMN_ANALYSIS_KEY = 'sql_chat_column_analysis';

// Get session ID from storage or create a new one
export const getSessionId = (): string => {
  if (typeof window === 'undefined') return '';

  let sessionId = localStorage.getItem(SESSION_ID_KEY);
  
  if (!sessionId) {
    sessionId = generateSessionId();
    localStorage.setItem(SESSION_ID_KEY, sessionId);
  }
  
  return sessionId;
};

// Generate a new session ID
export const generateSessionId = (): string => {
  return 'session_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

// Get settings from storage or use defaults
export const getSettings = (): Settings => {
  if (typeof window === 'undefined') {
    return { contextLength: 5 };
  }

  const settingsJson = localStorage.getItem(SETTINGS_KEY);
  
  if (!settingsJson) {
    return { contextLength: 5 };
  }
  
  try {
    return JSON.parse(settingsJson);
  } catch (error) {
    console.error('Failed to parse settings from localStorage:', error);
    return { contextLength: 5 };
  }
};

// Save settings to storage
export const saveSettings = (settings: Settings): void => {
  if (typeof window === 'undefined') return;
  
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
};

// Get column analysis data from storage
export const getColumnAnalysis = (): ColumnInfo[] => {
  if (typeof window === 'undefined') {
    return [];
  }

  const analysisJson = localStorage.getItem(COLUMN_ANALYSIS_KEY);
  
  if (!analysisJson) {
    return [];
  }
  
  try {
    return JSON.parse(analysisJson);
  } catch (error) {
    console.error('Failed to parse column analysis from localStorage:', error);
    return [];
  }
};

// Save column analysis data to storage
export const saveColumnAnalysis = (analysisData: ColumnInfo[]): void => {
  if (typeof window === 'undefined') return;
  
  localStorage.setItem(COLUMN_ANALYSIS_KEY, JSON.stringify(analysisData));
};

// Clear column analysis data from storage
export const clearColumnAnalysis = (): void => {
  if (typeof window === 'undefined') return;
  
  localStorage.removeItem(COLUMN_ANALYSIS_KEY);
}; 