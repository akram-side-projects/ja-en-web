
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const processAudioToSRT = async (
  audioBase64: string,
  mimeType: string,
  onProgress: (progress: number, log: string) => void
): Promise<string> => {
  onProgress(70, "Syncing Neural Linguistic Engine...");

  const prompt = `
    TASK: Japanese-to-English Subtitle Extraction from Audio.
    
    CONTEXT: The provided audio is from a video file. It may contain background noise or music.
    
    INSTRUCTIONS:
    1. Identify all spoken Japanese dialogue.
    2. Transcribe the Japanese text accurately.
    3. Translate the transcription into natural, high-quality conversational English.
    4. Format the final output EXCLUSIVELY as a valid .srt file.
    5. Ensure timestamps are relative to the audio start (00:00:00,000).
    
    STRICT RULE: Return ONLY the SRT text. No preambles, no conversational filler.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: {
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: mimeType,
              data: audioBase64
            }
          }
        ]
      },
      config: {
        temperature: 0.1,
      }
    });

    onProgress(90, "Verifying Linguistic Integrity...");
    const srtContent = response.text || "";
    
    if (!srtContent.includes("-->")) {
      throw new Error("Neural synthesis failed to produce valid SRT blocks.");
    }

    onProgress(100, "SRT Protocol Finalized.");
    return srtContent;

  } catch (error: any) {
    console.error("Gemini AI Error:", error);
    throw new Error(error.message || "Linguistic synthesis failed.");
  }
};
