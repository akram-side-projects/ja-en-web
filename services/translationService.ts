
import { TranslationResponse } from '../types';

const TRANSLATION_API_URL = 'https://storyglow-ja-en-subtitle-api.hf.space/translate';
const BATCH_SIZE = 25; // Safe batch size for translation API

export const translateTexts = async (
  texts: string[],
  onProgress: (progress: number, partialResults: string[]) => void
): Promise<string[]> => {
  const results: string[] = [];
  
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    
    try {
      const response = await fetch(TRANSLATION_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: batch }),
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
      }

      const data: TranslationResponse = await response.json();
      results.push(...data.translations);
      
      const currentProgress = Math.min(Math.round(((i + batch.length) / texts.length) * 100), 100);
      // Pass both progress and the newly translated strings
      onProgress(currentProgress, data.translations);
    } catch (error) {
      console.error('Translation failed for batch:', i, error);
      // Fallback for failed batch to maintain alignment
      const errorBatch = batch.map(t => `[Translation Error]`);
      results.push(...errorBatch);
      onProgress(Math.min(Math.round(((i + batch.length) / texts.length) * 100), 100), errorBatch);
    }
  }

  return results;
};
