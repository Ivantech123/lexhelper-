
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

// --- Telegram Web App Types ---
export interface TelegramWebApp {
  initData: string;
  initDataUnsafe: {
    query_id: string;
    user?: {
      id: number;
      first_name: string;
      last_name?: string;
      username?: string;
      language_code?: string;
      photo_url?: string; // Added photo_url
    };
    auth_date: string;
    hash: string;
    start_param?: string;
  };
  version: string;
  platform: string;
  colorScheme: 'light' | 'dark';
  themeParams: {
    bg_color?: string;
    text_color?: string;
    hint_color?: string;
    link_color?: string;
    button_color?: string;
    button_text_color?: string;
    secondary_bg_color?: string;
  };
  isExpanded: boolean;
  viewportHeight: number;
  viewportStableHeight: number;
  headerColor: string;
  backgroundColor: string;
  BackButton: {
    isVisible: boolean;
    onClick: (cb: () => void) => void;
    offClick: (cb: () => void) => void;
    show: () => void;
    hide: () => void;
  };
  MainButton: {
    text: string;
    color: string;
    textColor: string;
    isVisible: boolean;
    isActive: boolean;
    isProgressVisible: boolean;
    setText: (text: string) => void;
    onClick: (cb: () => void) => void;
    offClick: (cb: () => void) => void;
    show: () => void;
    hide: () => void;
    enable: () => void;
    disable: () => void;
    showProgress: (leaveActive: boolean) => void;
    hideProgress: () => void;
  };
  HapticFeedback: {
    impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
    notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
    selectionChanged: () => void;
  };
  ready: () => void;
  expand: () => void;
  close: () => void;
  setHeaderColor: (color: string) => void;
  onEvent: (eventType: string, eventHandler: () => void) => void;
  offEvent: (eventType: string, eventHandler: () => void) => void;
}

declare global {
  interface Window {
    Telegram: {
      WebApp: TelegramWebApp;
    };
  }
}

// --- App Types ---

export enum MessageSender {
  USER = 'user',
  MODEL = 'model',
  SYSTEM = 'system',
}

export interface UrlContextMetadataItem {
  retrievedUrl: string;
  urlRetrievalStatus: string;
}

export interface ChatMessage {
  id: string;
  text: string;
  sender: MessageSender;
  timestamp: Date;
  isLoading?: boolean;
  urlContext?: UrlContextMetadataItem[];
}

export interface URLGroup {
  id: string;
  name: string;
  urls: string[];
}

export interface UploadedFile {
  name: string;
  type: string;
  data: string; // Base64
}

// Expanded Types for Full Expert System
export interface LegalAnalysisResult {
  summary: string;
  reasoningTrace: string[]; 
  strengths: string[];
  risks: string[];
  legalStrengthScore: number; 
  
  clarifyingQuestions?: string[];

  evidenceAssessment: {
    present: string[]; 
    missing: string[]; 
  };
  deadlines: {
    status: string; 
    info: string;   
  };
  strategy: {
    negotiation: string; 
    court: string;       
  };
  recommendedDocuments: string[]; 
}

// New: History Persistence
export interface HistoryItem {
  id: string;
  date: number;
  categoryName: string;
  roleName: string;
  score: number;
  summary: string;
  result: LegalAnalysisResult;
}

export interface RoleOption {
  id: string;
  label: string;
}

export interface CategoryDef {
  id: string;
  name: string;
  desc: string;
  icon: any;
  roles: RoleOption[];
  questions: { id: string; text: string }[];
}
