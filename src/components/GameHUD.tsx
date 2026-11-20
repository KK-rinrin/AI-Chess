import { useState } from 'react';
import { Color } from 'chess.js';
import { 
  ChevronUp, 
  ChevronDown, 
  RotateCcw, 
  Flag, 
  Handshake, 
  Volume2, 
  VolumeX, 
  Compass, 
  ScrollText, 
  ShieldAlert, 
  Eye, 
  SlidersHorizontal,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { GameMode, GraphicStyle } from '../types/chess';

interface GameHUDProps {
  turn: Color;
  playerColor: Color;
  gameMode: GameMode;
  whitePlayerName: string;
  blackPlayerName: string;
  whiteRating?: number;
  blackRating?: number;
  isCheck: boolean;
  history: string[];
  capturedWhite: string[];
  capturedBlack: string[];
  cameraAngleY: number;
  onRotateCameraY: (delta: number) => void;
  onZoomCamera?: (delta: number) => void;
  onSetCameraPreset: (preset: 'white' | 'black' | 'side' | 'top' | 'isometric') => void;
  onUndo: () => void;
  onResign: () => void;
  onDrawOffer: () => void;
  onFlipBoard: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onOpenAnalysis: () => void;
  onOpenHistory: () => void;
  onNewGame: () => void;
  aiThinking: boolean;
  aiCommentary?: string;
  graphicStyle?: GraphicStyle;
  onToggleGraphicStyle?: () => void;
}

export function GameHUD({
  turn,
  playerColor,
  gameMode,
  whitePlayerName,
  blackPlayerName,
  whiteRating,
  blackRating,
  isCheck,
  history,
  capturedWhite,
  capturedBlack,
  cameraAngleY,
  onRotateCameraY,
  onZoomCamera,
  onSetCameraPreset,
  onUndo,
  onResign,
  onDrawOffer,
  onFlipBoard,
  soundEnabled,
  onToggleSound,
  onOpenAnalysis,
  onOpenHistory,
  onNewGame,
  aiThinking,
  aiCommentary,
  graphicStyle = 'ultra',
  onToggleGraphicStyle,
}: GameHUDProps) {
  const [isDockCollapsed, setIsDockCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<'moves' | 'tactics' | 'camera' | 'controls'>('moves');

  const isWhiteTurn = turn === 'w';

  // Format captured pieces
  const pieceSymbols: Record<string, string> = {
    p: '♟', n: '♞', b: '♝', r: '♜', q: '♛', k: '♚'
  };

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between overflow-hidden select-none font-sans">
      {/* 1. TOP STATUS BAR (Perimeter cluster, low occlusion) */}
      <div className="w-full p-3 flex flex-wrap items-center justify-between gap-2 bg-gradient-to-b from-slate-950/80 via-slate-900/60 to-transparent pointer-events-auto">
        {/* Black Player Card (Top Left) */}
        <div className="flex items-center gap-2.5 bg-slate-900/80 border border-slate-700/60 rounded-xl px-3.5 py-1.5 shadow-lg">
          <div className={`w-3.5 h-3.5 rounded-full border border-slate-500 ${!isWhiteTurn ? 'bg-amber-400 ring-2 ring-amber-400/50' : 'bg-slate-700'}`} />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-200">{blackPlayerName}</span>
              {blackRating && (
                <span className="text-[10px] px-1.5 py-0.2 bg-slate-800 text-amber-400 rounded-sm font-mono font-semibold">
                  {blackRating}
                </span>
              )}
            </div>
            <div className="text-[11px] text-slate-400 flex items-center gap-1">
              <span>黒番</span>
              <span className="text-slate-500">·</span>
              <span className="text-xs tracking-wider font-mono">
                {capturedWhite.map((p, idx) => (
                  <span key={idx} className="text-slate-300">{pieceSymbols[p] || p}</span>
                ))}
              </span>
            </div>
          </div>
        </div>

        {/* Center Game Banner (Check indicator, Graphic Style Toggle & Mode) */}
        <div className="flex items-center gap-2">
          {isCheck && (
            <div className="px-3 py-1 rounded-full bg-rose-950/90 border border-rose-500/80 text-rose-300 text-xs font-bold shadow-lg flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
              <span>CHECK (王手)</span>
            </div>
          )}

          {aiThinking && (
            <div className="px-3 py-1 rounded-full bg-sky-950/90 border border-sky-500/80 text-sky-300 text-xs font-medium shadow-lg flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
              <span>AI思考中...</span>
            </div>
          )}

          {/* Graphic Style Switcher Button */}
          {onToggleGraphicStyle && (
            <button
              onClick={onToggleGraphicStyle}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-md cursor-pointer border ${
                graphicStyle === 'ultra'
                  ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-500/50 shadow-amber-500/10'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
              title="極限リアル(人間キャラクター) ⇄ クラシック(チェス駒) 切り替え"
            >
              <Sparkles className={`w-3.5 h-3.5 ${graphicStyle === 'ultra' ? 'text-amber-400' : 'text-slate-400'}`} />
              <span>{graphicStyle === 'ultra' ? '極限リアル (人間) ✦' : 'クラシック (駒)'}</span>
            </button>
          )}

          <button
            onClick={onNewGame}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-300 rounded-lg transition cursor-pointer"
          >
            対局設定
          </button>
          <button
            onClick={onOpenHistory}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-300 rounded-lg transition cursor-pointer"
          >
            履歴
          </button>
        </div>

        {/* White Player Card (Top Right) */}
        <div className="flex items-center gap-2.5 bg-slate-900/80 border border-slate-700/60 rounded-xl px-3.5 py-1.5 shadow-lg">
          <div className="text-right">
            <div className="flex items-center justify-end gap-1.5">
              {whiteRating && (
                <span className="text-[10px] px-1.5 py-0.2 bg-slate-800 text-amber-400 rounded-sm font-mono font-semibold">
                  {whiteRating}
                </span>
              )}
              <span className="text-xs font-bold text-slate-200">{whitePlayerName}</span>
            </div>
            <div className="text-[11px] text-slate-400 flex items-center justify-end gap-1">
              <span className="text-xs tracking-wider font-mono">
                {capturedBlack.map((p, idx) => (
                  <span key={idx} className="text-slate-400">{pieceSymbols[p] || p}</span>
                ))}
              </span>
              <span className="text-slate-500">·</span>
              <span>白番</span>
            </div>
          </div>
          <div className={`w-3.5 h-3.5 rounded-full border border-slate-500 ${isWhiteTurn ? 'bg-amber-400 ring-2 ring-amber-400/50' : 'bg-slate-300'}`} />
        </div>
      </div>

      {/* AI Grandmaster Commentary Bubble (if active) */}
      {aiCommentary && (
        <div className="mx-auto my-2 max-w-md bg-slate-900/90 border border-sky-500/40 text-slate-200 px-4 py-2 rounded-xl shadow-xl text-xs pointer-events-auto flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-sky-400 shrink-0" />
          <p className="line-clamp-2">{aiCommentary}</p>
        </div>
      )}

      {/* 2. Sleek Collapsible Bottom Dock (pinned bottom-center, max-w-4xl) */}
      <div className="w-full max-w-3xl mx-auto px-4 pb-4 pointer-events-auto flex flex-col items-center">
        {/* Collapse / Expand Toggle Button */}
        <button
          onClick={() => setIsDockCollapsed(!isDockCollapsed)}
          className="mb-1 px-3 py-1 bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 rounded-t-lg text-[11px] text-slate-300 flex items-center gap-1 transition shadow-lg cursor-pointer"
        >
          {isDockCollapsed ? (
            <>
              <ChevronUp className="w-3.5 h-3.5 text-amber-400" />
              <span>戦術ドック展開</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              <span>全画面シアター表示 (格納)</span>
            </>
          )}
        </button>

        {/* Dock Container */}
        {!isDockCollapsed && (
          <div className="w-full bg-slate-950/90 border border-slate-800/90 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-none transition-all">
            {/* Dock Header Tabs */}
            <div className="flex border-b border-slate-800 text-xs">
              <button
                onClick={() => setActiveTab('moves')}
                className={`flex-1 py-2 px-3 flex items-center justify-center gap-1.5 border-b-2 font-medium transition cursor-pointer ${
                  activeTab === 'moves'
                    ? 'border-amber-400 text-amber-300 bg-slate-900/60'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <ScrollText className="w-3.5 h-3.5" />
                <span>棋譜履歴 ({history.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('tactics')}
                className={`flex-1 py-2 px-3 flex items-center justify-center gap-1.5 border-b-2 font-medium transition cursor-pointer ${
                  activeTab === 'tactics'
                    ? 'border-amber-400 text-amber-300 bg-slate-900/60'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>武器＆マス判定</span>
              </button>

              <button
                onClick={() => setActiveTab('camera')}
                className={`flex-1 py-2 px-3 flex items-center justify-center gap-1.5 border-b-2 font-medium transition cursor-pointer ${
                  activeTab === 'camera'
                    ? 'border-amber-400 text-amber-300 bg-slate-900/60'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Compass className="w-3.5 h-3.5" />
                <span>視点＆遠近・回転</span>
              </button>

              <button
                onClick={() => setActiveTab('controls')}
                className={`flex-1 py-2 px-3 flex items-center justify-center gap-1.5 border-b-2 font-medium transition cursor-pointer ${
                  activeTab === 'controls'
                    ? 'border-amber-400 text-amber-300 bg-slate-900/60'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>操作</span>
              </button>
            </div>

            {/* Dock Content Body */}
            <div className="p-3 text-xs max-h-36 overflow-y-auto">
              {/* TAB 1: Moves */}
              {activeTab === 'moves' && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>着手履歴 (タップした駒はマスが色分けされます)</span>
                    <button
                      onClick={onOpenAnalysis}
                      className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[11px] font-bold transition cursor-pointer shadow-sm"
                    >
                      3D盤面で振り返り・棋譜読込
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto font-mono">
                    {history.length === 0 ? (
                      <span className="text-slate-500 text-[11px] py-1">手番開始。駒をタップして移動先を選択してください。</span>
                    ) : (
                      history.map((san, idx) => {
                        const moveNum = Math.floor(idx / 2) + 1;
                        const isWhiteMove = idx % 2 === 0;
                        return (
                          <span
                            key={idx}
                            className={`px-1.5 py-0.5 rounded text-[11px] ${
                              idx === history.length - 1
                                ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40 font-bold'
                                : 'bg-slate-800/80 text-slate-300'
                            }`}
                          >
                            {isWhiteMove ? `${moveNum}. ${san}` : san}
                          </span>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: Tactical rules legend */}
              {activeTab === 'tactics' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                    <span className="font-bold text-slate-200 block mb-1">【マスのオーバーレイ色】</span>
                    <ul className="space-y-1 text-slate-300">
                      <li className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full bg-blue-500 shadow-sm shrink-0" />
                        <span><strong className="text-blue-300">青色マス</strong>: 安全なマス (無防備な敵駒マスも含む)</span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full bg-amber-400 shadow-sm shrink-0" />
                        <span><strong className="text-amber-300">黄色マス</strong>: 敵の効き・守りがある交戦域</span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full border-2 border-red-500 bg-transparent shrink-0" />
                        <span><strong className="text-red-400">足元に赤丸</strong>: 選択した駒で捕獲できる敵駒</span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full bg-rose-500 flex items-center justify-center text-[9px] text-white font-bold shrink-0">✕</span>
                        <span><strong className="text-rose-300">バツ印</strong>: 違反するマス (移動不能・ピン状態)</span>
                      </li>
                    </ul>
                  </div>

                  <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-200">【駒のアニメーションと武器】</span>
                      {onToggleGraphicStyle && (
                        <button
                          onClick={onToggleGraphicStyle}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 transition cursor-pointer"
                        >
                          {graphicStyle === 'ultra' ? '極限リアル中' : 'クラシック中'}
                        </button>
                      )}
                    </div>
                    <ul className="space-y-1 text-slate-300">
                      <li>
                        <span className="text-rose-400 font-semibold">恐怖（震え）</span>: 無防備に狙われ全身がガタガタ震え縮こまる
                      </li>
                      <li>
                        <span className="text-amber-400 font-semibold">構える</span>: 敵を狙い身を乗り出して武器を攻撃態勢に構える
                      </li>
                      <li>
                        <span className="text-emerald-400 font-semibold">携える</span>: 味方を護衛し重心を落として武器を胸前に携える
                      </li>
                      <li>
                        <span className="text-sky-300 font-semibold">通常時 / 捕獲攻撃</span>: 待機呼吸モーション ／ 捕獲時は跳躍斬撃＆衝撃波
                      </li>
                    </ul>
                  </div>
                </div>
              )}

              {/* TAB 3: Camera views, Zoom (Pinch in/out) & Y-axis rotation */}
              {activeTab === 'camera' && (
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-slate-300 font-medium">盤面見渡し (Y軸回転 ＆ 遠近ズーム)</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onZoomCamera?.(-1.2)}
                        className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded text-xs font-semibold transition cursor-pointer"
                        title="カメラを近づける (拡大)"
                      >
                        ＋ 寄る
                      </button>
                      <button
                        onClick={() => onZoomCamera?.(1.2)}
                        className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded text-xs font-semibold transition cursor-pointer"
                        title="カメラを遠ざける (縮小)"
                      >
                        － 引く
                      </button>
                      <button
                        onClick={() => onRotateCameraY(-Math.PI / 12)}
                        className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs transition cursor-pointer"
                        title="左へ15°回転"
                      >
                        ↺ 左回転
                      </button>
                      <button
                        onClick={() => onRotateCameraY(Math.PI / 12)}
                        className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs transition cursor-pointer"
                        title="右へ15°回転"
                      >
                        ↻ 右回転
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                    <button
                      onClick={() => onSetCameraPreset('white')}
                      className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 rounded text-center text-slate-300 hover:text-amber-300 transition cursor-pointer"
                    >
                      白番視点 (正面)
                    </button>
                    <button
                      onClick={() => onSetCameraPreset('black')}
                      className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 rounded text-center text-slate-300 hover:text-amber-300 transition cursor-pointer"
                    >
                      黒番視点 (対面)
                    </button>
                    <button
                      onClick={() => onSetCameraPreset('side')}
                      className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 rounded text-center text-slate-300 hover:text-amber-300 transition cursor-pointer"
                    >
                      側面 (90°)
                    </button>
                    <button
                      onClick={() => onSetCameraPreset('top')}
                      className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 rounded text-center text-slate-300 hover:text-amber-300 transition cursor-pointer"
                    >
                      俯瞰 (真上)
                    </button>
                    <button
                      onClick={() => onSetCameraPreset('isometric')}
                      className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 rounded text-center text-slate-300 hover:text-amber-300 transition cursor-pointer"
                    >
                      斜め (45°)
                    </button>
                  </div>
                  <span className="text-[10px] text-slate-400 text-center">
                    ※ ピンチイン・アウト（またはホイール）で遠近操作、ドラッグ・スワイプで自由回転できます
                  </span>
                </div>
              )}

              {/* TAB 4: Controls */}
              {activeTab === 'controls' && (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={onUndo}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                      <span>待った (1手戻す)</span>
                    </button>

                    <button
                      onClick={onFlipBoard}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
                      <span>盤面反転</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={onToggleSound}
                      className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition cursor-pointer"
                      title={soundEnabled ? '効果音ミュート' : '効果音オン'}
                    >
                      {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
                    </button>

                    <button
                      onClick={onDrawOffer}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Handshake className="w-3.5 h-3.5 text-amber-400" />
                      <span>ドロー提案</span>
                    </button>

                    <button
                      onClick={onResign}
                      className="px-3 py-1.5 bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-rose-200 rounded-lg flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Flag className="w-3.5 h-3.5 text-rose-400" />
                      <span>投了</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
