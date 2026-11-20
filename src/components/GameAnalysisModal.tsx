import { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Award, 
  TrendingUp, 
  Copy, 
  Check, 
  HelpCircle, 
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  Eye,
  BarChart3,
  Upload,
  Sparkles,
  BookOpen,
  RotateCcw,
  Swords
} from 'lucide-react';
import { GameReviewReport, MoveQuality, GraphicStyle } from '../types/chess';
import { ChessService } from '../game/chessLogic';

interface GameAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: GameReviewReport;
  whiteName: string;
  blackName: string;
  pgn: string;
  fen: string;
  onPreviewPlyChange: (plyIndex: number, animateFromPrev: boolean, activeReport?: GameReviewReport) => void;
  onImportReport: (report: GameReviewReport, whiteName: string, blackName: string) => void;
  onPlayFromFen?: (fen: string) => void;
  onNewGame?: () => void;
  graphicStyle?: GraphicStyle;
  onToggleGraphicStyle?: () => void;
  onRotateCameraY?: (delta: number) => void;
  initialTab?: 'board' | 'details' | 'import';
}

const SAMPLE_OPERA_GAME_PGN = `[Event "Opera Game"]
[Site "Paris"]
[Date "1858.10.21"]
[White "Paul Morphy"]
[Black "Duke Karl / Count Isouard"]
[Result "1-0"]

1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7 8. Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5 11. Bxb5+ Nbd7 12. O-O-O Rd8 13. Rxd7 Rxd7 14. Rd1 Qe6 15. Bxd7+ Nxd7 16. Qb8+ Nxb8 17. Rd8# 1-0`;

const SAMPLE_SCHOLAR_MATE_PGN = `[Event "Scholar's Mate Tactical Demo"]
[White "攻撃側 (白)"]
[Black "防衛側 (黒)"]
[Result "1-0"]

1. e4 e5 2. Bc4 Nc6 3. Qh5 Nf6 4. Qxf7# 1-0`;

const SAMPLE_TACTICAL_FEN = `r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4`;

