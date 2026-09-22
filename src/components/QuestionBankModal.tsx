import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Copy,
  Check,
  Download,
  Upload,
  RotateCcw,
  X,
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  Code2,
  FileText,
  Sparkles,
  Search,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { QuestionItem } from '../types';
import {
  saveStoredQuestions,
  resetToDefaultQuestions,
  validateQuestionBank,
  parseCsvToQuestions,
  exportQuestionsToCsv,
  getExcelTemplateCsv,
} from '../data/questions';

// 標準題庫範本資料 (JSON 模式備用)
const QUESTION_BANK_TEMPLATE: QuestionItem[] = [
  {
    id: "sample-01",
    text: "天青色等煙雨，而我在等你。",
    category: "經典歌詞",
    difficulty: "medium",
    meaning: "周杰倫《青花瓷》方文山作詞名句"
  },
  {
    id: "sample-02",
    text: "現在放棄的話，比賽就結束了。",
    category: "漫畫名言",
    difficulty: "medium",
    meaning: "《灌籃高手》安西教練激勵人心的經典台詞"
  },
  {
    id: "sample-03",
    text: "求知若飢，虛心若愚。",
    category: "名人名言",
    difficulty: "easy",
    meaning: "賈伯斯 Steve Jobs 畢業演說格言"
  },
  {
    id: "sample-04",
    text: "我知道我的未來不是夢，我認真地過每一分鐘。",
    category: "經典歌詞",
    difficulty: "medium",
    meaning: "張雨生傳奇高音經典勵志名曲"
  }
];

interface QuestionBankModalProps {
  currentQuestions: QuestionItem[];
  onUpdateQuestions: (newQuestions: QuestionItem[]) => void;
  onClose: () => void;
}

