
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
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
