import { QuestionItem, Difficulty, QuestionCount } from '../types';
import defaultQuestionsData from './defaultQuestions.json';

const CUSTOM_QUESTIONS_KEY = 'chinese_typing_custom_questions_v28';

export const defaultQuestions: QuestionItem[] = defaultQuestionsData as QuestionItem[];

// 規範化舊分類名稱至最新分類
export function normalizeCategory(category: string | undefined): string {
  if (!category) return '自訂題庫';
  const trimmed = category.trim();
  if (trimmed === '漫畫名言' || trimmed === '名人名言' || trimmed === '名言與金句') return '名言佳句';
  if (trimmed === '夜市與小吃') return '台灣小吃';
  return trimmed;
}

/**
 * 針對引用類題目（歌詞、名言佳句、台灣文學、詩詞古文等），說明欄統一精簡為「作者《作品》」格式
 */
export function formatCitationMeaning(meaning: string | undefined, category?: string): string {
  if (!meaning) return '';
  const cat = category ? normalizeCategory(category) : '';
  const isCitationCat =
    cat.includes('歌詞') ||
    cat.includes('文學') ||
    cat.includes('詩詞') ||
    cat.includes('古文') ||
    cat.includes('名言') ||
    cat.includes('金句') ||
    cat === '名言佳句' ||
    cat === '經典歌詞' ||
    cat === '台灣文學' ||
    cat === '詩詞與古文';

  // 1. 若符合 "作者《作品》" 格式（後方可能帶有雜訊說明），僅保留作者與書名號作品名
  const matchWithBrackets = meaning.match(/^([^《]*?《[^》]+》)/);
  if (matchWithBrackets) {
    return matchWithBrackets[1].trim();
  }

  // 2. 若為引用類且符合 "作者 - 作品" 或 "作者 / 作品" 格式
  if (isCitationCat) {
    const matchWithDash = meaning.match(/^([^-–—/]+)\s*[-–—/]\s*([^-–—/]+)/);
    if (matchWithDash) {
      return `${matchWithDash[1].trim()}《${matchWithDash[2].trim()}》`;
    }
  }

  return meaning.trim();
}

// 相容別名
export const formatLyricsMeaning = formatCitationMeaning;

// 建立預設題目 id -> QuestionItem 對照表，確保預設題目的最新原文、讀音與註解即時同步
const defaultQuestionMap = new Map<string, QuestionItem>();
defaultQuestions.forEach((q) => {
  defaultQuestionMap.set(q.id, q);
});

export function getStoredQuestions(): QuestionItem[] {
  try {
    const raw = localStorage.getItem(CUSTOM_QUESTIONS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((q: QuestionItem) => {
          if (q.id && defaultQuestionMap.has(q.id)) {
            const def = defaultQuestionMap.get(q.id)!;
            return {
              ...q,
              text: def.text,
              bopomofo: def.bopomofo,
              category: def.category,
              meaning: def.meaning,
            };
          }
          return {
            ...q,
            category: normalizeCategory(q.category),
            meaning: formatCitationMeaning(q.meaning, q.category),
          };
        });
      }
    }
  } catch (e) {
    console.error('Failed to load custom questions from localStorage:', e);
  }
  return defaultQuestions;
}

export function saveStoredQuestions(questions: QuestionItem[]): void {
  const normalized = questions.map((q) => ({
    ...q,
    category: normalizeCategory(q.category),
  }));
  localStorage.setItem(CUSTOM_QUESTIONS_KEY, JSON.stringify(normalized, null, 2));
}

export function resetToDefaultQuestions(): QuestionItem[] {
  localStorage.removeItem(CUSTOM_QUESTIONS_KEY);
  return defaultQuestions;
}

/**
 * 隨機抽取指定難度、分類與數量的題目
 * 確保嚴格遵守玩家指定分類，每道題目在該局遊戲中至多只出現一次（絕不重複循環灌水相同句子）
 */
export function getRandomQuestions(
  pool: QuestionItem[],
  difficulty: Difficulty,
  count: QuestionCount,
  selectedCategories?: string[]
): QuestionItem[] {
  const effectivePool = pool && pool.length > 0 ? pool : defaultQuestions;
  let filtered = effectivePool;

  // 1. 先篩選分類（若有指定一個或多個分類）
  if (selectedCategories && selectedCategories.length > 0) {
    const catSet = new Set(selectedCategories);
    const catFiltered = effectivePool.filter((q) => catSet.has(q.category));
    if (catFiltered.length > 0) {
      filtered = catFiltered;
    }
  }

  // 2. 篩選難度
  if (difficulty !== 'all') {
    const diffFiltered = filtered.filter((q) => q.difficulty === difficulty);
    // 若該分類下指定難度題庫有題目則使用，否則保留該分類其他題目
    if (diffFiltered.length > 0) {
      filtered = diffFiltered;
    }
  }

  if (filtered.length === 0) {
    filtered = [...effectivePool];
  }

  // 3. 依題目文字去重，確保不包含重複內容
  const uniqueMap = new Map<string, QuestionItem>();
  for (const q of filtered) {
    const key = q.text.trim();
    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, q);
    }
  }
  const uniqueList = Array.from(uniqueMap.values());

  // 4. 洗牌演算法 (Fisher-Yates)
  const shuffled = [...uniqueList].sort(() => Math.random() - 0.5);

  // 嚴格不重複原則：若符合條件題目數少於設定題數（例如自訂題庫或指定範圍僅 3 題但設定 10 題），
  // 絕不重複循環灌水，直接以該分類現有的全部不重複題目進行挑戰！
  if (shuffled.length <= count) {
    return shuffled;
  }

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
      category: normalizeCategory(catVal.trim()),
      difficulty: diffVal,
      meaning: formatLyricsMeaning(meaningVal.trim(), catVal.trim()),
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
      escapeCsv(normalizeCategory(q.category || '自訂題庫')),
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
    [escapeCsv('天青色等煙雨，而我在等你'), escapeCsv('經典歌詞'), escapeCsv('medium'), escapeCsv('周杰倫《青花瓷》')],
    [escapeCsv('現在放棄的話，比賽就結束了。'), escapeCsv('名言佳句'), escapeCsv('medium'), escapeCsv('井上雄彥《灌籃高手：安西教練（安西光義）》')],
    [escapeCsv('求知若飢，虛心若愚。'), escapeCsv('名言佳句'), escapeCsv('easy'), escapeCsv('史蒂夫·賈伯斯《史丹佛大學畢業演講》')],
    [escapeCsv('珍珠奶茶微糖少冰'), escapeCsv('台灣小吃'), escapeCsv('easy'), escapeCsv('台灣手搖飲經典必點客製甜度冰塊')],
    [escapeCsv('海闊天空'), escapeCsv('經典成語'), escapeCsv('easy'), escapeCsv('天地無比廣闊，比喻心胸開朗開闊')],
    [escapeCsv('玉山日出迎曙光'), escapeCsv('台灣文學'), escapeCsv('medium'), escapeCsv('台灣最高峰清晨破曉的壯麗景致')],
  ].map((r) => r.join(','));
  return '\uFEFF' + [header, ...sampleRows].join('\r\n');
}

