
export interface SubtitleItem {
  id: number;
  startTime: string;
  endTime: string;
  text: string;
}

export interface TranslationResponse {
  translations: string[];
}

export interface ProcessingState {
  isProcessing: boolean;
  progress: number;
  currentTask: string;
  error: string | null;
}

export enum AppStep {
  IDLE = 'IDLE',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED'
}
