import { QuestionItem, Difficulty, QuestionCount } from '../types';
import defaultQuestionsData from './defaultQuestions.json';

const CUSTOM_QUESTIONS_KEY = 'chinese_typing_custom_questions_v23';

export const defaultQuestions: QuestionItem[] = defaultQuestionsData as QuestionItem[];

export function getStoredQuestions(): QuestionItem[] {
  try {
    const raw = localStorage.getItem(CUSTOM_QUESTIONS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to load custom questions from localStorage:', e);
  }
  return defaultQuestions;
}

export function saveStoredQuestions(questions: QuestionItem[]): void {
  localStorage.setItem(CUSTOM_QUESTIONS_KEY, JSON.stringify(questions, null, 2));
}

export function resetToDefaultQuestions(): QuestionItem[] {
  localStorage.removeItem(CUSTOM_QUESTIONS_KEY);
  return defaultQuestions;
}

/**
 * 隨機抽取指定難度與數量的題目
 */
export function getRandomQuestions(
  pool: QuestionItem[],
  difficulty: Difficulty,
  count: QuestionCount
): QuestionItem[] {
  const effectivePool = pool && pool.length > 0 ? pool : defaultQuestions;
  let filtered = effectivePool;
  if (difficulty !== 'all') {
    filtered = effectivePool.filter((q) => q.difficulty === difficulty);
  }

  // 若該難度題庫不足，自動補入其他題目避免崩潰
  if (filtered.length < count) {
    filtered = [...effectivePool];
  }

  // 洗牌演算法 (Fisher-Yates)
  const shuffled = [...filtered].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * 驗證傳入的 JSON 題庫格式是否合法
 */
export function validateQuestionBank(jsonString: string): { valid: boolean; error?: string; data?: QuestionItem[] } {
  try {
    const parsed = JSON.parse(jsonString);
    if (!Array.isArray(parsed)) {
      return { valid: false, error: '題庫必須為 JSON 陣列 (Array)。' };
    }
    if (parsed.length === 0) {
      return { valid: false, error: '題庫陣列不能為空。' };
    }

    const validated: QuestionItem[] = [];
    for (let i = 0; i < parsed.length; i++) {
      const item = parsed[i];
      if (!item || typeof item !== 'object') {
        return { valid: false, error: `第 ${i + 1} 項資料格式不正確。` };
      }
      if (!item.text || typeof item.text !== 'string' || item.text.trim() === '') {
        return { valid: false, error: `第 ${i + 1} 項缺少 text (字串內容)。` };
      }

      const diff = ['easy', 'medium', 'hard'].includes(item.difficulty) ? item.difficulty : 'easy';
      validated.push({
        id: item.id || `custom-${Date.now()}-${i}`,
        text: item.text.trim(),
        pinyin: item.pinyin || '',
        bopomofo: item.bopomofo || '',
        category: item.category || '自訂題庫',
        difficulty: diff,
        meaning: item.meaning || '',
      });
    }

    return { valid: true, data: validated };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'JSON 格式解析失敗';
    return { valid: false, error: `JSON 格式錯誤: ${message}` };
  }
}

/**
 * 解析 Excel / CSV 文字為題庫清單
 */
export function parseCsvToQuestions(csvString: string): { valid: boolean; error?: string; data?: QuestionItem[] } {
  // 移除 UTF-8 BOM 與多餘首尾空白
  const clean = csvString.replace(/^\uFEFF/, '').trim();
  if (!clean) {
    return { valid: false, error: 'CSV 內容為空。' };
  }

  // 逐行切割 (支援 CRLF 與 LF)
  const rawLines = clean.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (rawLines.length === 0) {
    return { valid: false, error: 'CSV 檔案中未發現有效行數。' };
  }

  // 支援 CSV 逗號包含在雙引號中的標準解析
  const parseCsvLine = (line: string): string[] => {
    const result: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (c === ',' && !inQuotes) {
        result.push(cur.trim());
        cur = '';
      } else {
        cur += c;
      }
    }
    result.push(cur.trim());
    return result;
  };

  const headerRow = parseCsvLine(rawLines[0]);
  // 判斷第 1 列是否為標題欄位
  const isHeader = headerRow.some((cell) =>
    /^(text|題目|題目文字|內容|category|分類|difficulty|難度|難易度|meaning|註解|說明|釋義|導讀)$/i.test(cell)
  );

  const colMap = { text: 0, category: 1, difficulty: 2, meaning: 3 };
  let startIdx = 0;

  if (isHeader) {
    startIdx = 1;
    headerRow.forEach((col, idx) => {
      const lower = col.toLowerCase();
      if (lower.includes('text') || lower.includes('題目') || lower.includes('內容')) colMap.text = idx;
      else if (lower.includes('category') || lower.includes('分類')) colMap.category = idx;
      else if (lower.includes('difficulty') || lower.includes('難度') || lower.includes('難易度')) colMap.difficulty = idx;
      else if (lower.includes('meaning') || lower.includes('註解') || lower.includes('說明') || lower.includes('釋義') || lower.includes('導讀')) colMap.meaning = idx;
    });
  }

  const items: QuestionItem[] = [];
  for (let i = startIdx; i < rawLines.length; i++) {
    const cols = parseCsvLine(rawLines[i]);
    const textVal = cols[colMap.text] || '';
    if (!textVal || textVal.trim() === '') continue; // 略過無文字的空白列

    const catVal = cols[colMap.category] || '自訂題庫';
    let diffVal: 'easy' | 'medium' | 'hard' = 'easy';
    const rawDiff = (cols[colMap.difficulty] || '').toLowerCase();
    if (rawDiff.includes('hard') || rawDiff.includes('難') || rawDiff.includes('高')) diffVal = 'hard';
    else if (rawDiff.includes('med') || rawDiff.includes('中')) diffVal = 'medium';
    else diffVal = 'easy';

    const meaningVal = cols[colMap.meaning] || '';

    items.push({
      id: `csv-${Date.now()}-${i}`,
      text: textVal.trim(),
      category: catVal.trim(),
      difficulty: diffVal,
      meaning: meaningVal.trim(),
    });
  }

  if (items.length === 0) {
    return { valid: false, error: '未能從 CSV 檔案中讀取到任何題目文字（請確認至少有一欄包含題目內容）。' };
  }

  return { valid: true, data: items };
}

/**
 * 匯出題庫為 Excel 可直接開啟的 UTF-8 CSV 檔案字串
 */
export function exportQuestionsToCsv(questions: QuestionItem[]): string {
  const escapeCsv = (val: string) => `"${(val || '').replace(/"/g, '""')}"`;
  const header = ['題目文字', '分類', '難易度', '註解說明'].map(escapeCsv).join(',');
  const rows = questions.map((q) =>
    [
      escapeCsv(q.text),
      escapeCsv(q.category || '自訂題庫'),
      escapeCsv(q.difficulty || 'easy'),
      escapeCsv(q.meaning || ''),
    ].join(',')
  );
  // 加入 \uFEFF (UTF-8 BOM)，讓 Excel (繁體中文 Windows / Mac) 雙擊開啟不亂碼
  return '\uFEFF' + [header, ...rows].join('\r\n');
}

/**
 * 產生標準 Excel (CSV) 範本內容
 */
export function getExcelTemplateCsv(): string {
  const escapeCsv = (val: string) => `"${(val || '').replace(/"/g, '""')}"`;
  const header = ['題目文字', '分類', '難易度', '註解說明'].map(escapeCsv).join(',');
  const sampleRows = [
    [escapeCsv('天青色等煙雨，而我在等你。'), escapeCsv('經典歌詞'), escapeCsv('medium'), escapeCsv('周杰倫《青花瓷》方文山作詞名句')],
    [escapeCsv('現在放棄的話，比賽就結束了。'), escapeCsv('漫畫名言'), escapeCsv('medium'), escapeCsv('《灌籃高手》安西教練激勵人心的經典台詞')],
    [escapeCsv('求知若飢，虛心若愚。'), escapeCsv('名人名言'), escapeCsv('easy'), escapeCsv('賈伯斯 Steve Jobs 畢業演說格言')],
    [escapeCsv('我知道我的未來不是夢，我認真地過每一分鐘。'), escapeCsv('經典歌詞'), escapeCsv('medium'), escapeCsv('張雨生經典勵志名曲')],
    [escapeCsv('海闊天空'), escapeCsv('經典成語'), escapeCsv('easy'), escapeCsv('天地無比廣闊，比喻心胸開朗開闊')],
    [escapeCsv('玉山日出迎曙光'), escapeCsv('台灣風物'), escapeCsv('medium'), escapeCsv('台灣最高峰清晨破曉的壯麗景致')],
  ].map((r) => r.join(','));
  return '\uFEFF' + [header, ...sampleRows].join('\r\n');
}

