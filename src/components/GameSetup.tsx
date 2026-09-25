import React, { useMemo } from 'react';
import { Play, Zap, Award, Target, Flame, Compass, ShieldCheck, Users, Crown, Layers, CheckSquare, Square, Filter } from 'lucide-react';
import { Difficulty, QuestionCount, QuestionItem } from '../types';

interface GameSetupProps {
  difficulty: Difficulty;
  setDifficulty: (d: Difficulty) => void;
  questionCount: QuestionCount;
  setQuestionCount: (c: QuestionCount) => void;
  selectedCategories: string[];
  setSelectedCategories: React.Dispatch<React.SetStateAction<string[]>>;
  onStartGame: () => void;
  questionBank: QuestionItem[];
  onSwitchToMultiplayer: () => void;
}

export const GameSetup: React.FC<GameSetupProps> = ({
  difficulty,
  setDifficulty,
  questionCount,
  setQuestionCount,
  selectedCategories,
  setSelectedCategories,
  onStartGame,
  questionBank,
  onSwitchToMultiplayer,
}) => {
  // 提取所有獨立題庫分類與各分類題數
  const categoryStats = useMemo(() => {
    const statsMap: Record<string, number> = {};
    questionBank.forEach((q) => {
      const cat = q.category || '未分類';
      statsMap[cat] = (statsMap[cat] || 0) + 1;
    });
    return Object.entries(statsMap).map(([name, count]) => ({
      name,
      count,
    })).sort((a, b) => b.count - a.count);
  }, [questionBank]);

  // 切換指定單一題庫分類選取或反選
  const handleToggleCategory = (categoryName: string) => {
    setSelectedCategories((prev) => {
      if (prev.includes(categoryName)) {
        return prev.filter((c) => c !== categoryName);
      } else {
        return [...prev, categoryName];
      }
    });
  };

  // 全選或清空全部題庫分類
  const handleSelectAllCategories = () => {
    setSelectedCategories([]);
  };

  // 目前已選分類的過濾池（空陣列表示全部題庫）
  const categoryPool = useMemo(() => {
    if (selectedCategories.length === 0) return questionBank;
    return questionBank.filter((q) => selectedCategories.includes(q.category));
  }, [questionBank, selectedCategories]);

  // 統計在當前題庫分類範圍下，各難度的題目數
  const easyCount = categoryPool.filter((q) => q.difficulty === 'easy').length;
  const mediumCount = categoryPool.filter((q) => q.difficulty === 'medium').length;
  const hardCount = categoryPool.filter((q) => q.difficulty === 'hard').length;
  const totalCount = categoryPool.length;
  const matchingDifficultyCount =
    difficulty === 'all'
      ? totalCount
      : categoryPool.filter((q) => q.difficulty === difficulty).length;

  const difficultyOptions: {
    id: Difficulty;
    title: string;
    sub: string;
    desc: string;
    count: number;
    color: string;
    tag: string;
  }[] = [
    {
      id: 'easy',
      title: '初級短語',
      sub: '精選短詞與流行語',
      desc: '涵蓋流行梗、名人姓名與高頻成語，節奏輕快，射擊爽感十足',
      count: easyCount,
      color: 'border-emerald-500/40 text-emerald-400 bg-emerald-950/20 hover:border-emerald-500',
      tag: '新手推薦',
    },
    {
      id: 'medium',
      title: '中級名句',
      sub: '影視金句與詩詞哲理',
      desc: '如動漫名言、名篇詩句與生活科技，長度適中，提升語句流暢度',
      count: mediumCount,
      color: 'border-amber-500/40 text-amber-400 bg-amber-950/20 hover:border-amber-500',
      tag: '標準競賽',
    },
    {
      id: 'hard',
      title: '高級長句',
      sub: '千古名篇與深度警句',
      desc: '經典古文名篇、長句抒懷與深度哲思，標點與長句擊破極限考驗',
      count: hardCount,
      color: 'border-rose-500/40 text-rose-400 bg-rose-950/20 hover:border-rose-500',
      tag: '鍵客極限',
    },
    {
      id: 'all',
      title: '綜合模式',
      sub: '全隨機抽題',
      desc: '自所選題庫中隨機抽取，不限長短與難度，全能考驗',
      count: totalCount,
      color: 'border-purple-500/40 text-purple-400 bg-purple-950/20 hover:border-purple-500',
      tag: '多元豐富',
    },
  ];

  const countOptions: { count: QuestionCount; label: string; timeEst: string; icon: React.ReactNode }[] = [
    { count: 5, label: '5 題快速戰', timeEst: '約 1 ~ 2 分鐘', icon: <Zap className="w-4 h-4 text-amber-400" /> },
    { count: 10, label: '10 題標準賽', timeEst: '約 3 ~ 5 分鐘', icon: <Target className="w-4 h-4 text-amber-400" /> },
    { count: 20, label: '20 題耐力賽', timeEst: '約 6 ~ 10 分鐘', icon: <Flame className="w-4 h-4 text-rose-400" /> },
  ];

  return (
    <div id="game-setup-container" className="w-full max-w-4xl mx-auto px-3 sm:px-4 py-1 sm:py-3 space-y-2 sm:space-y-4 animate-fade-in">
      {/* Hero Banner / Introduction */}
      <div className="text-center space-y-1 sm:space-y-1.5">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[10px] sm:text-xs font-medium">
          <Compass className="w-3 h-3 text-amber-400" />
          <span>打字機動戰士 · 空中防衛線</span>
        </div>
        <h1 className="text-lg sm:text-2xl md:text-3xl font-black text-stone-100 tracking-tight">
          妙語如珠，例不虛發
        </h1>
        <p className="text-[11px] sm:text-xs text-stone-400 max-w-xl mx-auto leading-normal hidden xs:block">
          詞語與句子在空中飄浮，在下方輸入欄鍵入整句，按 Enter 或點擊「發射擊破」即可進行雷射打擊！全部字元正確即可一擊擊破。
        </p>

        {/* 遊戲模式選擇 (單人練習 vs 多人連線對戰 2-6 人) */}
        <div className="pt-0.5 flex flex-row items-center justify-center gap-2 max-w-sm mx-auto">
          <div className="w-1/2 p-1 bg-amber-500/20 border border-amber-500 rounded-lg sm:rounded-xl flex items-center justify-center gap-1.5 py-1.5 text-amber-300 font-bold text-xs sm:text-sm shadow-sm">
            <Target className="w-3.5 h-3.5 text-amber-400" />
            單人冒險挑戰
          </div>
          <button
            type="button"
            onClick={onSwitchToMultiplayer}
            className="w-1/2 p-1 bg-stone-900 hover:bg-stone-800 border border-stone-700 hover:border-amber-500/50 rounded-lg sm:rounded-xl flex items-center justify-center gap-1.5 py-1.5 text-stone-300 hover:text-amber-300 font-semibold text-xs sm:text-sm transition-all cursor-pointer group"
          >
            <Users className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
            <span>多人連線 (2-6人)</span>
            <span className="text-[9px] bg-amber-500 text-stone-950 px-1 py-0.2 rounded font-mono font-bold">
              HOT
            </span>
          </button>
        </div>
      </div>

      {/* Main Settings Card */}
      <div className="bg-stone-900/90 border border-stone-800 rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-xl shadow-stone-950/50 space-y-3 sm:space-y-4">
        {/* Step 1: Select Question Bank / Category (指定題庫) */}
        <div className="space-y-1.5 sm:space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-1">
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] sm:text-xs flex items-center justify-center font-mono">1</span>
              <h2 className="text-xs sm:text-sm font-bold text-stone-200 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-amber-400" />
                指定題庫類別
              </h2>
              <span className="text-[10px] text-stone-400 hidden xs:inline">（可複選一個或多個題庫）</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] sm:text-xs font-mono text-amber-300/90">
                {selectedCategories.length === 0
                  ? `全部題庫 (${totalCount} 題)`
                  : `已選 ${selectedCategories.length} 個分類 (${totalCount} 題)`}
              </span>
              {selectedCategories.length > 0 && (
                <button
                  type="button"
                  onClick={handleSelectAllCategories}
                  className="text-[10px] px-2 py-0.5 rounded-md bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-amber-300 transition-colors cursor-pointer"
                >
                  重設為全部
                </button>
              )}
            </div>
          </div>

          {/* 題庫分類標籤選擇器 (支援單選/多選/全選) */}
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            <button
              type="button"
              id="btn-category-all"
              onClick={handleSelectAllCategories}
              className={`px-2.5 py-1.5 rounded-lg sm:rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                selectedCategories.length === 0
                  ? 'bg-amber-500 text-stone-950 font-bold shadow-sm shadow-amber-500/20'
                  : 'bg-stone-950/60 border border-stone-800 text-stone-400 hover:text-stone-200 hover:border-stone-700'
              }`}
            >
              <span>🌐 全部題庫</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                selectedCategories.length === 0 ? 'bg-stone-950/20 text-stone-950 font-bold' : 'bg-stone-800 text-stone-400'
              }`}>
                {questionBank.length}
              </span>
            </button>

            {categoryStats.map((cat) => {
              const isSelected = selectedCategories.includes(cat.name);
              return (
                <button
                  key={cat.name}
                  type="button"
                  id={`btn-category-${encodeURIComponent(cat.name)}`}
                  onClick={() => handleToggleCategory(cat.name)}
                  className={`px-2.5 py-1.5 rounded-lg sm:rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500/20 border border-amber-500 text-amber-300 ring-1 ring-amber-500/50 shadow-sm'
                      : 'bg-stone-950/60 border border-stone-800 text-stone-300 hover:border-stone-700 hover:bg-stone-900/60'
                  }`}
                >
                  <span className="truncate max-w-[120px] sm:max-w-none">{cat.name}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      isSelected
                        ? 'bg-amber-500/30 text-amber-200 font-bold'
                        : 'bg-stone-800 text-stone-400'
                    }`}
                  >
                    {cat.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2: Select Question Count */}
        <div className="space-y-1 sm:space-y-1.5 pt-1">
          <div className="flex items-center justify-between">
            <h2 className="text-xs sm:text-sm font-bold text-stone-200 flex items-center gap-1.5">
              <span className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] sm:text-xs flex items-center justify-center font-mono">2</span>
              選擇挑戰題數
            </h2>
            <span className="text-[10px] sm:text-xs text-stone-400">自所選題庫隨機抽取</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {countOptions.map((opt) => {
              const isSelected = questionCount === opt.count;
              return (
                <button
                  key={opt.count}
                  id={`btn-count-${opt.count}`}
                  onClick={() => setQuestionCount(opt.count)}
                  className={`p-2 sm:p-2.5 rounded-lg sm:rounded-xl border text-center sm:text-left transition-all relative overflow-hidden group ${
                    isSelected
                      ? 'bg-amber-500/15 border-amber-500 text-amber-300 ring-1 ring-amber-500/50'
                      : 'bg-stone-950/50 border-stone-800 text-stone-300 hover:border-stone-700 hover:bg-stone-950'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row items-center justify-between sm:mb-0.5">
                    <span className="font-bold text-xs sm:text-sm">{opt.count} 題</span>
                    <span className="hidden sm:inline">{opt.icon}</span>
                  </div>
                  <p className="text-[10px] text-stone-400 font-medium">
                    {opt.count === 5 ? '快速熱身' : opt.count === 10 ? '標準挑戰' : '耐力大考驗'}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 3: Select Difficulty */}
        <div className="space-y-1 sm:space-y-1.5 pt-1">
          <div className="flex items-center justify-between">
            <h2 className="text-xs sm:text-sm font-bold text-stone-200 flex items-center gap-1.5">
              <span className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] sm:text-xs flex items-center justify-center font-mono">3</span>
              選擇難度等級
            </h2>
            <span className="text-[10px] sm:text-xs text-stone-400">當前題庫共 {totalCount} 題</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {difficultyOptions.map((opt) => {
              const isSelected = difficulty === opt.id;
              return (
                <button
                  key={opt.id}
                  id={`btn-diff-${opt.id}`}
                  onClick={() => setDifficulty(opt.id)}
                  className={`p-2 sm:p-2.5 rounded-lg sm:rounded-xl border text-left transition-all relative group ${
                    isSelected
                      ? `ring-2 ring-amber-500/60 border-amber-500 bg-stone-950`
                      : `bg-stone-950/50 border-stone-800 text-stone-300 hover:border-stone-700 hover:bg-stone-950`
                  }`}
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs sm:text-sm text-stone-100">{opt.title}</span>
                      <span className="text-[9px] sm:text-[10px] px-1.5 py-0.2 rounded-full bg-stone-800 text-stone-300 font-mono">
                        {opt.count}
                      </span>
                    </div>
                    <span className="text-[9px] font-medium text-stone-400 px-1 py-0.2 rounded bg-stone-800/80 hidden xs:inline">
                      {opt.tag}
                    </span>
                  </div>
                  <p className="text-[10px] sm:text-xs text-amber-400/90 font-medium truncate">{opt.sub}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Start Game Action */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-stone-800/60">
          <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-stone-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>
              {selectedCategories.length > 0 ? (
                <>
                  已鎖定：<span className="text-amber-300 font-medium">{selectedCategories.join('、')}</span>
                </>
              ) : (
                '涵蓋所有題庫分類 · 自動計算 CPM、準確率並保存紀錄'
              )}
            </span>
          </div>

          <button
            id="btn-start-challenge"
            onClick={onStartGame}
            className="w-full sm:w-auto px-5 sm:px-7 py-2 sm:py-2.5 rounded-lg sm:rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/25 active:scale-98 transition-all cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>
              {matchingDifficultyCount > 0 && matchingDifficultyCount < questionCount
                ? `開始挑戰 (現有 ${matchingDifficultyCount} 題)`
                : `開始 ${questionCount} 題挑戰`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
