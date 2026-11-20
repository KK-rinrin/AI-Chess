import { useEffect, useRef, useState, useCallback } from 'react';
import { Square, PieceSymbol, Color } from 'chess.js';
import confetti from 'canvas-confetti';
import { 
  Play, 
  Swords, 
  Trophy, 
  ShieldCheck, 
  RotateCcw, 
  Award, 
  Sparkles,
  ExternalLink,
  ChevronRight
} from 'lucide-react';

import { ChessService } from './game/chessLogic';
import { ChessBoardScene } from './three/ChessBoardScene';
import { GameHUD } from './components/GameHUD';
import { MatchSetupModal } from './components/MatchSetupModal';
import { GameAnalysisModal } from './components/GameAnalysisModal';
import { HistoryModal } from './components/HistoryModal';
import { PromotionModal } from './components/PromotionModal';
import { historyDb } from './db/historyDb';
import { sound } from './utils/audio';
import { GameMode, GameRecord, GameReviewReport, GraphicStyle } from './types/chess';

export default function App() {
  // Game state
  const [gameState, setGameState] = useState<'title' | 'playing' | 'gameover'>('title');
  const [gameMode, setGameMode] = useState<GameMode>('chesscom-bot');
  const [playerColor, setPlayerColor] = useState<Color>('w');
  const [whitePlayerName, setWhitePlayerName] = useState('プレイヤー (白)');
  const [blackPlayerName, setBlackPlayerName] = useState('Magnus Carlsen (GM)');
  const [whiteRating, setWhiteRating] = useState<number | undefined>(1500);
  const [blackRating, setBlackRating] = useState<number | undefined>(2880);

  // AI settings
  const [difficultyLevel, setDifficultyLevel] = useState<number>(5);
  const [useGeminiAi, setUseGeminiAi] = useState<boolean>(false);
  const [customApiKey, setCustomApiKey] = useState<string | undefined>();
  const [aiThinking, setAiThinking] = useState(false);
  const [aiCommentary, setAiCommentary] = useState<string | undefined>();

  // Online match
  const [onlineRoomId, setOnlineRoomId] = useState<string | undefined>();
  const onlinePollTimerRef = useRef<number | null>(null);

  // Turn and board indicators
  const [turn, setTurn] = useState<Color>('w');
  const [isCheck, setIsCheck] = useState(false);
  const [gameOverReason, setGameOverReason] = useState<string>('');
  const [gameWinner, setGameWinner] = useState<'w' | 'b' | 'draw' | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [capturedWhite, setCapturedWhite] = useState<string[]>([]);
  const [capturedBlack, setCapturedBlack] = useState<string[]>([]);

  // Modals
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);
  const [analysisInitialTab, setAnalysisInitialTab] = useState<'board' | 'details' | 'import'>('board');
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [promotionPending, setPromotionPending] = useState<{ from: Square; to: Square } | null>(null);

  // Analysis & DB records
  const [analysisReport, setAnalysisReport] = useState<GameReviewReport | null>(null);
  const [savedGames, setSavedGames] = useState<GameRecord[]>([]);

  // Sound, Camera & Piece Graphic Style
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [cameraAngleY, setCameraAngleY] = useState(0);
  const [graphicStyle, setGraphicStyle] = useState<GraphicStyle>('ultra');

  // Refs for 3D & chess service
  const canvasMountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<ChessBoardScene | null>(null);
  const chessServiceRef = useRef<ChessService>(new ChessService());
  const previewServiceRef = useRef<ChessService | null>(null);
  const isAnalysisOpenRef = useRef<boolean>(false);
  const selectedSquareRef = useRef<Square | null>(null);
  const gameOverTimerRef = useRef<number | null>(null);

  useEffect(() => {
    isAnalysisOpenRef.current = isAnalysisOpen;
  }, [isAnalysisOpen]);

  // Refresh tactical statuses & 3D overlays
  const updateSceneTactics = useCallback(() => {
    if (!sceneRef.current) return;
    const activeService = (isAnalysisOpenRef.current && previewServiceRef.current)
      ? previewServiceRef.current
      : chessServiceRef.current;
    const statuses = activeService.computeAllPiecesTacticalStatus();
    sceneRef.current.updateTacticalStatuses(statuses);
  }, []);

  // Sync board and state
  const syncGameState = useCallback((forceRebuildPieces: boolean = false) => {
    const cs = chessServiceRef.current;
    setTurn(cs.turn);
    setIsCheck(cs.isCheck);
    setHistory(cs.history);

    // Calculate captured pieces
    const board = cs.chess.board();
    const currentPieces: Record<string, number> = {
      p: 0, n: 0, b: 0, r: 0, q: 0,
      P: 0, N: 0, B: 0, R: 0, Q: 0,
    };
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        if (p) {
          const key = p.color === 'w' ? p.type.toUpperCase() : p.type;
          currentPieces[key] = (currentPieces[key] || 0) + 1;
        }
      }
    }

    const defaultCounts: Record<string, number> = {
      p: 8, n: 2, b: 2, r: 2, q: 1,
      P: 8, N: 2, B: 2, R: 2, Q: 1,
    };

    const lostWhite: string[] = [];
    const lostBlack: string[] = [];

    ['P', 'N', 'B', 'R', 'Q'].forEach((k) => {
      const diff = (defaultCounts[k] || 0) - (currentPieces[k] || 0);
      for (let i = 0; i < diff; i++) lostWhite.push(k.toLowerCase());
    });

    ['p', 'n', 'b', 'r', 'q'].forEach((k) => {
      const diff = (defaultCounts[k] || 0) - (currentPieces[k] || 0);
      for (let i = 0; i < diff; i++) lostBlack.push(k);
    });

    setCapturedWhite(lostWhite);
    setCapturedBlack(lostBlack);

    if (sceneRef.current) {
      sceneRef.current.syncPieces(board, forceRebuildPieces);
      updateSceneTactics();
    }
  }, [updateSceneTactics]);

  // Load saved games from database
  const loadSavedGames = useCallback(async () => {
    try {
      const list = await historyDb.getAllGames();
      setSavedGames(list);
    } catch (err) {
      console.error('Failed to load history:', err);
    }
  }, []);

  useEffect(() => {
    loadSavedGames();
  }, [loadSavedGames]);

  // Initialize Three.js scene once
  useEffect(() => {
    if (!canvasMountRef.current) return;

    const scene = new ChessBoardScene({
      container: canvasMountRef.current,
      onSquareClick: handleSquareClick,
      onPieceSelect: handlePieceSelect,
      onPieceDrop: handlePieceDrop,
    });
    sceneRef.current = scene;

    // Attach to window for automated testing and inspection
    (window as unknown as { chessBoard: ChessBoardScene; chessService: ChessService; triggerSquareClick: (sq: Square) => void }).chessBoard = scene;
    (window as unknown as { chessBoard: ChessBoardScene; chessService: ChessService; triggerSquareClick: (sq: Square) => void }).chessService = chessServiceRef.current;
    (window as unknown as { triggerSquareClick: (sq: Square) => void }).triggerSquareClick = (sq: Square) => {
      handleSquareClick(sq);
    };

    // Initial sync
    scene.syncPieces(chessServiceRef.current.chess.board());
    updateSceneTactics();

    return () => {
      scene.dispose();
      sceneRef.current = null;
    };
  }, []);

  // Finish match & save to DB
  const handleGameOver = useCallback((winner: 'w' | 'b' | 'draw', reason: string) => {
    setGameState('gameover');
    setGameWinner(winner);
    setGameOverReason(reason);

    if (winner === playerColor) {
      sound.playVictory();
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    }

    // Defer review calculation & IndexedDB write off the critical render frame
    if (gameOverTimerRef.current !== null) {
      clearTimeout(gameOverTimerRef.current);
    }
    const pgnSnapshot = chessServiceRef.current.pgn;
    const fenSnapshot = chessServiceRef.current.fen;
    const movesCountSnapshot = chessServiceRef.current.history.length;
    const verboseHistorySnapshot = chessServiceRef.current.chess.history({ verbose: true }).map((m) => ({
      san: m.san,
      from: m.from,
      to: m.to,
      piece: m.piece,
      fen: m.after,
    }));

    gameOverTimerRef.current = window.setTimeout(async () => {
      gameOverTimerRef.current = null;
      const report = ChessService.generateReview(pgnSnapshot);
      setAnalysisReport(report);

      const gameRecord: GameRecord = {
        id: 'game_' + Date.now(),
        date: new Date().toISOString(),
        whitePlayer: whitePlayerName,
        blackPlayer: blackPlayerName,
        mode: gameMode,
        result: winner === 'w' ? '1-0' : winner === 'b' ? '0-1' : '1/2-1/2',
        reason,
        movesCount: movesCountSnapshot,
        pgn: pgnSnapshot,
        fen: fenSnapshot,
        moveHistory: verboseHistorySnapshot,
        whiteAccuracy: report.whiteAccuracy,
        blackAccuracy: report.blackAccuracy,
      };

      try {
        await historyDb.saveGame(gameRecord);
        loadSavedGames();
      } catch (err) {
        console.error('Failed to save game to IndexedDB:', err);
      }
    }, 20);
  }, [playerColor, whitePlayerName, blackPlayerName, gameMode, loadSavedGames]);

  // Execute a chess move (animates 3D & updates status)
  const executeMove = useCallback((from: Square, to: Square, promotion: PieceSymbol = 'q') => {
    const cs = chessServiceRef.current;
    const piece = cs.chess.get(from);
    if (!piece) return false;

    // Check pawn promotion condition
    if (piece.type === 'p') {
      const destRank = parseInt(to[1], 10);
      if ((piece.color === 'w' && destRank === 8) || (piece.color === 'b' && destRank === 1)) {
        if (!promotionPending) {
          setPromotionPending({ from, to });
          return false;
        }
      }
    }

    const targetPiece = cs.chess.get(to);
    const isCapture = !!targetPiece;

    const moveResult = cs.makeMove(from, to, promotion);
    if (!moveResult) {
      if (sceneRef.current) {
        sceneRef.current.flashIllegalSquare(to);
      }
      return false;
    }

    // Clear overlays
    if (sceneRef.current) {
      sceneRef.current.clearOverlays();
      sceneRef.current.animateMove(from, to, isCapture, () => {
        syncGameState();
      });
    }

    selectedSquareRef.current = null;
    sound.playMove();

    // Check game over
    if (cs.isGameOver) {
      if (cs.isCheckmate) {
        const winner = cs.turn === 'w' ? 'b' : 'w';
        handleGameOver(winner, 'チェックメイトによる決着');
      } else if (cs.isStalemate) {
        handleGameOver('draw', 'ステイルメイト (引き分け)');
      } else if (cs.isDraw) {
        handleGameOver('draw', '引き分け判定 (千日手または戦力不足)');
      }
    } else if (cs.isCheck) {
      sound.playCheck();
    }

    return true;
  }, [handleGameOver, promotionPending, syncGameState]);

  // Trigger AI turn
  const triggerAiMove = useCallback(async () => {
    const cs = chessServiceRef.current;
    if (cs.isGameOver) return;

    setAiThinking(true);
    setAiCommentary(undefined);

    try {
      // 1. Gemini AI mode
      if (useGeminiAi) {
        const legalMoves = cs.getLegalMoves().map(m => m.san);
        const res = await fetch('/api/chess-ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fen: cs.fen,
            legalMoves,
            pgn: cs.pgn,
            history: cs.history,
            rating: blackRating || 2400,
            apiKey: customApiKey,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.move) {
            if (data.explanation) setAiCommentary(data.explanation);

            // Try SAN first, then UCI format
            let made = cs.makeMoveSan(data.move);
            if (!made && data.move.length >= 4) {
              const uFrom = data.move.slice(0, 2) as Square;
              const uTo = data.move.slice(2, 4) as Square;
              const uPromo = (data.move[4] as PieceSymbol) || 'q';
              executeMove(uFrom, uTo, uPromo);
              setAiThinking(false);
              return;
            }

            if (made) {
              if (sceneRef.current) {
                sceneRef.current.animateMove(made.from as Square, made.to as Square, !!made.captured, () => {
                  syncGameState();
                });
              }
              sound.playMove();
              if (cs.isGameOver) {
                handleGameOver(made.color, 'AIの勝利');
              }
              setAiThinking(false);
              return;
            }
          }
        }
      }

      // 2. Built-in Chess.com rating tuned Minimax Engine
      await new Promise(r => setTimeout(r, 300)); // natural thinking delay
      const depth = difficultyLevel >= 4 ? 3 : difficultyLevel >= 2 ? 2 : 1;
      const randomness = difficultyLevel <= 1 ? 0.35 : difficultyLevel <= 2 ? 0.15 : 0;
      const bestMove = cs.findBestMoveMinimax(depth, randomness);

      if (bestMove) {
        executeMove(bestMove.from as Square, bestMove.to as Square, (bestMove.promotion as PieceSymbol) || 'q');
      }
    } catch (err) {
      console.error('AI move error:', err);
    } finally {
      setAiThinking(false);
    }
  }, [difficultyLevel, blackRating, useGeminiAi, customApiKey, executeMove, handleGameOver, syncGameState]);

  // Effect to trigger AI when it's AI turn
  useEffect(() => {
    if (gameState !== 'playing') return;
    const cs = chessServiceRef.current;
    if (cs.isGameOver) return;

    const isAiTurn = (gameMode === 'chesscom-bot' || gameMode === 'gemini-ai') && cs.turn !== playerColor;
    if (isAiTurn && !aiThinking) {
      const timer = window.setTimeout(() => {
        triggerAiMove();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [turn, gameState, gameMode, playerColor, aiThinking, triggerAiMove]);

  // Handle single tap selection
  const handlePieceSelect = useCallback((square: Square | null) => {
    const activeService = (isAnalysisOpenRef.current && previewServiceRef.current)
      ? previewServiceRef.current
      : chessServiceRef.current;
    selectedSquareRef.current = square;

    if (!sceneRef.current) return;

    if (!square) {
      sceneRef.current.clearOverlays();
      return;
    }

    const piece = activeService.chess.get(square);
    // In review mode allow inspecting any piece's legal moves; in game mode only current turn
    if (piece && (isAnalysisOpenRef.current || piece.color === activeService.turn)) {
      sound.playSelect();
      const overlays = activeService.getOverlaysForSelection(square);
      sceneRef.current.setTileOverlays(overlays);
    } else {
      sceneRef.current.clearOverlays();
    }
  }, []);

  // Handle square tap (tap destination to move)
  const handleSquareClick = useCallback((square: Square) => {
    if (isAnalysisOpenRef.current) {
      const previewCs = previewServiceRef.current;
      if (!previewCs) return;
      const piece = previewCs.chess.get(square);
      if (piece && selectedSquareRef.current !== square) {
        handlePieceSelect(square);
      } else {
        handlePieceSelect(null);
      }
      return;
    }

    const cs = chessServiceRef.current;
    const curSelected = selectedSquareRef.current;

    // If a piece was already selected
    if (curSelected) {
      if (curSelected === square) {
        // Deselect
        handlePieceSelect(null);
        return;
      }

      // Check if clicked square is another friendly piece of current turn
      const clickedPiece = cs.chess.get(square);
      if (clickedPiece && clickedPiece.color === cs.turn) {
        handlePieceSelect(square);
        return;
      }

      // Try moving to destination
      const moved = executeMove(curSelected, square);
      if (moved) {
        handlePieceSelect(null);
        return;
      }
    }

    // Otherwise, tap to select piece
    const piece = cs.chess.get(square);
    if (piece && piece.color === cs.turn) {
      handlePieceSelect(square);
    } else {
      handlePieceSelect(null);
    }
  }, [executeMove, handlePieceSelect]);

  // Handle Drag & Drop move
  const handlePieceDrop = useCallback((fromSq: Square, toSq: Square) => {
    if (isAnalysisOpenRef.current) return;
    executeMove(fromSq, toSq);
    handlePieceSelect(null);
  }, [executeMove, handlePieceSelect]);

  // Pawn promotion choice
  const handlePromotionSelect = (piece: PieceSymbol) => {
    if (promotionPending) {
      executeMove(promotionPending.from, promotionPending.to, piece);
      setPromotionPending(null);
    }
  };

  // Start new match
  const handleStartMatch = (config: {
    mode: GameMode;
    playerColor: Color;
    opponentName: string;
    opponentRating?: number;
    difficultyLevel: number;
    useGeminiAi: boolean;
    customApiKey?: string;
    onlineRoomId?: string;
  }) => {
    if (gameOverTimerRef.current !== null) {
      clearTimeout(gameOverTimerRef.current);
      gameOverTimerRef.current = null;
    }

    // Explicitly exit review/preview state so no review board or animation remains active
    setIsAnalysisOpen(false);
    isAnalysisOpenRef.current = false;
    previewServiceRef.current = null;
    selectedSquareRef.current = null;
    setPromotionPending(null);

    chessServiceRef.current.reset();
    setGameMode(config.mode);
    setPlayerColor(config.playerColor);
    setDifficultyLevel(config.difficultyLevel);
    setUseGeminiAi(config.useGeminiAi);
    setCustomApiKey(config.customApiKey);
    setOnlineRoomId(config.onlineRoomId);

    if (config.playerColor === 'w') {
      setWhitePlayerName('プレイヤー');
      setWhiteRating(1500);
      setBlackPlayerName(config.opponentName);
      setBlackRating(config.opponentRating);
    } else {
      setBlackPlayerName('プレイヤー');
      setBlackRating(1500);
      setWhitePlayerName(config.opponentName);
      setWhiteRating(config.opponentRating);
    }

    // Cancel any active animations, clear overlays, and set camera view based on color
    if (sceneRef.current) {
      sceneRef.current.cancelActiveAnimations();
      sceneRef.current.clearOverlays();
      sceneRef.current.setCameraView(config.playerColor === 'w' ? 'white' : 'black');
    }

    setGameState('playing');
    setGameWinner(null);
    setGameOverReason('');
    setAiCommentary(undefined);
    syncGameState(true);
  };

  // HUD Actions
  const handleUndo = () => {
    const cs = chessServiceRef.current;
    if (gameMode === 'chesscom-bot' || gameMode === 'gemini-ai') {
      cs.undo();
      cs.undo();
    } else {
      cs.undo();
    }
    syncGameState();
  };

  const handleResign = () => {
    const winner = playerColor === 'w' ? 'b' : 'w';
    handleGameOver(winner, `${playerColor === 'w' ? whitePlayerName : blackPlayerName} の投了`);
  };

  const handleDrawOffer = () => {
    handleGameOver('draw', '双方の合意による引き分け');
  };

  const handleFlipBoard = () => {
    if (sceneRef.current) {
      sceneRef.current.rotateYBy(Math.PI);
    }
  };

  const handleOpenCurrentAnalysis = (tab: 'board' | 'details' | 'import' = 'board') => {
    const report = ChessService.generateReview(chessServiceRef.current.pgn, chessServiceRef.current.history.length === 0 ? chessServiceRef.current.fen : undefined);
    setAnalysisReport(report);
    setAnalysisInitialTab(tab);
    isAnalysisOpenRef.current = true;
    setIsAnalysisOpen(true);
  };

  const handleCloseAnalysis = useCallback(() => {
    setIsAnalysisOpen(false);
    isAnalysisOpenRef.current = false;
    previewServiceRef.current = null;
    selectedSquareRef.current = null;
    if (sceneRef.current) {
      sceneRef.current.cancelActiveAnimations();
      sceneRef.current.clearOverlays();
    }
    syncGameState(true);
  }, [syncGameState]);

  // Drive the 3D chessboard directly during review preview / replay
  const handlePreviewPlyChange = useCallback((plyIndex: number, animateFromPrev: boolean, activeReport?: GameReviewReport) => {
    const rep = activeReport || analysisReport;
    if (!rep || !sceneRef.current || !isAnalysisOpenRef.current) return;

    const move = plyIndex > 0 ? rep.moves[plyIndex - 1] : null;
    const targetFen = move ? move.fenAfter : rep.initialFen;

    const afterService = new ChessService(targetFen);
    previewServiceRef.current = afterService;

    if (animateFromPrev && move) {
      const beforeService = new ChessService(move.fenBefore);
      sceneRef.current.syncPieces(beforeService.chess.board());
      sceneRef.current.clearOverlays();
      sound.playMove();
      sceneRef.current.animateMove(move.from, move.to, !!move.captured, () => {
        if (!sceneRef.current || !isAnalysisOpenRef.current) return;
        sceneRef.current.syncPieces(afterService.chess.board());
        sceneRef.current.updateTacticalStatuses(afterService.computeAllPiecesTacticalStatus());
        sceneRef.current.setTileOverlays([
          { square: move.from, type: 'last-move' },
          { square: move.to, type: 'selected' },
        ]);
      });
    } else {
      sceneRef.current.syncPieces(afterService.chess.board());
      sceneRef.current.updateTacticalStatuses(afterService.computeAllPiecesTacticalStatus());
      if (move) {
        sceneRef.current.setTileOverlays([
          { square: move.from, type: 'last-move' },
          { square: move.to, type: 'selected' },
        ]);
      } else {
        sceneRef.current.clearOverlays();
      }
    }
  }, [analysisReport]);

  // Resume or start playing from any previewed FEN position
  const handlePlayFromFen = useCallback((targetFen: string) => {
    const loaded = chessServiceRef.current.load(targetFen);
    if (!loaded) return;
    setIsAnalysisOpen(false);
    isAnalysisOpenRef.current = false;
    previewServiceRef.current = null;
    selectedSquareRef.current = null;
    if (sceneRef.current) {
      sceneRef.current.cancelActiveAnimations();
      sceneRef.current.clearOverlays();
    }
    setGameState('playing');
    setGameWinner(null);
    setGameOverReason('');
    syncGameState(true);
  }, [syncGameState]);

  const handleToggleGraphicStyle = useCallback(() => {
    setGraphicStyle((prev) => {
      const next: GraphicStyle = prev === 'ultra' ? 'classic' : 'ultra';
      if (sceneRef.current) {
        const activeService = (isAnalysisOpenRef.current && previewServiceRef.current)
          ? previewServiceRef.current
          : chessServiceRef.current;
        sceneRef.current.setGraphicStyle(next, activeService.chess.board());
        updateSceneTactics();
      }
      return next;
    });
  }, [updateSceneTactics]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 select-none">
      {/* 3D WebGL Canvas Container */}
      <div ref={canvasMountRef} className="absolute inset-0 w-full h-full" />

      {/* 1. TITLE SCREEN (Atmospheric Game Shell with bespoke SVG title lockup) */}
      {gameState === 'title' && !isAnalysisOpen && (
        <div className="absolute inset-0 flex flex-col justify-between p-6 pointer-events-auto bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent">
          {/* Top Title Lockup with 30-40% negative space */}
          <div className="pt-8 pl-4 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold mb-3">
              <Swords className="w-3.5 h-3.5" />
              <span>次世代リアル戦術3Dチェス</span>
            </div>

            <h1 className="text-4xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-amber-500 tracking-tight leading-none drop-shadow-md">
              VALKYRIE
            </h1>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-300 mt-1 tracking-wider">
              3D CHESS · 武器と戦術の盤上決戦
            </h2>

            <p className="text-xs sm:text-sm text-slate-400 mt-4 leading-relaxed max-w-md">
              各駒が固有の武器（長槍・大斧・聖杖・宝剣）を携え、盤面の危機や戦局に応じて動的に構えを変えるリアル質感チェス。
              安全・交戦・違反マスの可視化と、3D盤面を動かして直感的に振り返られる棋譜プレビュー機能を搭載。
            </p>
          </div>

          {/* Primary CTA and Control Hints */}
          <div className="pb-8 pl-4 flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setIsSetupOpen(true)}
                className="px-8 py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-sm transition flex items-center gap-2 shadow-xl shadow-amber-500/25 cursor-pointer group"
              >
                <Play className="w-4 h-4 fill-current group-hover:scale-110 transition-transform" />
                <span>対局を開始する</span>
                <ChevronRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => setIsHistoryOpen(true)}
                className="px-5 py-3.5 bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-200 font-semibold rounded-xl text-sm transition flex items-center gap-2 shadow-lg cursor-pointer"
              >
                <Trophy className="w-4 h-4 text-amber-400" />
                <span>対戦履歴・棋譜読込 (PGN/FEN)</span>
              </button>

              <button
                onClick={() => handleOpenCurrentAnalysis('import')}
                className="px-4 py-3.5 bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-500/50 text-indigo-200 font-semibold rounded-xl text-xs transition flex items-center gap-1.5 shadow-lg cursor-pointer"
              >
                <Award className="w-4 h-4 text-indigo-400" />
                <span>棋譜プレビュー・PGN/FENとは？</span>
              </button>

              <button
                onClick={handleToggleGraphicStyle}
                className={`px-4 py-3.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-lg cursor-pointer border ${
                  graphicStyle === 'ultra'
                    ? 'bg-amber-500/20 hover:bg-amber-500/30 border-amber-500/50 text-amber-300'
                    : 'bg-slate-900/90 hover:bg-slate-800 border-slate-700 text-slate-300'
                }`}
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>駒デザイン: {graphicStyle === 'ultra' ? '極限リアル (人間) ✦' : 'クラシック (彫像)'}</span>
              </button>
            </div>

            <div className="text-xs text-slate-400 tracking-wide">
              ドラッグで全角度Y軸回転 · ピンチイン・アウトで遠近操作 · シングルタップで移動先表示
            </div>
          </div>
        </div>
      )}

      {/* 2. PLAYING / GAME HUD */}
      {gameState === 'playing' && !isAnalysisOpen && (
        <GameHUD
          turn={turn}
          playerColor={playerColor}
          gameMode={gameMode}
          whitePlayerName={whitePlayerName}
          blackPlayerName={blackPlayerName}
          whiteRating={whiteRating}
          blackRating={blackRating}
          isCheck={isCheck}
          history={history}
          capturedWhite={capturedWhite}
          capturedBlack={capturedBlack}
          cameraAngleY={cameraAngleY}
          onRotateCameraY={(delta) => sceneRef.current?.rotateYBy(delta)}
          onZoomCamera={(delta) => sceneRef.current?.zoomBy(delta)}
          onSetCameraPreset={(preset) => sceneRef.current?.setCameraView(preset)}
          onUndo={handleUndo}
          onResign={handleResign}
          onDrawOffer={handleDrawOffer}
          onFlipBoard={handleFlipBoard}
          soundEnabled={soundEnabled}
          onToggleSound={() => {
            const next = !soundEnabled;
            setSoundEnabled(next);
            sound.enabled = next;
          }}
          onOpenAnalysis={() => handleOpenCurrentAnalysis('board')}
          onOpenHistory={() => setIsHistoryOpen(true)}
          onNewGame={() => setIsSetupOpen(true)}
          aiThinking={aiThinking}
          aiCommentary={aiCommentary}
          graphicStyle={graphicStyle}
          onToggleGraphicStyle={handleToggleGraphicStyle}
        />
      )}

      {/* 3. GAME OVER MODAL BANNER */}
      {gameState === 'gameover' && !isAnalysisOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full shadow-2xl text-center text-slate-100">
            <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
              <Trophy className="w-8 h-8 text-amber-400" />
            </div>

            <h3 className="text-2xl font-black text-slate-100 mb-1">
              {gameWinner === 'draw'
                ? '引き分け (DRAW)'
                : gameWinner === 'w'
                ? `${whitePlayerName} の勝利！`
                : `${blackPlayerName} の勝利！`}
            </h3>

            <p className="text-xs text-slate-400 mb-6">{gameOverReason}</p>

            <div className="flex flex-col gap-2.5">
              <button
                onClick={() => {
                  if (analysisReport) {
                    setAnalysisInitialTab('board');
                    isAnalysisOpenRef.current = true;
                    setIsAnalysisOpen(true);
                  } else {
                    handleOpenCurrentAnalysis('board');
                  }
                }}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/20 cursor-pointer"
              >
                <Award className="w-4 h-4" />
                <span>3D盤面プレビューで対局を振り返る (AI分析)</span>
              </button>

              <button
                onClick={() => setIsSetupOpen(true)}
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow-lg cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>新しい対局を開始</span>
              </button>

              <button
                onClick={() => setGameState('playing')}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs transition cursor-pointer"
              >
                盤面を検証する
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Promotion Dialog */}
      {promotionPending && (
        <PromotionModal color={turn} onSelect={handlePromotionSelect} />
      )}

      {/* Match Setup Modal */}
      <MatchSetupModal
        isOpen={isSetupOpen}
        onClose={() => setIsSetupOpen(false)}
        onStartMatch={handleStartMatch}
      />

      {/* Game Analysis & Interactive 3D Board Review Modal */}
      {analysisReport && (
        <GameAnalysisModal
          isOpen={isAnalysisOpen}
          onClose={handleCloseAnalysis}
          report={analysisReport}
          whiteName={whitePlayerName}
          blackName={blackPlayerName}
          pgn={chessServiceRef.current.pgn}
          fen={chessServiceRef.current.fen}
          onPreviewPlyChange={handlePreviewPlyChange}
          onImportReport={(newReport, wName, bName) => {
            setAnalysisReport(newReport);
            setWhitePlayerName(wName);
            setBlackPlayerName(bName);
          }}
          onPlayFromFen={handlePlayFromFen}
          onNewGame={() => {
            handleCloseAnalysis();
            setIsSetupOpen(true);
          }}
          graphicStyle={graphicStyle}
          onToggleGraphicStyle={handleToggleGraphicStyle}
          onRotateCameraY={(delta) => sceneRef.current?.rotateYBy(delta)}
          initialTab={analysisInitialTab}
        />
      )}

      {/* History Database & PGN/FEN Import Modal */}
      <HistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        games={savedGames}
        onSelectGame={(game) => {
          const report = ChessService.generateReview(game.pgn);
          setAnalysisReport(report);
          setWhitePlayerName(game.whitePlayer);
          setBlackPlayerName(game.blackPlayer);
          setAnalysisInitialTab('board');
          isAnalysisOpenRef.current = true;
          setIsAnalysisOpen(true);
        }}
        onImportReview={(report, wName, bName) => {
          setAnalysisReport(report);
          setWhitePlayerName(wName);
          setBlackPlayerName(bName);
          setAnalysisInitialTab('board');
          isAnalysisOpenRef.current = true;
          setIsAnalysisOpen(true);
        }}
        onDeleteGame={async (id) => {
          await historyDb.deleteGame(id);
          loadSavedGames();
        }}
        onClearAll={async () => {
          await historyDb.clearAll();
          loadSavedGames();
        }}
      />
    </div>
  );
}