export function GameAnalysisModal({
  isOpen,
  onClose,
  report,
  whiteName,
  blackName,
  pgn,
  fen,
  onPreviewPlyChange,
  onImportReport,
  onPlayFromFen,
  onNewGame,
  graphicStyle = 'ultra',
  onToggleGraphicStyle,
  onRotateCameraY,
  initialTab = 'board',
}: GameAnalysisModalProps) {
  // plyIndex: 0 = initial board before move 1; 1 = after move 1 (report.moves[0]); etc.
  const [currentPly, setCurrentPly] = useState<number>(report.moves.length);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'board' | 'details' | 'import'>(initialTab);
  const [copiedPgn, setCopiedPgn] = useState(false);
  const [copiedFen, setCopiedFen] = useState(false);
  const [showGlossary, setShowGlossary] = useState(false);
  const importedInitialPlyRef = useRef<number | null>(null);

  // Import state
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);

  const totalPlies = report.moves.length;

  // When modal opens or report changes, sync initial preview ply
  useEffect(() => {
    if (!isOpen) {
      setIsPlaying(false);
      return;
    }
    if (importedInitialPlyRef.current !== null) {
      const targetPly = importedInitialPlyRef.current;
      importedInitialPlyRef.current = null;
      setViewMode('board');
      setCurrentPly(targetPly);
      onPreviewPlyChange(targetPly, targetPly === 1, report);
      return;
    }
    setViewMode(initialTab);
    const startPly = report.moves.length;
    setCurrentPly(startPly);
    onPreviewPlyChange(startPly, false, report);
  }, [isOpen, report, initialTab]);

  // Auto-play timer for 3D board step-by-step replay
  useEffect(() => {
    if (!isOpen || !isPlaying) return;
    if (currentPly >= totalPlies) {
      setIsPlaying(false);
      return;
    }

    const timer = window.setTimeout(() => {
      const nextPly = currentPly + 1;
      setCurrentPly(nextPly);
      onPreviewPlyChange(nextPly, true, report);
    }, 1350);

    return () => clearTimeout(timer);
  }, [isOpen, isPlaying, currentPly, totalPlies, report, onPreviewPlyChange]);

  if (!isOpen) return null;

  const currentMove = currentPly > 0 ? report.moves[currentPly - 1] : null;
  const activeFen = currentMove ? currentMove.fenAfter : (report.initialFen || fen);
  const activeEval = report.evalGraph[currentPly] ?? 0;

  const stepToPly = (targetPly: number, animate = false) => {
    const clamped = Math.max(0, Math.min(totalPlies, targetPly));
    const isSingleStepForward = animate && clamped === currentPly + 1;
    setCurrentPly(clamped);
    onPreviewPlyChange(clamped, isSingleStepForward, report);
  };

  const handleTogglePlay = () => {
    if (isPlaying) {
      setIsPlaying(false);
    } else {
      if (currentPly >= totalPlies) {
        setCurrentPly(0);
        onPreviewPlyChange(0, false, report);
      }
      setIsPlaying(true);
      setViewMode('board');
    }
  };

  const handleCopyPgn = () => {
    const textToCopy = report.pgn || pgn;
    navigator.clipboard.writeText(textToCopy);
    setCopiedPgn(true);
    setTimeout(() => setCopiedPgn(false), 2000);
  };

  const handleCopyFen = () => {
    navigator.clipboard.writeText(activeFen);
    setCopiedFen(true);
    setTimeout(() => setCopiedFen(false), 2000);
  };

  const handleLoadInputData = (rawText?: string) => {
    const target = rawText !== undefined ? rawText : importText;
    setImportError(null);
    setImportSuccess(null);

    const parsed = ChessService.parseAndGenerateReview(target);
    if (!parsed.ok || !parsed.report) {
      setImportError(parsed.error || '棋譜データの読み込みに失敗しました。');
      return;
    }

    setIsPlaying(false);
    const initialPly = parsed.type === 'fen' ? 0 : (parsed.report.moves.length > 0 ? 1 : 0);
    importedInitialPlyRef.current = initialPly;

    onImportReport(
      parsed.report,
      parsed.whiteName || '白番 (読込データ)',
      parsed.blackName || '黒番 (読込データ)'
    );
    setImportSuccess(
      parsed.type === 'fen'
        ? 'FEN（盤面配置データ）を読み込みました！3D盤面で配置を確認できます。'
        : `PGN（全 ${parsed.report.moves.length} 手の棋譜データ）を読み込みました！`
    );
  };

  const qualityBadge = (q: MoveQuality) => {
    switch (q) {
      case 'brilliant':
        return <span className="px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40 text-[11px]">!! Brilliant (大好手)</span>;
      case 'great':
      case 'best':
        return <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40 text-[11px]">! Best (最善手)</span>;
      case 'good':
        return <span className="px-2 py-0.5 rounded-md bg-sky-500/20 text-sky-300 border border-sky-500/30 text-[11px]">Good (着実な一手)</span>;
      case 'inaccuracy':
        return <span className="px-2 py-0.5 rounded-md bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 text-[11px]">?! 疑問手 (Inaccuracy)</span>;
      case 'mistake':
        return <span className="px-2 py-0.5 rounded-md bg-orange-500/20 text-orange-300 border border-orange-500/40 text-[11px]">? ミス (Mistake)</span>;
      case 'blunder':
        return <span className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 font-bold border border-rose-500/50 text-[11px]">?? 大悪手 (Blunder)</span>;
    }
  };

  // Convert centipawn eval [-1000, 1000] to white bar percentage [5%, 95%]
  const whiteBarPercent = Math.max(5, Math.min(95, 50 + (activeEval / 1000) * 45));

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col justify-between select-none transition-colors ${
        viewMode === 'board'
          ? 'pointer-events-none bg-transparent'
          : 'pointer-events-auto bg-black/80 backdrop-blur-xs p-3 sm:p-6 items-center justify-center'
      }`}
    >
      {/* =====================================================================
          MODE A: INTERACTIVE 3D BOARD PREVIEW MODE (実盤プレビューでの直感的な振り返り)
         ===================================================================== */}
      {viewMode === 'board' && (
        <>
          {/* 1. TOP FLOATING REVIEW HEADER */}
          <div className="w-full p-3 bg-gradient-to-b from-slate-950/95 via-slate-950/75 to-transparent pointer-events-auto">
            <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-2 bg-slate-900/90 border border-slate-700/80 rounded-2xl px-4 py-2.5 shadow-2xl">
              {/* Left: Title & Accuracy Summary */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                  <h2 className="text-sm sm:text-base font-black text-slate-100">
                    3D盤面プレビュー振り返り
                  </h2>
                </div>

                <div className="hidden sm:flex items-center gap-2 text-xs border-l border-slate-700 pl-3">
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-amber-300 font-mono font-bold">
                    白 ({whiteName}): 精度 {report.whiteAccuracy}%
                  </span>
                  <span className="text-slate-500">vs</span>
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-sky-300 font-mono font-bold">
                    黒 ({blackName}): 精度 {report.blackAccuracy}%
                  </span>
                </div>
              </div>

              {/* Right: Mode Switchers & Close */}
              <div className="flex items-center gap-1.5 sm:gap-2">
                {onToggleGraphicStyle && (
                  <button
                    onClick={onToggleGraphicStyle}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] font-semibold text-amber-300 flex items-center gap-1 transition cursor-pointer"
                    title="3D駒の見た目を切り替え"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span className="hidden md:inline">
                      {graphicStyle === 'ultra' ? '極限リアル (人間)' : 'クラシック (彫像)'}
                    </span>
                  </button>
                )}

                {onRotateCameraY && (
                  <button
                    onClick={() => onRotateCameraY(Math.PI / 6)}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] text-slate-200 transition cursor-pointer"
                    title="カメラを回転して別角度から盤面を確認"
                  >
                    ↻ 視点回転
                  </button>
                )}

                <button
                  onClick={() => setViewMode('import')}
                  className="px-2.5 py-1.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/50 text-indigo-200 text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>棋譜読込・PGN/FENとは？</span>
                </button>

                <button
                  onClick={() => setViewMode('details')}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                >
                  <BarChart3 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>統計グラフ</span>
                </button>

                {onNewGame && (
                  <button
                    onClick={() => {
                      setIsPlaying(false);
                      onNewGame();
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black flex items-center gap-1 transition cursor-pointer shadow-sm"
                    title="振り返りを終了して新しい対局を開始します"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>新規対局</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setIsPlaying(false);
                    onClose();
                  }}
                  className="px-3 py-1.5 rounded-lg bg-rose-950/80 hover:bg-rose-900 border border-rose-700/70 text-rose-200 text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                  <span>閉じる</span>
                </button>
              </div>
            </div>
          </div>

          {/* 2. LEFT SIDE LIVE EVALUATION BAR (Non-obstructive) */}
          <div className="px-4 my-auto hidden sm:flex items-center pointer-events-auto">
            <div className="bg-slate-900/90 border border-slate-700/80 rounded-2xl p-2 shadow-xl flex flex-col items-center gap-1.5">
              <span className="text-[10px] font-bold text-slate-400">形勢</span>
              <div className="w-4 h-48 rounded-full bg-slate-800 overflow-hidden flex flex-col border border-slate-600 relative">
                {/* Black portion on top */}
                <div
                  className="w-full bg-slate-900 transition-all duration-300"
                  style={{ height: `${100 - whiteBarPercent}%` }}
                />
                {/* White portion on bottom */}
                <div
                  className="w-full bg-amber-300 transition-all duration-300"
                  style={{ height: `${whiteBarPercent}%` }}
                />
                {/* Midline */}
                <div className="absolute left-0 right-0 top-1/2 border-b border-rose-500/60" />
              </div>
              <span
                className={`text-[11px] font-mono font-bold ${
                  activeEval >= 0 ? 'text-amber-300' : 'text-sky-300'
                }`}
              >
                {activeEval > 0
                  ? `+${(activeEval / 100).toFixed(1)}`
                  : (activeEval / 100).toFixed(1)}
              </span>
            </div>
          </div>

          {/* 3. BOTTOM 3D BOARD REPLAY CONTROLLER DOCK */}
          <div className="w-full max-w-4xl mx-auto px-3 pb-3 pointer-events-auto">
            <div className="bg-slate-950/95 border border-slate-700/90 rounded-2xl p-3 sm:p-4 shadow-2xl space-y-3 text-slate-100">
              {/* Current Move Commentary & Action Row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-900/90 border border-slate-800 rounded-xl p-3">
                <div className="space-y-1">
                  {currentMove ? (
                    <>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-black text-amber-300 font-mono">
                          第 {currentMove.moveIndex} 手 ({currentMove.player === 'w' ? '白番' : '黒番'}): {currentMove.san}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">
                          [{currentMove.from} → {currentMove.to}]
                        </span>
                        {qualityBadge(currentMove.quality)}
                        {currentMove.bestMoveSan && currentMove.quality !== 'best' && currentMove.quality !== 'brilliant' && (
                          <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 font-mono">
                            推奨最善手: {currentMove.bestMoveSan}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {currentMove.explanation}
                      </p>
                    </>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm font-bold text-slate-200 block">
                          {totalPlies > 0
                            ? '開始局面 (0手目) — 下の再生ボタンまたは手番リストで3D盤面を動かせます'
                            : 'FEN局面プレビュー中 — 盤面を自由に回転・拡大して確認できます'}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          「▶ 自動再生」または「1手進む」を押すと、3D盤面上で実際に駒が動いて対局を再現します。
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right side of commentary box: Eval & Play from this position */}
                <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block">現在局面の評価値</span>
                    <span
                      className={`font-mono font-black text-sm ${
                        activeEval >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {activeEval > 0
                        ? `+${(activeEval / 100).toFixed(1)} (白有利)`
                        : activeEval < 0
                        ? `${(activeEval / 100).toFixed(1)} (黒有利)`
                        : '0.0 (互角)'}
                    </span>
                  </div>

                  {onPlayFromFen && (
                    <button
                      onClick={() => {
                        setIsPlaying(false);
                        onPlayFromFen(activeFen);
                      }}
                      className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-300 rounded-lg text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                      title="今プレビューしているこの盤面状態から実際に対局を再開します"
                    >
                      <Swords className="w-3 h-3" />
                      <span>この局面から指す</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Playback Controls & Scrubber Row */}
              <div className="flex flex-col sm:flex-row items-center gap-3">
                {/* Transport Buttons */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      setIsPlaying(false);
                      stepToPly(0, false);
                    }}
                    disabled={currentPly === 0}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 transition cursor-pointer"
                    title="最初の局面へ戻る"
                  >
                    <SkipBack className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => {
                      setIsPlaying(false);
                      stepToPly(currentPly - 1, false);
                    }}
                    disabled={currentPly === 0}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                    title="1手戻る"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>前へ</span>
                  </button>

                  <button
                    onClick={handleTogglePlay}
                    disabled={totalPlies === 0}
                    className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition shadow-lg cursor-pointer ${
                      isPlaying
                        ? 'bg-rose-500 hover:bg-rose-400 text-white'
                        : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                    } disabled:opacity-40`}
                  >
                    {isPlaying ? (
                      <>
                        <Pause className="w-4 h-4 fill-current" />
                        <span>一時停止</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 fill-current" />
                        <span>自動再生</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => {
                      setIsPlaying(false);
                      stepToPly(currentPly + 1, true);
                    }}
                    disabled={currentPly >= totalPlies}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                    title="1手進む (3D盤面でアニメーション再生)"
                  >
                    <span>次へ</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => {
                      setIsPlaying(false);
                      stepToPly(totalPlies, false);
                    }}
                    disabled={currentPly >= totalPlies}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 transition cursor-pointer"
                    title="最終局面へ進む"
                  >
                    <SkipForward className="w-4 h-4" />
                  </button>
                </div>

                {/* Timeline Slider */}
                <div className="flex-1 w-full flex items-center gap-2">
                  <span className="text-[11px] font-mono text-slate-400 shrink-0">
                    {currentPly} / {totalPlies} 手
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={Math.max(totalPlies, 1)}
                    value={currentPly}
                    disabled={totalPlies === 0}
                    onChange={(e) => {
                      setIsPlaying(false);
                      const next = parseInt(e.target.value, 10);
                      stepToPly(next, next === currentPly + 1);
                    }}
                    className="w-full accent-amber-400 cursor-pointer h-2 bg-slate-800 rounded-lg"
                  />
                </div>
              </div>

              {/* Horizontal Move Strip for Instant Jump */}
              {totalPlies > 0 && (
                <div className="flex items-center gap-1.5 overflow-x-auto py-1 px-1 bg-slate-900/70 rounded-xl border border-slate-800/80 font-mono">
                  <button
                    onClick={() => {
                      setIsPlaying(false);
                      stepToPly(0, false);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] shrink-0 transition cursor-pointer ${
                      currentPly === 0
                        ? 'bg-amber-400 text-slate-950 font-bold'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    開始(0)
                  </button>

                  {report.moves.map((m, idx) => {
                    const ply = idx + 1;
                    const moveNum = Math.floor(idx / 2) + 1;
                    const prefix = m.player === 'w' ? `${moveNum}.` : `${moveNum}...`;
                    const isSelected = currentPly === ply;

                    return (
                      <button
                        key={ply}
                        onClick={() => {
                          setIsPlaying(false);
                          stepToPly(ply, ply === currentPly + 1);
                        }}
                        className={`px-2 py-1 rounded-lg text-[11px] shrink-0 transition cursor-pointer flex items-center gap-1 ${
                          isSelected
                            ? 'bg-amber-400 text-slate-950 font-black shadow-md'
                            : m.quality === 'blunder'
                            ? 'bg-rose-950/90 text-rose-300 border border-rose-700/80'
                            : m.quality === 'mistake'
                            ? 'bg-orange-950/90 text-orange-300 border border-orange-700/80'
                            : m.quality === 'brilliant'
                            ? 'bg-cyan-950/90 text-cyan-300 border border-cyan-500/80'
                            : 'bg-slate-800/90 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        <span className="opacity-70 text-[10px]">{prefix}</span>
                        <span>{m.san}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* =====================================================================
          MODE B & C: FULL DETAILS / STATS / PGN & FEN EXPLANATION & IMPORT MODAL
         ===================================================================== */}
      {viewMode !== 'board' && (
        <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-3xl w-full shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-slate-100">
          {/* Header with Tabs */}
          <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-400" />
              <h2 className="text-base sm:text-lg font-bold">対戦分析・棋譜データ (PGN / FEN)</h2>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setViewMode('board')}
                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black flex items-center gap-1.5 transition cursor-pointer shadow-md"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>3D盤面プレビューに戻る</span>
              </button>

              <button
                onClick={() => setViewMode('details')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  viewMode === 'details'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                統計グラフ
              </button>

              <button
                onClick={() => setViewMode('import')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  viewMode === 'import'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                棋譜読込・PGN/FEN解説
              </button>

              <button
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content Body */}
          <div className="p-4 overflow-y-auto flex-1 space-y-4">
            {/* Beginner-Friendly PGN / FEN Explanation Banner (Always accessible) */}
            <div className="p-3.5 bg-indigo-950/40 border border-indigo-500/40 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-indigo-300 font-bold text-xs sm:text-sm">
                  <BookOpen className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span>用語ガイド：「PGN」と「FEN」ってなに？</span>
                </div>
                {viewMode === 'details' && (
                  <button
                    onClick={() => setShowGlossary(!showGlossary)}
                    className="text-[11px] text-indigo-300 hover:text-indigo-200 underline cursor-pointer"
                  >
                    {showGlossary ? '解説を閉じる' : '詳しい意味を見る'}
                  </button>
                )}
              </div>

              {(viewMode === 'import' || showGlossary) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
                  <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-700/80 space-y-1">
                    <span className="font-bold text-amber-300 block">
                      🎬 PGN（ピージーエヌ）＝「対局の録画データ（全手順）」
                    </span>
                    <p className="text-slate-300 leading-relaxed text-[11px]">
                      1手目から最後までの<strong>「どの駒をどこへ動かしたか」のすべての手順</strong>を記録したテキストです。
                      PGNを読み込むと、1手目から順番に3D盤面を動かして対局を振り返ることができます。
                    </p>
                    <div className="text-[10px] font-mono text-slate-400 bg-slate-950 p-1.5 rounded">
                      例: 1. e4 e5 2. Nf3 Nc6 3. Bb5 ...
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-700/80 space-y-1">
                    <span className="font-bold text-sky-300 block">
                      📸 FEN（エフイーエヌ）＝「盤面の写真（駒の配置図）」
                    </span>
                    <p className="text-slate-300 leading-relaxed text-[11px]">
                      ある1つの瞬間の<strong>「どのマスにどの駒が置かれているか」の盤面状態</strong>を1行で表したコードです。
                      途中の気になる場面だけを保存したり、その局面から対局を再開したい時に使います。
                    </p>
                    <div className="text-[10px] font-mono text-slate-400 bg-slate-950 p-1.5 rounded truncate">
                      例: rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1
                    </div>
                  </div>
                </div>
              )}
            </div>

            {viewMode === 'details' ? (
              <>
                {/* Accuracy Score Cards */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-800/80 border border-slate-700/80 p-3.5 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-xs text-slate-400 block">{whiteName} (白番)</span>
                      <span className="text-2xl font-black text-slate-100 font-mono">
                        {report.whiteAccuracy}%
                      </span>
                      <span className="text-[11px] text-slate-400 block mt-0.5">指し手精度</span>
                    </div>
                    <div className="w-12 h-12 rounded-full border-4 border-amber-400/80 flex items-center justify-center text-xs font-bold text-amber-300 bg-amber-950/20 font-mono">
                      {report.whiteAccuracy}
                    </div>
                  </div>

                  <div className="bg-slate-800/80 border border-slate-700/80 p-3.5 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-xs text-slate-400 block">{blackName} (黒番)</span>
                      <span className="text-2xl font-black text-slate-100 font-mono">
                        {report.blackAccuracy}%
                      </span>
                      <span className="text-[11px] text-slate-400 block mt-0.5">指し手精度</span>
                    </div>
                    <div className="w-12 h-12 rounded-full border-4 border-sky-400/80 flex items-center justify-center text-xs font-bold text-sky-300 bg-sky-950/20 font-mono">
                      {report.blackAccuracy}
                    </div>
                  </div>
                </div>

                {/* Move Quality Counters */}
                <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
                  <span className="text-xs font-semibold text-slate-300 mb-2 block">
                    指し手クオリティ統計 (白 / 黒):
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="p-2 rounded-lg bg-slate-900 border border-cyan-500/30 flex items-center justify-between">
                      <span className="text-cyan-300 font-medium">!! 大好手</span>
                      <span className="font-mono font-bold text-slate-200">
                        {report.brilliantMoves.w} / {report.brilliantMoves.b}
                      </span>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-900 border border-yellow-500/30 flex items-center justify-between">
                      <span className="text-yellow-300 font-medium">?! 疑問手</span>
                      <span className="font-mono font-bold text-slate-200">
                        {report.inaccuracies.w} / {report.inaccuracies.b}
                      </span>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-900 border border-orange-500/30 flex items-center justify-between">
                      <span className="text-orange-300 font-medium">? ミス</span>
                      <span className="font-mono font-bold text-slate-200">
                        {report.mistakes.w} / {report.mistakes.b}
                      </span>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-900 border border-rose-500/30 flex items-center justify-between">
                      <span className="text-rose-300 font-medium">?? 大悪手</span>
                      <span className="font-mono font-bold text-slate-200">
                        {report.blunders.w} / {report.blunders.b}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Interactive Evaluation Graph SVG */}
                <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4 text-emerald-400" />
                      <span>戦況評価値推移 (グラフをクリックするとその手番の3D盤面へ移動します)</span>
                    </span>
                    <span className="text-[10px] text-slate-400">
                      +上: 白有利 · -下: 黒有利
                    </span>
                  </div>

                  <div
                    className="h-28 w-full bg-slate-900 rounded-lg p-2 relative overflow-hidden flex items-center cursor-pointer"
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                      const targetPly = Math.round(ratio * totalPlies);
                      stepToPly(targetPly, false);
                      setViewMode('board');
                    }}
                    title="クリックした位置の手番を3D盤面でプレビューします"
                  >
                    <div className="absolute left-0 right-0 top-1/2 border-b border-dashed border-slate-700" />
                    <svg
                      className="w-full h-full overflow-visible"
                      preserveAspectRatio="none"
                      viewBox={`0 0 ${Math.max(report.evalGraph.length - 1, 1)} 100`}
                    >
                      <polyline
                        fill="none"
                        stroke="#38bdf8"
                        strokeWidth="2.5"
                        points={report.evalGraph
                          .map((val, idx) => {
                            const clamped = Math.max(-1000, Math.min(1000, val));
                            const y = 50 - (clamped / 1000) * 45;
                            return `${idx},${y}`;
                          })
                          .join(' ')}
                      />
                    </svg>
                  </div>
                </div>

                {/* Export PGN and FEN with clear explanations */}
                <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="text-xs font-bold text-slate-200 block">
                        現在の棋譜・盤面データの保存（コピー）
                      </span>
                      <span className="text-[11px] text-slate-400">
                        コピーしたデータは「棋譜読込」からいつでも貼り付けて3D盤面で再現できます。
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={handleCopyPgn}
                        className="px-3 py-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                      >
                        {copiedPgn ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                        <span>PGNをコピー（1手目からの全手順）</span>
                      </button>

                      <button
                        onClick={handleCopyFen}
                        className="px-3 py-2 bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/40 text-sky-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                      >
                        {copiedFen ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                        <span>FENをコピー（現在の盤面配置図）</span>
                      </button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              /* ===============================================================
                 IMPORT TAB: Paste PGN / FEN or Load Sample Game for 3D Preview
                 =============================================================== */
              <div className="space-y-4">
                <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs sm:text-sm font-bold text-slate-200 flex items-center gap-1.5">
                      <Upload className="w-4 h-4 text-amber-400" />
                      <span>棋譜データ（PGN手順 または FEN盤面配置）を貼り付けてプレビュー</span>
                    </label>
                    <button
                      onClick={() => {
                        setImportText('');
                        setImportError(null);
                        setImportSuccess(null);
                      }}
                      className="text-[11px] text-slate-400 hover:text-slate-200 cursor-pointer"
                    >
                      入力欄をクリア
                    </button>
                  </div>

                  <textarea
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    placeholder={`ここに PGN（例: 1. e4 e5 2. Nf3 Nc6 ...）または FEN（例: rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1）を貼り付けてください`}
                    rows={5}
                    className="w-full p-3 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                  />

                  {importError && (
                    <div className="p-2.5 rounded-lg bg-rose-950/80 border border-rose-700 text-rose-200 text-xs">
                      {importError}
                    </div>
                  )}

                  {importSuccess && (
                    <div className="p-2.5 rounded-lg bg-emerald-950/80 border border-emerald-700 text-emerald-200 text-xs">
                      {importSuccess}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] text-slate-400 mr-1">お試しサンプル読込:</span>
                      <button
                        onClick={() => {
                          setImportText(SAMPLE_OPERA_GAME_PGN);
                          handleLoadInputData(SAMPLE_OPERA_GAME_PGN);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-[11px] transition cursor-pointer"
                      >
                        ★ 名局「オペラ座の対局」(PGN)
                      </button>
                      <button
                        onClick={() => {
                          setImportText(SAMPLE_SCHOLAR_MATE_PGN);
                          handleLoadInputData(SAMPLE_SCHOLAR_MATE_PGN);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 text-[11px] transition cursor-pointer"
                      >
                        ★ 4手詰めスコラ・メイト (PGN)
                      </button>
                      <button
                        onClick={() => {
                          setImportText(SAMPLE_TACTICAL_FEN);
                          handleLoadInputData(SAMPLE_TACTICAL_FEN);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 text-[11px] transition cursor-pointer"
                      >
                        ★ イタリアン・ゲーム中盤配置 (FEN)
                      </button>
                    </div>

                    <button
                      onClick={() => handleLoadInputData()}
                      className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 shadow-lg transition cursor-pointer"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span>読み込んで3D盤面で振り返る</span>
                    </button>
                  </div>
                </div>

                {/* Current Game PGN & FEN Viewer Box */}
                <div className="p-4 bg-slate-950/50 border border-slate-800 rounded-xl space-y-3 text-xs">
                  <span className="font-bold text-slate-300 block">
                    現在表示中の対局データ（クリックでコピー可能）
                  </span>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-amber-300 font-semibold">
                        PGN（1手目からの全手順データ）:
                      </span>
                      <button
                        onClick={handleCopyPgn}
                        className="text-[11px] text-slate-300 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
                      >
                        {copiedPgn ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedPgn ? 'コピーしました！' : 'PGNをコピー'}</span>
                      </button>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 font-mono text-[11px] text-slate-300 max-h-24 overflow-y-auto break-all">
                      {report.pgn || pgn || '（まだ指し手がありません）'}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-sky-300 font-semibold">
                        FEN（現在選択中の第 {currentPly} 手目の盤面配置コード）:
                      </span>
                      <button
                        onClick={handleCopyFen}
                        className="text-[11px] text-slate-300 hover:text-sky-300 flex items-center gap-1 cursor-pointer"
                      >
                        {copiedFen ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedFen ? 'コピーしました！' : 'FENをコピー'}</span>
                      </button>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 font-mono text-[11px] text-slate-300 break-all">
                      {activeFen}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
            <button
              onClick={() => setViewMode('board')}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer"
            >
              <Eye className="w-4 h-4" />
              <span>3D盤面を動かして振り返る</span>
            </button>

            <button
              onClick={onClose}
              className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition cursor-pointer"
            >
              レビューを閉じる
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
