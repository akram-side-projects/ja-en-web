
import { GoogleGenAI, Type } from "@google/genai";
import { TranslationResponse } from '../types';

const BATCH_SIZE = 25; // Batch size optimized for Gemini API prompt efficiency

export const translateTexts = async (
  texts: string[],
  onProgress: (progress: number, partialResults: string[]) => void
): Promise<string[]> => {
  // Fix: Initialize GoogleGenAI client with API key from environment
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const results: string[] = [];
  
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    
    try {
      // Fix: Use gemini-3-pro-preview for advanced linguistic reasoning and context preservation in translation
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Translate the following Japanese subtitle lines into natural, idiomatic English. 
        Maintain the exact same number of lines as provided. 
        Return only a JSON array of strings.
        
        Lines to translate:
        ${JSON.stringify(batch)}`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.STRING,
            },
          },
        },
      });

      // Fix: Access response text property as per current @google/genai SDK guidelines
      const textOutput = response.text || "[]";
      let translations: string[];
      try {
        translations = JSON.parse(textOutput);
      } catch (e) {
        console.error("Gemini JSON parse failed:", textOutput);
        translations = batch.map(() => "[Parsing Error]");
      }
      
      // Fix: Ensure the returned translation count matches the input to prevent timing drift in subtitles
      const validatedBatch = batch.map((_, idx) => translations[idx] || "[Missing Translation]");
      results.push(...validatedBatch);
      
      const currentProgress = Math.min(Math.round(((i + batch.length) / texts.length) * 100), 100);
      onProgress(currentProgress, validatedBatch);
    } catch (error) {
      console.error('Gemini translation failed for batch:', i, error);
      // Fallback for failed batch to maintain SRT sequence alignment
      const errorBatch = batch.map(t => `[Translation Error]`);
      results.push(...errorBatch);
      onProgress(Math.min(Math.round(((i + batch.length) / texts.length) * 100), 100), errorBatch);
    }
  }

  return results;
};