export const QuestionBankModal: React.FC<QuestionBankModalProps> = ({
  currentQuestions,
  onUpdateQuestions,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'excel' | 'view' | 'json'>('excel');
  const [copiedJson, setCopiedJson] = useState<boolean>(false);
  const [inputText, setInputText] = useState<string>('');
  const [parsedData, setParsedData] = useState<QuestionItem[] | null>(null);
  const [showExampleTable, setShowExampleTable] = useState<boolean>(false);
  const [confirmResetDefault, setConfirmResetDefault] = useState<boolean>(false);
  const [importStatus, setImportStatus] = useState<{
    type: 'idle' | 'success' | 'error';
    message: string;
    parsedCount?: number;
    isApplied?: boolean;
  }>({ type: 'idle', message: '' });

  // 瀏覽目前題庫：搜尋與篩選狀態 (CSV 條列式)
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<'all' | 'easy' | 'medium' | 'hard'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // 計算所有可用分類
  const categories = useMemo(() => {
    const set = new Set<string>();
    currentQuestions.forEach((q) => {
      if (q.category && q.category.trim()) set.add(q.category.trim());
    });
    return Array.from(set);
  }, [currentQuestions]);

  // 條列式過濾後的題目
  const filteredQuestions = useMemo(() => {
    return currentQuestions.filter((q) => {
      if (selectedDifficulty !== 'all' && q.difficulty !== selectedDifficulty) return false;
      if (selectedCategory !== 'all' && q.category !== selectedCategory) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const textMatch = (q.text || '').toLowerCase().includes(query);
        const meaningMatch = (q.meaning || '').toLowerCase().includes(query);
        const categoryMatch = (q.category || '').toLowerCase().includes(query);
        return textMatch || meaningMatch || categoryMatch;
      }
      return true;
    });
  }, [currentQuestions, selectedDifficulty, selectedCategory, searchQuery]);

  // 格式化的 JSON 字串 (僅供進階模式操作)
  const formattedJson = useMemo(() => {
    return JSON.stringify(currentQuestions, null, 2);
  }, [currentQuestions]);

  // 下載 Excel CSV 範本檔
  const handleDownloadExcelTemplate = () => {
    const csvContent = getExcelTemplateCsv();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'typing_questions_excel_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // 匯出當前全部題目為 Excel (CSV)
  const handleExportAllToExcel = () => {
    const csvContent = exportQuestionsToCsv(currentQuestions);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `typing_questions_export_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 一鍵複製完整題庫 JSON (全部移入進階模式)
  const handleCopyJson = async () => {
    try {
      await navigator.clipboard.writeText(formattedJson);
      setCopiedJson(true);
      setTimeout(() => setCopiedJson(false), 2500);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = formattedJson;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedJson(true);
      setTimeout(() => setCopiedJson(false), 2500);
    }
  };

  // 下載當前題庫 JSON 檔案 (進階模式)
  const handleDownloadJson = () => {
    const blob = new Blob([formattedJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chinese_typing_questions_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 一鍵載入標準題庫 JSON 範本 (進階模式)
  const handleLoadJsonTemplate = () => {
    const templateStr = JSON.stringify(QUESTION_BANK_TEMPLATE, null, 2);
    setInputText(templateStr);
    validateAndPreview(templateStr);
  };

  // 支援解析 CSV 或 JSON
  const validateAndPreview = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) {
      setImportStatus({ type: 'idle', message: '' });
      setParsedData(null);
      return;
    }

    // 判斷是否為 JSON
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      const res = validateQuestionBank(trimmed);
      if (res.valid && res.data) {
        setParsedData(res.data);
        setImportStatus({
          type: 'success',
          message: `JSON 格式解析正確！共讀取到 ${res.data.length} 道題目，隨時可確認套用。`,
          parsedCount: res.data.length,
          isApplied: false,
        });
      } else {
        setParsedData(null);
        setImportStatus({ type: 'error', message: res.error || 'JSON 格式不正確' });
      }
      return;
    }

    // 處理 Excel 複製內容 (Tab 分隔) 或 CSV (逗號分隔)
    let csvFormatted = trimmed;
    if (trimmed.includes('\t') && !trimmed.includes(',')) {
      csvFormatted = trimmed
        .split('\n')
        .map((line) =>
          line
            .split('\t')
            .map((cell) => `"${cell.replace(/"/g, '""')}"`)
            .join(',')
        )
        .join('\n');
    }

    const csvRes = parseCsvToQuestions(csvFormatted);
    if (csvRes.valid && csvRes.data) {
      setParsedData(csvRes.data);
      setImportStatus({
        type: 'success',
        message: `Excel / CSV 試算表解析成功！共讀取到 ${csvRes.data.length} 道題目，確認無誤後即可套用。`,
        parsedCount: csvRes.data.length,
        isApplied: false,
      });
    } else {
      setParsedData(null);
      setImportStatus({
        type: 'error',
        message: csvRes.error || '無法辨識檔案格式，請確認內容為 CSV 格式或合法 JSON。',
      });
    }
  };

  // 處理檔案上傳 (.csv, .json, .txt)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = (event.target?.result as string) || '';
      setInputText(content);
      validateAndPreview(content);
    };
    reader.readAsText(file, 'UTF-8');
    // 清空 input 讓同檔名可再次上傳
    e.target.value = '';
  };

  // 執行匯入套用
  const handleExecuteImport = () => {
    if (!parsedData || parsedData.length === 0) {
      setImportStatus({ type: 'error', message: '尚未載入有效的題目資料。' });
      return;
    }

    saveStoredQuestions(parsedData);
    onUpdateQuestions(parsedData);
    setImportStatus({
      type: 'success',
      message: `🎉 已成功套用新題庫！共 ${parsedData.length} 題已生效。`,
      parsedCount: parsedData.length,
      isApplied: true,
    });
  };

  // 恢復官方預設題庫 (保留恢復預設值功能)
  const handleResetToDefault = () => {
    if (confirmResetDefault) {
      const def = resetToDefaultQuestions();
      onUpdateQuestions(def);
      setImportStatus({
        type: 'success',
        message: '已成功恢復為官方基礎題庫！',
        isApplied: true,
      });
      setConfirmResetDefault(false);
    } else {
      setConfirmResetDefault(true);
      setTimeout(() => setConfirmResetDefault(false), 4000);
    }
  };

  return (
    <div
      id="question-bank-modal-backdrop"
      className="fixed inset-0 z-50 bg-stone-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        id="question-bank-modal-content"
        className="w-full max-w-4xl bg-stone-900 border border-stone-800 rounded-3xl shadow-2xl my-auto max-h-[90vh] flex flex-col overflow-hidden animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. Header (固定在頂部) */}
        <div className="px-5 sm:px-7 py-4 border-b border-stone-800 shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400">
              <BookOpen className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-stone-100 flex items-center gap-2">
                <span>編輯題庫</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-stone-800 text-amber-400 font-mono font-normal">
                  共 {currentQuestions.length} 題
                </span>
              </h2>
              <p className="text-xs text-stone-400">
                支援 Excel 試算表 (.csv) 填寫匯入、條列式瀏覽與 JSON 進階管理
              </p>
            </div>
          </div>

          <button
            id="btn-close-question-bank"
            onClick={onClose}
            className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-stone-100 transition-colors cursor-pointer"
            title="關閉"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2. Tab 切換選單 (固定在頂部) */}
        <div className="px-5 sm:px-7 py-2.5 bg-stone-950/40 border-b border-stone-800/80 shrink-0 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-1 p-1 bg-stone-950 rounded-xl border border-stone-800 text-xs">
            <button
              id="tab-excel-mode"
              type="button"
              onClick={() => setActiveTab('excel')}
              className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'excel'
                  ? 'bg-amber-500 text-stone-950 font-bold shadow-sm'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Excel (CSV) 試算表與匯入</span>
            </button>
            <button
              id="tab-view-mode"
              type="button"
              onClick={() => setActiveTab('view')}
              className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'view'
                  ? 'bg-amber-500 text-stone-950 font-bold shadow-sm'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>瀏覽目前題庫 ({currentQuestions.length})</span>
            </button>
            <button
              id="tab-json-mode"
              type="button"
              onClick={() => setActiveTab('json')}
              className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'json'
                  ? 'bg-amber-500 text-stone-950 font-bold shadow-sm'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>JSON 進階模式</span>
            </button>
          </div>

          <button
            id="btn-export-excel-quick"
            type="button"
            onClick={handleExportAllToExcel}
            className="px-2.5 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            title="將現有題庫匯出成 Excel CSV 檔案"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            <span>匯出 Excel (.csv)</span>
          </button>
        </div>

        {/* 3. 滾動內容主體 (唯一滾動區域，絕不破圖溢出) */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 sm:px-7 py-4 space-y-4">
          {/* Tab 1: Excel / CSV 試算表模式 */}
          {activeTab === 'excel' && (
            <div className="space-y-4">
              {/* Excel 操作指南卡片 */}
              <div className="p-3.5 bg-stone-950/70 border border-stone-800 rounded-2xl space-y-3 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-stone-200 flex items-center gap-1.5">
                    <FileSpreadsheet className="w-4 h-4 text-amber-400" />
                    Excel / 試算表填寫三步驟：
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowExampleTable(!showExampleTable)}
                      className="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      {showExampleTable ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      <span>{showExampleTable ? '收合欄位範例' : '查看欄位範例'}</span>
                    </button>
                    <button
                      id="btn-download-excel-template"
                      type="button"
                      onClick={handleDownloadExcelTemplate}
                      className="px-3 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 flex items-center gap-1.5 font-bold transition-all cursor-pointer"
                      title="下載已設定好欄位的 Excel CSV 範本檔"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>下載 Excel 範本檔 (.csv)</span>
                    </button>
                  </div>
                </div>

                {/* 三步驟說明 */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-[11px] text-stone-400">
                  <div className="bg-stone-900/80 p-2.5 rounded-xl border border-stone-800">
                    <span className="text-amber-400 font-bold block mb-0.5">步驟 1. 下載範本</span>
                    點擊右上角下載範本，在 Excel 或 Google 試算表中開啟。
                  </div>
                  <div className="bg-stone-900/80 p-2.5 rounded-xl border border-stone-800">
                    <span className="text-amber-400 font-bold block mb-0.5">步驟 2. 照格子填入</span>
                    填入「題目文字」、「分類」、「難易度」、「註解說明」。
                  </div>
                  <div className="bg-stone-900/80 p-2.5 rounded-xl border border-stone-800">
                    <span className="text-amber-400 font-bold block mb-0.5">步驟 3. 儲存並上傳</span>
                    另存為 CSV 或複製儲存格內容，直接於下方上傳或貼上！
                  </div>
                </div>

                {/* 展開之 Excel 表格範例 */}
                {showExampleTable && (
                  <div className="overflow-x-auto rounded-xl border border-stone-800 bg-stone-900/95 text-[11px] font-mono animate-fade-in">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-stone-800/90 text-stone-300 border-b border-stone-700">
                          <th className="py-1.5 px-3">題目文字 (必填)</th>
                          <th className="py-1.5 px-3">分類 (選填)</th>
                          <th className="py-1.5 px-3">難易度 (easy/medium/hard)</th>
                          <th className="py-1.5 px-3">註解說明 (選填)</th>
                        </tr>
                      </thead>
                      <tbody className="text-stone-400 divide-y divide-stone-800/80">
                        <tr>
                          <td className="py-1.5 px-3 text-stone-200">天青色等煙雨，而我在等你。</td>
                          <td className="py-1.5 px-3 text-amber-300/90">經典歌詞</td>
                          <td className="py-1.5 px-3">medium</td>
                          <td className="py-1.5 px-3 text-stone-400 truncate max-w-[200px]">周杰倫《青花瓷》方文山作詞名句</td>
                        </tr>
                        <tr>
                          <td className="py-1.5 px-3 text-stone-200">現在放棄的話，比賽就結束了。</td>
                          <td className="py-1.5 px-3 text-amber-300/90">漫畫名言</td>
                          <td className="py-1.5 px-3">medium</td>
                          <td className="py-1.5 px-3 text-stone-400 truncate max-w-[200px]">《灌籃高手》安西教練經典台詞</td>
                        </tr>
                        <tr>
                          <td className="py-1.5 px-3 text-stone-200">求知若飢，虛心若愚。</td>
                          <td className="py-1.5 px-3 text-amber-300/90">名人名言</td>
                          <td className="py-1.5 px-3">easy</td>
                          <td className="py-1.5 px-3 text-stone-400 truncate max-w-[200px]">賈伯斯 Steve Jobs 畢業演說名言</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* 上傳或貼上區域 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-stone-400">
                  <span>選擇本機檔案上傳，或從 Excel 複製貼在下方文字框：</span>
                  <label
                    id="label-upload-excel"
                    className="cursor-pointer px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 hover:text-amber-400 flex items-center gap-1.5 transition-colors text-xs"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>上傳本機 .csv 檔案</span>
                    <input
                      type="file"
                      accept=".csv,.txt,.json"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                <textarea
                  id="textarea-import-csv"
                  value={inputText}
                  onChange={(e) => {
                    setInputText(e.target.value);
                    validateAndPreview(e.target.value);
                  }}
                  placeholder="在此貼上從 Excel 複製的資料（支援整欄整列複製貼上），或直接貼上 CSV 內容..."
                  className="w-full h-24 bg-stone-950 border border-stone-800 rounded-xl p-3 text-xs font-mono text-stone-200 placeholder-stone-600 focus:outline-none focus:border-amber-500 resize-y"
                />
              </div>

              {/* 驗證回饋提示 */}
              {importStatus.type !== 'idle' && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center justify-between gap-3 ${
                    importStatus.type === 'success'
                      ? 'bg-emerald-950/40 border border-emerald-800/60 text-emerald-300'
                      : 'bg-rose-950/40 border border-rose-800/60 text-rose-300'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {importStatus.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                    )}
                    <span className="truncate">{importStatus.message}</span>
                  </div>
                  {importStatus.isApplied && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('view')}
                      className="shrink-0 px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 font-bold transition-colors cursor-pointer"
                    >
                      前往查看目前題庫 &rarr;
                    </button>
                  )}
                </div>
              )}

              {/* 預覽即將匯入之題目卡片 */}
              {parsedData && parsedData.length > 0 && (
                <div className="bg-stone-950/80 border border-stone-800 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-stone-300 font-bold flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      預覽即將匯入題目（共 {parsedData.length} 題，顯示前 5 筆）：
                    </span>
                    <span className="text-emerald-400 font-mono text-[11px] bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800/60">
                      格式驗證正常
                    </span>
                  </div>

                  {/* 條列式預覽清單 */}
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {parsedData.slice(0, 5).map((item, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl bg-stone-900/90 border border-stone-800/80 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="font-mono text-amber-400 font-bold shrink-0">{idx + 1}.</span>
                          <span className="font-medium text-stone-100 break-all">{item.text}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                          <span className="px-2 py-0.5 text-[11px] rounded-lg bg-stone-800 text-amber-300 border border-stone-700/60 font-medium">
                            {item.category || '未分類'}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold ${
                              item.difficulty === 'hard'
                                ? 'text-rose-400 bg-rose-950/50 border border-rose-800/40'
                                : item.difficulty === 'medium'
                                ? 'text-amber-400 bg-amber-950/50 border border-amber-800/40'
                                : 'text-emerald-400 bg-emerald-950/50 border border-emerald-800/40'
                            }`}
                          >
                            {item.difficulty === 'hard' ? '高級' : item.difficulty === 'medium' ? '中級' : '初級'}
                          </span>
                          {item.meaning && (
                            <span className="text-stone-400 text-[11px] max-w-[180px] truncate hidden md:inline" title={item.meaning}>
                              {item.meaning}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* 套用按鈕區 */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-stone-800/80">
                    <span className="text-[11px] text-stone-400">
                      確認資料無誤後，點選右方按鈕即可儲存至本機並生效
                    </span>
                    <button
                      id="btn-confirm-import-excel"
                      type="button"
                      onClick={handleExecuteImport}
                      className="px-5 py-2 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-stone-950 shadow-lg shadow-amber-500/25 transition-all cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      <span>套用並儲存題庫 ({parsedData.length} 題)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: 瀏覽目前題庫 (CSV 條列式呈現) */}
          {activeTab === 'view' && (
            <div className="space-y-3">
              {/* 條列式工具列：搜尋、難度篩選、分類篩選與恢復預設 */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex flex-wrap items-center gap-2 flex-1">
                  {/* 搜尋欄 */}
                  <div className="relative flex-1 min-w-[160px] max-w-xs">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-500" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="搜尋題目文字或關鍵字..."
                      className="w-full pl-8 pr-3 py-1.5 bg-stone-950 border border-stone-800 rounded-xl text-xs text-stone-200 placeholder-stone-500 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  {/* 難度切換 */}
                  <div className="flex items-center gap-1 bg-stone-950 p-1 rounded-xl border border-stone-800">
                    {(
                      [
                        { id: 'all', label: '全部' },
                        { id: 'easy', label: '初級' },
                        { id: 'medium', label: '中級' },
                        { id: 'hard', label: '高級' },
                      ] as const
                    ).map((diff) => (
                      <button
                        key={diff.id}
                        type="button"
                        onClick={() => setSelectedDifficulty(diff.id)}
                        className={`px-2 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer ${
                          selectedDifficulty === diff.id
                            ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40'
                            : 'text-stone-400 hover:text-stone-200'
                        }`}
                      >
                        {diff.label}
                      </button>
                    ))}
                  </div>

                  {/* 分類下拉選單 */}
                  {categories.length > 0 && (
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="bg-stone-950 border border-stone-800 rounded-xl px-2.5 py-1.5 text-xs text-stone-300 focus:outline-none focus:border-amber-500 cursor-pointer"
                    >
                      <option value="all">所有分類 ({categories.length})</option>
                      {categories.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* 右側：恢復官方預設功能 (保留恢復預設值功能) */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] text-stone-500">
                    顯示 {filteredQuestions.length} / 共 {currentQuestions.length} 題
                  </span>
                  <button
                    id="btn-restore-default-bank"
                    type="button"
                    onClick={handleResetToDefault}
                    className={`flex items-center gap-1 transition-colors px-2.5 py-1.5 rounded-xl text-xs font-medium cursor-pointer ${
                      confirmResetDefault
                        ? 'bg-rose-600 text-white animate-pulse'
                        : 'bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-amber-400 border border-stone-700'
                    }`}
                    title="恢復為系統官方預設題庫"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{confirmResetDefault ? '再次點擊確認恢復' : '恢復官方預設'}</span>
                  </button>
                </div>
              </div>

              {/* CSV 條列式表格清單 */}
              <div className="bg-stone-950 border border-stone-800 rounded-2xl overflow-hidden flex flex-col">
                <div className="overflow-y-auto max-h-[380px]">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="sticky top-0 bg-stone-900/95 border-b border-stone-800 text-stone-400 text-[11px] font-mono z-10 backdrop-blur-sm">
                      <tr>
                        <th className="py-2.5 px-3 w-12 text-center text-stone-500">#</th>
                        <th className="py-2.5 px-3 min-w-[200px]">題目文字 (Text)</th>
                        <th className="py-2.5 px-3 w-28">分類 (Category)</th>
                        <th className="py-2.5 px-3 w-20 text-center">難度</th>
                        <th className="py-2.5 px-3 min-w-[160px]">註解導讀 (Meaning)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-900 text-stone-300 font-sans">
                      {filteredQuestions.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-12 text-center text-stone-500">
                            未找到符合「{searchQuery}」的題目內容。
                          </td>
                        </tr>
                      ) : (
                        filteredQuestions.map((q, idx) => (
                          <tr
                            key={q.id || `q-${idx}`}
                            className="hover:bg-stone-900/60 transition-colors group"
                          >
                            <td className="py-2.5 px-3 text-center font-mono text-[11px] text-stone-500">
                              {idx + 1}
                            </td>
                            <td className="py-2.5 px-3 font-medium text-stone-100 group-hover:text-amber-300 transition-colors">
                              {q.text}
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="px-2 py-0.5 rounded-lg bg-stone-900 text-[11px] text-stone-300 border border-stone-800">
                                {q.category || '未分類'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span
                                className={`px-2 py-0.5 rounded-lg font-mono text-[10px] font-bold ${
                                  q.difficulty === 'hard'
                                    ? 'bg-rose-950/50 text-rose-400 border border-rose-800/40'
                                    : q.difficulty === 'medium'
                                    ? 'bg-amber-950/50 text-amber-400 border border-amber-800/40'
                                    : 'bg-emerald-950/50 text-emerald-400 border border-emerald-800/40'
                                }`}
                              >
                                {q.difficulty === 'hard'
                                  ? '高級'
                                  : q.difficulty === 'medium'
                                  ? '中級'
                                  : '初級'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-stone-400 text-[11px] max-w-xs truncate" title={q.meaning}>
                              {q.meaning || '—'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: JSON 進階模式 (全部 JSON 相關操作皆集中在此) */}
          {activeTab === 'json' && (
            <div className="space-y-3">
              {/* JSON 工具列：複製 JSON、下載 JSON、載入範本、上傳檔案 */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-stone-950/80 border border-stone-800 rounded-xl text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  {/* 複製 JSON (依指示移入進階模式) */}
                  <button
                    id="btn-copy-json"
                    type="button"
                    onClick={handleCopyJson}
                    className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="複製目前全部題庫為 JSON 字串"
                  >
                    {copiedJson ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-amber-400" />
                    )}
                    <span>{copiedJson ? '已複製 JSON' : '複製完整題庫 JSON'}</span>
                  </button>

                  {/* 下載 JSON 檔案 */}
                  <button
                    id="btn-download-json-bank"
                    type="button"
                    onClick={handleDownloadJson}
                    className="px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700 flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-stone-400" />
                    <span>下載 .json 檔案</span>
                  </button>

                  {/* 載入標準 JSON 範本 */}
                  <button
                    id="btn-load-json-template-sample"
                    type="button"
                    onClick={handleLoadJsonTemplate}
                    className="px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700 flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>填入 JSON 範本</span>
                  </button>
                </div>

                {/* 上傳本機 JSON 檔案 */}
                <label
                  id="label-upload-file-json"
                  className="cursor-pointer px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 hover:text-amber-400 flex items-center gap-1 transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>上傳本機 .json 檔案</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {/* 欄位格式小卡 */}
              <div className="text-[11px] text-stone-400 bg-stone-900/50 border border-stone-800/80 rounded-xl px-3 py-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                <span className="font-semibold text-stone-300 flex items-center gap-1">
                  <Code2 className="w-3.5 h-3.5 text-amber-400" />
                  JSON 欄位格式：
                </span>
                <span><code className="text-amber-300">id</code> 識別碼</span>
                <span><code className="text-amber-300">text</code> 題目文字 (必填)</span>
                <span><code className="text-amber-300">category</code> 分類</span>
                <span><code className="text-amber-300">difficulty</code> easy / medium / hard</span>
                <span><code className="text-amber-300">meaning</code> 註解導讀</span>
              </div>

              <textarea
                id="textarea-import-json"
                value={inputText}
                onChange={(e) => {
                  setInputText(e.target.value);
                  validateAndPreview(e.target.value);
                }}
                placeholder={`請貼上題庫 JSON 陣列，或直接點選上方「填入 JSON 範本」：
[
  {
    "id": "custom-1",
    "text": "天青色等煙雨，而我在等你。",
    "category": "經典歌詞",
    "difficulty": "medium",
    "meaning": "周杰倫《青花瓷》方文山作詞名句"
  }
]`}
                className="w-full h-36 bg-stone-950 border border-stone-800 rounded-2xl p-3.5 text-xs font-mono text-stone-200 placeholder-stone-600 focus:outline-none focus:border-amber-500 resize-y"
              />

              {/* Validation Feedback */}
              {importStatus.type !== 'idle' && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                    importStatus.type === 'success'
                      ? 'bg-emerald-950/40 border border-emerald-800/60 text-emerald-300'
                      : 'bg-rose-950/40 border border-rose-800/60 text-rose-300'
                  }`}
                >
                  {importStatus.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                  )}
                  <span>{importStatus.message}</span>
                </div>
              )}

              {/* 套用按鈕區 */}
              <div className="flex justify-end pt-1">
                <button
                  id="btn-confirm-import-json"
                  type="button"
                  onClick={handleExecuteImport}
                  disabled={!parsedData || parsedData.length === 0}
                  className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer ${
                    parsedData && parsedData.length > 0
                      ? 'bg-amber-500 hover:bg-amber-400 text-stone-950 shadow-lg shadow-amber-500/20'
                      : 'bg-stone-800 text-stone-500 cursor-not-allowed'
                  }`}
                >
                  <span>套用並儲存 JSON 題庫 ({parsedData?.length || 0} 題)</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 4. Footer (固定在底部，絕不與內容重疊) */}
        <div className="px-5 sm:px-7 py-3.5 border-t border-stone-800 shrink-0 bg-stone-950/90 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="text-stone-400 flex items-center gap-2">
            <span>支援 Excel 另存 CSV 或複製貼上，輕鬆打造專屬題庫</span>
          </div>

          <div className="flex items-center gap-2.5">
            {activeTab !== 'view' && parsedData && parsedData.length > 0 && (
              <button
                id="btn-footer-confirm-apply"
                type="button"
                onClick={handleExecuteImport}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition-all cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>套用題庫 ({parsedData.length} 題)</span>
              </button>
            )}
            <button
              id="btn-close-question-bank-footer"
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs sm:text-sm font-medium transition-colors cursor-pointer"
            >
              完成並關閉
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
