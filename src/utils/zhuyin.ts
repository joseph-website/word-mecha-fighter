import { convertToMoeZhuyin } from './moeZhuyin';

/**
 * 將中文句子轉成個別字元對應的注音
 */
export interface CharZhuyin {
  char: string;
  zhuyin: string;
}

const PUNCTUATION_REGEX = /[，。？！、；：「」『』—…（）《》〈〉""''.,!?:;()\-_\s]/;

export function getSentenceZhuyin(text: string, existingBopomofo?: string): CharZhuyin[] {
  if (existingBopomofo && existingBopomofo.trim()) {
    const parts = existingBopomofo.trim().split(/\s+/);
    const chars = text.split('');

    // 若提供的注音個數與包含標點的字元長度完全相同，直接 1-對-1 對應
    if (parts.length === chars.length) {
      return chars.map((char, i) => ({
        char,
        zhuyin: parts[i] === '_' || parts[i] === '-' ? '' : parts[i],
      }));
    }

    // 若提供的注音僅對應中文字元（標點不占位），則自動跳過標點依序配對
    let partIdx = 0;
    return chars.map((char) => {
      if (PUNCTUATION_REGEX.test(char) || /[a-zA-Z0-9]/.test(char)) {
        return { char, zhuyin: '' };
      }
      const zh = parts[partIdx++] || '';
      return { char, zhuyin: zh };
    });
  }

  try {
    return convertToMoeZhuyin(text);
  } catch (err) {
    console.error('Failed to convert to zhuyin with MOE standard:', err);
    return text.split('').map((char) => ({ char, zhuyin: '' }));
  }
}

export { convertToMoeZhuyin };
