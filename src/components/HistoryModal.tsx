import { useState } from 'react';
import { Database, Trash2, Eye, Calendar, X, Upload, BookOpen, Play, Copy, Check } from 'lucide-react';
import { GameRecord, GameReviewReport } from '../types/chess';
import { ChessService } from '../game/chessLogic';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  games: GameRecord[];
  onSelectGame: (game: GameRecord) => void;
  onImportReview: (report: GameReviewReport, whiteName: string, blackName: string) => void;
  onDeleteGame: (id: string) => void;
  onClearAll: () => void;
}

const SAMPLE_OPERA_PGN = `[Event "Opera Game"]
[White "Paul Morphy"]
[Black "Duke Karl / Count Isouard"]
[Result "1-0"]

1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7 8. Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5 11. Bxb5+ Nbd7 12. O-O-O Rd8 13. Rxd7 Rxd7 14. Rd1 Qe6 15. Bxd7+ Nxd7 16. Qb8+ Nxb8 17. Rd8# 1-0`;

const SAMPLE_FEN = `r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4`;

export function HistoryModal({
  isOpen,
  onClose,
  games,
  onSelectGame,
  onImportReview,
  onDeleteGame,
  onClearAll,
}: HistoryModalProps) {
  const [activeTab, setActiveTab] = useState<'history' | 'import'>('history');
  const [filterMode, setFilterMode] = useState<string>('all');
  const [inputText, setInputText] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const filteredGames = games.filter((g) => {
    if (filterMode === 'all') return true;
    return g.mode === filterMode;
  });

  const handlePreviewImported = (raw?: string) => {
    const target = raw !== undefined ? raw : inputText;
    setErrorMsg(null);
    const res = ChessService.parseAndGenerateReview(target);
    if (!res.ok || !res.report) {
      setErrorMsg(res.error || '棋譜データの解析に失敗しました。');
      return;
    }
    onImportReview(
      res.report,
      res.whiteName || '白番 (読込データ)',
      res.blackName || '黒番 (読込データ)'
    );
    onClose();
  };

  const handleCopyGamePgn = (id: string, pgn: string) => {
    navigator.clipboard.writeText(pgn);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-slate-100">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-amber-400" />
            <h2 className="text-base sm:text-lg font-bold">対局履歴 ＆ 棋譜データ (PGN / FEN) 読込</h2>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveTab('history')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              保存された履歴 ({games.length})
            </button>

            <button
              onClick={() => setActiveTab('import')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition cursor-pointer ${
                activeTab === 'import'
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-indigo-600/30 border border-indigo-500/40 text-indigo-200 hover:bg-indigo-600/50'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>棋譜読込・PGN/FENとは？</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {activeTab === 'history' ? (
          <>
            {/* Filter bar */}
            <div className="p-3 bg-slate-950/60 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-slate-400">フィルター:</span>
                {['all', 'chesscom-bot', 'gemini-ai', 'local', 'online'].map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setFilterMode(mode)}
                    className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                      filterMode === mode
                        ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40 font-bold'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {mode === 'all'
                      ? 'すべて'
                      : mode === 'chesscom-bot'
                      ? 'BOT対戦'
                      : mode === 'gemini-ai'
                      ? 'Gemini'
                      : mode === 'local'
                      ? 'ローカル'
                      : 'オンライン'}
                  </button>
                ))}
              </div>

              {games.length > 0 && (
                <button
                  onClick={onClearAll}
                  className="text-rose-400 hover:text-rose-300 text-xs flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>全消去</span>
                </button>
              )}
            </div>

            {/* Games List */}
            <div className="p-4 overflow-y-auto flex-1 space-y-2.5">
              {filteredGames.length === 0 ? (
                <div className="text-center py-10 space-y-3">
                  <p className="text-slate-400 text-xs">
                    保存された対戦履歴はまだありません。対局が完了すると自動的に記録されます。
                  </p>
                  <button
                    onClick={() => setActiveTab('import')}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>外部の棋譜データ（PGN / FEN）や名局サンプルを読み込んで3D盤面でプレビューする</span>
                  </button>
                </div>
              ) : (
                filteredGames.map((game) => (
                  <div
                    key={game.id}
                    className="p-3 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-xs text-slate-200">
                          {game.whitePlayer} <span className="text-slate-500 font-normal">vs</span> {game.blackPlayer}
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.2 rounded font-mono font-bold ${
                            game.result === '1-0'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : game.result === '0-1'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : 'bg-slate-700 text-slate-300'
                          }`}
                        >
                          {game.result}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(game.date).toLocaleDateString()} {new Date(game.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span>手数: {game.movesCount} 手</span>
                        {game.whiteAccuracy && (
                          <span className="text-amber-400/90 font-mono">
                            精度: {game.whiteAccuracy}% / {game.blackAccuracy}%
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCopyGamePgn(game.id, game.pgn)}
                        className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-lg text-[11px] flex items-center gap-1 transition cursor-pointer"
                        title="この対局の全手順（PGN）をコピー"
                      >
                        {copiedId === game.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>PGN手順コピー</span>
                      </button>

                      <button
                        onClick={() => {
                          onSelectGame(game);
                          onClose();
                        }}
                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-black flex items-center gap-1 transition cursor-pointer shadow-md"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>3D盤面で振り返る</span>
                      </button>

                      <button
                        onClick={() => onDeleteGame(game.id)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 transition cursor-pointer"
                        title="削除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        ) : (
          /* IMPORT & PGN/FEN GUIDE TAB */
          <div className="p-4 overflow-y-auto flex-1 space-y-4">
            {/* Beginner-friendly explanation of PGN and FEN */}
            <div className="p-3.5 bg-indigo-950/40 border border-indigo-500/40 rounded-xl space-y-2.5">
              <div className="flex items-center gap-2 text-indigo-300 font-bold text-xs sm:text-sm">
                <BookOpen className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>わかりやすい用語解説：「PGN」と「FEN」の違い</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-700/80 space-y-1">
                  <span className="font-bold text-amber-300 block">
                    🎬 PGN（ピージーエヌ）＝「対局の録画データ（全手順）」
                  </span>
                  <p className="text-slate-300 leading-relaxed text-[11px]">
                    1手目から最後までの<strong>「どの駒をどこへ動かしたか」のすべての手順</strong>を記録したデータです。
                    読み込むと、1手目から順番に3D盤面を動かして対局を再現・振り返りできます。
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-700/80 space-y-1">
                  <span className="font-bold text-sky-300 block">
                    📸 FEN（エフイーエヌ）＝「盤面の写真（駒の配置図）」
                  </span>
                  <p className="text-slate-300 leading-relaxed text-[11px]">
                    ある1つの瞬間の<strong>「どのマスにどの駒があるか」の配置</strong>を1行の文字で表したデータです。
                    特定の局面だけを3D盤面に再現したり、その局面から対局を再開したい時に使います。
                  </p>
                </div>
              </div>
            </div>

            {/* Input Form */}
            <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-3">
              <label className="text-xs sm:text-sm font-bold text-slate-200 block">
                棋譜データ（PGN手順 または FEN盤面配置）を入力・貼り付け:
              </label>

              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={`例(PGN): 1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 ...\n例(FEN): r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4`}
                rows={5}
                className="w-full p-3 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
              />

              {errorMsg && (
                <div className="p-2.5 rounded-lg bg-rose-950/80 border border-rose-700 text-rose-200 text-xs">
                  {errorMsg}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] text-slate-400">ワンクリック体験サンプル:</span>
                  <button
                    onClick={() => {
                      setInputText(SAMPLE_OPERA_PGN);
                      handlePreviewImported(SAMPLE_OPERA_PGN);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-[11px] transition cursor-pointer"
                  >
                    ★ 名局「オペラ座の対局」(PGN)
                  </button>
                  <button
                    onClick={() => {
                      setInputText(SAMPLE_FEN);
                      handlePreviewImported(SAMPLE_FEN);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 text-[11px] transition cursor-pointer"
                  >
                    ★ 中盤の戦術局面 (FEN)
                  </button>
                </div>

                <button
                  onClick={() => handlePreviewImported()}
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 shadow-lg transition cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>3D盤面でプレビュー開始</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition cursor-pointer"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
