import { PieceSymbol, Color, Square } from 'chess.js';

export type WeaponStance = 'attack' | 'defense' | 'none';
export type GraphicStyle = 'ultra' | 'classic';

export interface PieceTacticalStatus {
  square: Square;
  pieceType: PieceSymbol;
  color: Color;
  isAttacked: boolean;
  isDefended: boolean;
  isAttacking: boolean; // targeting an opponent piece
  isDefending: boolean; // protecting a friendly piece
  weaponStance: WeaponStance; // 'attack' | 'defense' | 'none'
  isTrembling: boolean; // attacked AND undefended
}

export type TileOverlayType = 'safe' | 'attacked' | 'illegal' | 'selected' | 'last-move' | 'check';

export interface TileOverlayInfo {
  square: Square;
  type: TileOverlayType;
  isCapture?: boolean;
  label?: string;
}

export type GameMode = 'ai' | 'chesscom-bot' | 'gemini-ai' | 'local' | 'online';

export interface ChessComBotProfile {
  id: string;
  name: string;
  title: string;
  rating: number;
  avatarUrl?: string;
  description: string;
  playStyle: 'aggressive' | 'positional' | 'balanced' | 'tactical';
}

export interface GameRecord {
  id: string;
  date: string;
  whitePlayer: string;
  blackPlayer: string;
  mode: GameMode;
  result: '1-0' | '0-1' | '1/2-1/2' | '*';
  reason: string;
  movesCount: number;
  pgn: string;
  fen: string;
  moveHistory: Array<{
    san: string;
    from: string;
    to: string;
    piece: string;
    fen: string;
    evalScore?: number;
    quality?: MoveQuality;
  }>;
  whiteAccuracy?: number;
  blackAccuracy?: number;
}

export type MoveQuality = 'brilliant' | 'great' | 'best' | 'good' | 'inaccuracy' | 'mistake' | 'blunder';

export interface MoveAnalysis {
  moveIndex: number;
  san: string;
  player: 'w' | 'b';
  from: Square;
  to: Square;
  captured?: PieceSymbol;
  fenBefore: string;
  fenAfter: string;
  evalBefore: number;
  evalAfter: number;
  bestMoveSan?: string;
  quality: MoveQuality;
  explanation: string;
}

export interface GameReviewReport {
  initialFen: string;
  finalFen: string;
  pgn: string;
  whiteAccuracy: number;
  blackAccuracy: number;
  moves: MoveAnalysis[];
  evalGraph: number[];
  blunders: { w: number; b: number };
  mistakes: { w: number; b: number };
  inaccuracies: { w: number; b: number };
  brilliantMoves: { w: number; b: number };
}

