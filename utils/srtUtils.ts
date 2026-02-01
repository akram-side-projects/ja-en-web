
import { SubtitleItem } from '../types';

/**
 * Parses an SRT string into an array of SubtitleItem objects.
 */
export const parseSRT = (content: string): SubtitleItem[] => {
  const items: SubtitleItem[] = [];
  const normalizedContent = content.replace(/\r\n/g, '\n').trim();
  const blocks = normalizedContent.split(/\n\s*\n/);

  blocks.forEach((block) => {
    const lines = block.split('\n');
    if (lines.length >= 3) {
      const idStr = lines[0].trim();
      const timeLine = lines[1].trim();
      const text = lines.slice(2).join('\n').trim();

      const timeMatch = timeLine.match(/(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})/);
      
      if (timeMatch && !isNaN(Number(idStr))) {
        items.push({
          id: parseInt(idStr, 10),
          startTime: timeMatch[1],
          endTime: timeMatch[2],
          text,
        });
      }
    }
  });

  return items;
};

/**
 * Converts an array of SubtitleItem objects back into an SRT string.
 */
export const generateSRT = (items: SubtitleItem[]): string => {
  return items
    .map((item) => {
      return `${item.id}\n${item.startTime} --> ${item.endTime}\n${item.text}\n`;
    })
    .join('\n');
};

/**
 * Downloads a string as a file.
 */
export const downloadBlob = (content: string, filename: string) => {
  // Fix: Access DOM-related globals via globalThis to handle cases where they are not in the current global scope
  const blob = new (globalThis as any).Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = (globalThis as any).URL.createObjectURL(blob);
  const link = (globalThis as any).document.createElement('a');
  link.href = url;
  link.download = filename;
  (globalThis as any).document.body.appendChild(link);
  link.click();
  (globalThis as any).document.body.removeChild(link);
  (globalThis as any).URL.revokeObjectURL(url);
};