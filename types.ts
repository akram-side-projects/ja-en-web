
export interface AudioTrack {
  index: number;
  codec: string;
  language?: string;
  title?: string;
  channels?: string;
}

export interface SubtitleItem {
  id: number;
  startTime: string;
  endTime: string;
  text: string;
}

export interface ProcessingState {
  isProcessing: boolean;
  progress: number;
  currentTask: string;
  error: string | null;
}

export enum AppStep {
  IDLE = 'IDLE',
  PROBING = 'PROBING',
  SELECT_TRACK = 'SELECT_TRACK',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED'
}

export interface TranslationResponse {
  translations: string[];
}
