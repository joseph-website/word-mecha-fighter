import React, { useState } from 'react';
import {
  HelpCircle,
  X,
  Monitor,
  Smartphone,
  Users,
  BookOpen,
  Keyboard,
  Target,
  Trophy,
  Zap,
  Flame,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  FileSpreadsheet,
  AlertCircle,
  RotateCcw,
  Send,
  Timer,
} from 'lucide-react';

interface InstructionModalProps {
  onClose: () => void;
  onOpenMultiplayer?: () => void;
  onOpenQuestionBank?: () => void;
}

export const InstructionModal: React.FC<InstructionModalProps> = ({
  onClose,
  onOpenMultiplayer,
  onOpenQuestionBank,
}) => {
  const [activeSection, setActiveSection] = useState<'all' | 'input' | 'rules' | 'multiplayer' | 'custom'>('all');

  return (
    <div
      id="instruction-modal-backdrop"
      className="fixed inset-0 z-50 bg-stone-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        id="instruction-modal-content"
        className="w-full max-w-3xl bg-stone-900 border border-stone-800 rounded-3xl shadow-2xl my-auto max-h-[90vh] flex flex-col overflow-hidden animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. 頂部標頭 (固定) */}
        <div className="px-5 sm:px-7 py-4 border-b border-stone-800 shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <HelpCircle className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-stone-100 flex items-center gap-2">
                <span>遊戲說明與操作指南</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono font-normal">
                  指南
                </span>
              </h2>
              <p className="text-xs text-stone-400">
                深入了解輸入操作、擊破審核規則、多人對戰與題庫自訂
              </p>
            </div>
          </div>

          <button
            id="btn-close-instructions"
            onClick={onClose}
            className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-stone-100 transition-colors cursor-pointer"
            title="關閉說明"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2. 快速分類導航標籤 (固定) */}
        <div className="px-5 sm:px-7 py-2.5 bg-stone-950/50 border-b border-stone-800/80 shrink-0 flex items-center gap-1.5 overflow-x-auto text-xs scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveSection('all')}
            className={`px-3 py-1.5 rounded-xl font-medium transition-all whitespace-nowrap cursor-pointer ${
              activeSection === 'all'
                ? 'bg-amber-500 text-stone-950 font-bold'
                : 'text-stone-400 hover:text-stone-200 bg-stone-950/80 border border-stone-800'
            }`}
          >
            全部說明
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('input')}
            className={`px-3 py-1.5 rounded-xl font-medium transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeSection === 'input'
                ? 'bg-amber-500 text-stone-950 font-bold'
                : 'text-stone-400 hover:text-stone-200 bg-stone-950/80 border border-stone-800'
            }`}
          >
            <Keyboard className="w-3.5 h-3.5" />
            <span>輸入與操作方式</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('rules')}
            className={`px-3 py-1.5 rounded-xl font-medium transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeSection === 'rules'
                ? 'bg-amber-500 text-stone-950 font-bold'
                : 'text-stone-400 hover:text-stone-200 bg-stone-950/80 border border-stone-800'
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            <span>擊破審核與評分</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('multiplayer')}
            className={`px-3 py-1.5 rounded-xl font-medium transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeSection === 'multiplayer'
                ? 'bg-amber-500 text-stone-950 font-bold'
                : 'text-stone-400 hover:text-stone-200 bg-stone-950/80 border border-stone-800'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>多人連線競速</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('custom')}
            className={`px-3 py-1.5 rounded-xl font-medium transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeSection === 'custom'
                ? 'bg-amber-500 text-stone-950 font-bold'
                : 'text-stone-400 hover:text-stone-200 bg-stone-950/80 border border-stone-800'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>題庫與 Excel 管理</span>
          </button>
        </div>

        {/* 3. 滾動主體內容區 */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 sm:px-7 py-5 space-y-6 text-stone-300">
          {/* 區塊一：輸入與操作方式 (依現行實裝邏輯精確說明) */}
          {(activeSection === 'all' || activeSection === 'input') && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-stone-100 font-bold text-sm sm:text-base border-b border-stone-800 pb-2">
                <Keyboard className="w-4 h-4 text-amber-400" />
                <span>輸入與操作方式</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* 電腦鍵盤操作 */}
                <div className="p-4 rounded-2xl bg-stone-950/70 border border-stone-800 space-y-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      <Monitor className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-stone-100 font-bold text-sm">電腦鍵盤原生操作</h4>
                      <p className="text-[11px] text-amber-400/90 font-medium">支援注音、拼音、倉頡等各類輸入法</p>
                    </div>
                  </div>
                  <ul className="text-xs text-stone-300 space-y-2 leading-relaxed">
                    <li className="flex items-start gap-2">
                      <span className="text-amber-400 font-bold">•</span>
                      <span><strong>整句輸入</strong>：於下方輸入框正常鍵入空中目標之中文詞句。</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-amber-400 font-bold">•</span>
                      <span><strong>發射送出</strong>：打完整句後，按下鍵盤 <kbd className="px-1.5 py-0.5 bg-stone-800 border border-stone-700 rounded text-[11px] font-mono text-amber-300">Enter</kbd> 鍵即可送出審核並觸發雷射攻擊。</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-amber-400 font-bold">•</span>
                      <span><strong>快捷清空</strong>：中途若想快速重新開始，可按 <kbd className="px-1.5 py-0.5 bg-stone-800 border border-stone-700 rounded text-[11px] font-mono text-amber-300">Esc</kbd> 鍵或點擊輸入框右側的清除按鈕。</span>
                    </li>
                  </ul>
                </div>

                {/* 手機與平板操作 */}
                <div className="p-4 rounded-2xl bg-stone-950/70 border border-stone-800 space-y-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      <Smartphone className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-stone-100 font-bold text-sm">手機與平板觸控輸入</h4>
                      <p className="text-[11px] text-amber-400/90 font-medium">系統原生軟體鍵盤 · 發射大按鈕</p>
                    </div>
                  </div>
                  <ul className="text-xs text-stone-300 space-y-2 leading-relaxed">
                    <li className="flex items-start gap-2">
                      <span className="text-amber-400 font-bold">•</span>
                      <span><strong>喚起鍵盤</strong>：點擊畫面下方的輸入欄位，即可自動彈出手機或平板的原生輸入法鍵盤。</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-amber-400 font-bold">•</span>
                      <span><strong>一鍵發射擊破</strong>：輸入完畢後，直接點擊輸入欄右側顯眼的金色 <span className="text-amber-300 font-bold">「發射擊破」</span> 按鈕（或軟體鍵盤上的前往 / 送出鍵）進行檢驗。</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-amber-400 font-bold">•</span>
                      <span><strong>自適應版面</strong>：介面針對觸控螢幕優化，保持打字視野清晰，避免遮擋空中題目。</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* 區塊二：擊破審核與評分機制 (說明送出、對錯反饋、重來罰則) */}
          {(activeSection === 'all' || activeSection === 'rules') && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-stone-100 font-bold text-sm sm:text-base border-b border-stone-800 pb-2">
                <Target className="w-4 h-4 text-amber-400" />
                <span>擊破審核規則與成績評級</span>
              </div>

              {/* 審核機制卡片 */}
              <div className="p-4 rounded-2xl bg-stone-950/70 border border-stone-800 space-y-3 text-xs leading-relaxed">
                <div className="font-bold text-stone-200 flex items-center gap-2">
                  <Send className="w-4 h-4 text-amber-400" />
                  <span>送出檢核與結果反饋：</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-stone-300">
                  <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-800/40 space-y-1.5">
                    <span className="text-emerald-400 font-bold text-xs flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      完全正確 · 雷射貫穿擊破
                    </span>
                    <p className="text-[11px] text-stone-300 leading-relaxed">
                      字元 100% 正確無誤時，砲台將發射金色雷射光束直接擊破空中句子，伴隨爆破特效並獲得 Combo 連擊 +1，系統自動推進下一題。
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-800/40 space-y-1.5">
                    <span className="text-rose-400 font-bold text-xs flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4" />
                      字元失誤 · 紅綠對比提示並重新輸入
                    </span>
                    <p className="text-[11px] text-stone-300 leading-relaxed">
                      若有錯字、漏字或多字，畫面將震動並標註對比（正確字為綠色、錯誤字為紅色）。<strong>輸入框會自動清空</strong>，玩家須從頭重新打一次，且連擊數歸零重計，以深化精準肌肉記憶。
                    </p>
                  </div>
                </div>

                <div className="pt-1 flex items-start gap-2 text-stone-400 text-[11px] bg-stone-900/60 p-2.5 rounded-xl border border-stone-800">
                  <Timer className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span><strong>開局 5 秒倒數熱身</strong>：倒數計時期間（5、4、3、2、1）可先點擊下方輸入框測試輸入法，倒數結束正式開打瞬間系統會自動清空測試內容並重新聚焦，確保公平公正計時。</span>
                </div>
              </div>

              {/* 難度分級 */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3.5 rounded-2xl bg-stone-950/60 border border-stone-800 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                    <Zap className="w-4 h-4" />
                    <span>初級挑戰 (Easy)</span>
                  </div>
                  <p className="text-stone-400 text-[11px] leading-relaxed">
                    短詞句、勵志小品與成語（約 4-12 字），適合暖手與建立穩定節奏。
                  </p>
                </div>
                <div className="p-3.5 rounded-2xl bg-stone-950/60 border border-stone-800 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                    <Flame className="w-4 h-4" />
                    <span>中級對決 (Medium)</span>
                  </div>
                  <p className="text-stone-400 text-[11px] leading-relaxed">
                    精選唐詩宋詞與流行歌詞（約 12-20 字），注重文句語韻與連擊手感。
                  </p>
                </div>
                <div className="p-3.5 rounded-2xl bg-stone-950/60 border border-stone-800 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-rose-400 font-bold">
                    <Trophy className="w-4 h-4" />
                    <span>高級極速 (Hard)</span>
                  </div>
                  <p className="text-stone-400 text-[11px] leading-relaxed">
                    長篇文言典故與散文（20 字以上），考驗長段落高抗壓專注與極速手感。
                  </p>
                </div>
              </div>

              {/* 結算數據與個人成績紀錄 */}
              <div className="p-4 rounded-2xl bg-stone-950/70 border border-stone-800 text-xs space-y-2">
                <span className="font-bold text-stone-200 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  數據統計與評級標準：
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-[11px]">
                  <div className="bg-stone-900/80 p-2 rounded-xl border border-stone-800 text-center">
                    <span className="text-amber-400 font-bold text-xs block">CPM</span>
                    每分鐘有效敲擊中文字數
                  </div>
                  <div className="bg-stone-900/80 p-2 rounded-xl border border-stone-800 text-center">
                    <span className="text-emerald-400 font-bold text-xs block">準確率 %</span>
                    正確字元佔總嘗試比例
                  </div>
                  <div className="bg-stone-900/80 p-2 rounded-xl border border-stone-800 text-center">
                    <span className="text-rose-400 font-bold text-xs block">Max Combo</span>
                    連續完全答對題數計數
                  </div>
                  <div className="bg-stone-900/80 p-2 rounded-xl border border-stone-800 text-center">
                    <span className="text-amber-300 font-bold text-xs block">評級 S+ ~ D</span>
                    結合速度與正確率綜合評定
                  </div>
                </div>
                <p className="text-[11px] text-stone-400 pt-1">
                  挑戰結算後可自訂暱稱並登記至「個人成績紀錄」，隨時在頂部「個人成績」查看最佳成就與歷史歷程。
                </p>
              </div>
            </div>
          )}

          {/* 區塊三：多人即時連線對決指南 */}
          {(activeSection === 'all' || activeSection === 'multiplayer') && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-stone-100 font-bold text-sm sm:text-base border-b border-stone-800 pb-2">
                <Users className="w-4 h-4 text-amber-400" />
                <span>多人連線競速對決 (WebRTC P2P 2-6 人)</span>
              </div>

              <div className="p-4 rounded-2xl bg-stone-950/70 border border-stone-800 space-y-3 text-xs leading-relaxed">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <span className="font-semibold text-stone-200">
                    免伺服器註冊 · 純瀏覽器低延遲點對點連線
                  </span>
                  {onOpenMultiplayer && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenMultiplayer();
                      }}
                      className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold flex items-center gap-1 transition-colors cursor-pointer text-xs"
                    >
                      <span>前往多人大廳</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-[11px] text-stone-300">
                  <div className="bg-stone-900/80 p-3 rounded-xl border border-stone-800">
                    <span className="text-amber-400 font-bold block mb-1">1. 建立專屬房間</span>
                    房主進入多人大廳點擊「建立新房間」，系統即時產生一組隨機 6 位數房間代碼與一鍵複製邀請連結。
                  </div>
                  <div className="bg-stone-900/80 p-3 rounded-xl border border-stone-800">
                    <span className="text-amber-400 font-bold block mb-1">2. 好友代碼入房</span>
                    好友點擊「加入房間」輸入 6 位代碼（或直接開啟邀請連結），即可無縫連線進入同一個準備室。
                  </div>
                  <div className="bg-stone-900/80 p-3 rounded-xl border border-stone-800">
                    <span className="text-amber-400 font-bold block mb-1">3. 同步跑道比拼</span>
                    全員就緒後由房主發起戰鬥。頂部即時跑道動態呈現所有人的題數推進、CPM 與名次，最快擊破完全部題目者奪冠！
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 區塊四：自訂題庫與試算表匯入 */}
          {(activeSection === 'all' || activeSection === 'custom') && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-stone-100 font-bold text-sm sm:text-base border-b border-stone-800 pb-2">
                <BookOpen className="w-4 h-4 text-amber-400" />
                <span>自訂題庫與 Excel (CSV) 試算表管理</span>
              </div>

              <div className="p-4 rounded-2xl bg-stone-950/70 border border-stone-800 space-y-3 text-xs leading-relaxed">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <span className="font-semibold text-stone-200 flex items-center gap-1.5">
                    <FileSpreadsheet className="w-4 h-4 text-amber-400" />
                    建立專屬文章、成語、歌詞或教材題庫：
                  </span>
                  {onOpenQuestionBank && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenQuestionBank();
                      }}
                      className="px-3 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-300 border border-stone-700 font-bold flex items-center gap-1 transition-colors cursor-pointer text-xs"
                    >
                      <span>開啟編輯題庫</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <ul className="space-y-1.5 text-stone-300 text-xs">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <span><strong>Excel 批次編輯</strong>：於「編輯題庫」中下載 CSV 範本檔，可在 Excel 或試算表中編輯「題目文字、分類、難度、註解」，再直接上傳檔案或複製貼上表格即刻套用。</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <span><strong>即時管理與檢視</strong>：支援單題新增、修改、刪除、難度過濾與即時文字搜尋。</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <span><strong>本地隱私儲存</strong>：所有自訂題目均保存在本機瀏覽器 LocalStorage，保障隱私且離線亦可練習。</span>
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* 4. 底部完成關閉列 (固定) */}
        <div className="px-5 sm:px-7 py-3.5 border-t border-stone-800 shrink-0 bg-stone-950/90 flex items-center justify-between gap-3 text-xs">
          <span className="text-stone-400 hidden sm:inline">
            妙語如珠，例不虛發 · 享受沉浸式中文盲打樂趣！
          </span>
          <button
            id="btn-close-instructions-footer"
            type="button"
            onClick={onClose}
            className="ml-auto px-6 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs sm:text-sm shadow-md shadow-amber-500/20 transition-all cursor-pointer"
          >
            我知道了，開始練習
          </button>
        </div>
      </div>
    </div>
  );
};
