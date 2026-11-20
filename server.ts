import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.use(express.json({ limit: '1mb' }));

  // In-memory rooms for online chess matches
  interface OnlineRoom {
    id: string;
    whitePlayer: string;
    blackPlayer: string;
    fen: string;
    history: string[];
    turn: 'w' | 'b';
    lastMove: { from: string; to: string; promotion?: string } | null;
    status: 'waiting' | 'active' | 'ended';
    winner: 'w' | 'b' | 'draw' | null;
    updatedAt: number;
  }

  const onlineRooms = new Map<string, OnlineRoom>();

  // Clean old rooms periodically
  setInterval(() => {
    const now = Date.now();
    for (const [id, room] of onlineRooms.entries()) {
      if (now - room.updatedAt > 1000 * 60 * 60 * 2) {
        onlineRooms.delete(id);
      }
    }
  }, 1000 * 60 * 15);

  // API 1: Gemini AI Chess Endpoint
  app.post('/api/chess-ai', async (req, res) => {
    try {
      const { fen, legalMoves, pgn, history, rating, apiKey } = req.body;

      if (!fen || !legalMoves || !Array.isArray(legalMoves)) {
        return res.status(400).json({ error: 'Missing fen or legalMoves' });
      }

      const activeApiKey = apiKey || process.env.GEMINI_API_KEY;
      if (!activeApiKey) {
        return res.status(400).json({
          error: 'No GEMINI_API_KEY available. Please configure your API key.',
          fallback: true
        });
      }

      const ai = new GoogleGenAI({ apiKey: activeApiKey });
      const prompt = `You are a chess grandmaster playing a competitive match.
Current FEN board state: ${fen}
Moves played so far: ${history ? history.join(' ') : 'Game start'}
Recent PGN: ${pgn || 'N/A'}
Difficulty/Elo target: ${rating || 1800}

LEGAL MOVES AVAILABLE: [${legalMoves.join(', ')}]

TASK:
1. Choose the single best strategic move from the list of legal moves.
2. You MUST return ONLY valid chess notation for the chosen move.
3. Acceptable format: standard algebraic notation (SAN like "Nf3", "e4", "Bxf7+", "O-O") or UCI notation (like "g1f3", "e2e4").
4. It is strictly prohibited to make an illegal move or hallucinate moves not in the LEGAL MOVES list.

Format your response as a JSON object:
{
  "move": "<chosen move from legal moves>",
  "explanation": "<brief 1-2 sentence tactical justification>",
  "evaluation": "<slight white advantage | equal | sharp | black advantage>"
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        }
      });

      const responseText = response.text || '';
      try {
        const parsed = JSON.parse(responseText);
        return res.json({
          success: true,
          move: parsed.move,
          explanation: parsed.explanation || '',
          evaluation: parsed.evaluation || 'equal',
          raw: responseText
        });
      } catch {
        // Fallback extract
        const cleanMove = responseText.replace(/[^a-zA-Z0-9+#=\-]/g, '').trim();
        return res.json({
          success: true,
          move: cleanMove || legalMoves[0],
          explanation: 'AI decision calculated.',
          evaluation: 'neutral',
          raw: responseText
        });
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown AI error';
      console.error('Gemini Chess AI error:', errorMessage);
      return res.status(500).json({
        error: errorMessage,
        fallback: true
      });
    }
  });

  // API 2: Chess.com Leaderboard & Profiles Proxy (Bypasses CORS & provides live rating data)
  app.get('/api/chesscom/leaderboards', async (_req, res) => {
    try {
      const response = await fetch('https://api.chess.com/pub/leaderboards', {
        headers: { 'User-Agent': 'ValkyrieChess/1.0 (Google AI Studio)' }
      });
      if (!response.ok) {
        throw new Error(`Chess.com API responded with ${response.status}`);
      }
      const data = await response.json();
      return res.json(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch leaderboards';
      return res.status(502).json({ error: msg });
    }
  });

  app.get('/api/chesscom/player/:username', async (req, res) => {
    try {
      const { username } = req.params;
      const [profileRes, statsRes] = await Promise.all([
        fetch(`https://api.chess.com/pub/player/${encodeURIComponent(username)}`, {
          headers: { 'User-Agent': 'ValkyrieChess/1.0 (Google AI Studio)' }
        }),
        fetch(`https://api.chess.com/pub/player/${encodeURIComponent(username)}/stats`, {
          headers: { 'User-Agent': 'ValkyrieChess/1.0 (Google AI Studio)' }
        })
      ]);

      const profile = profileRes.ok ? await profileRes.json() : null;
      const stats = statsRes.ok ? await statsRes.json() : null;

      return res.json({ profile, stats });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch player';
      return res.status(502).json({ error: msg });
    }
  });

  app.get('/api/chesscom/puzzle/daily', async (_req, res) => {
    try {
      const response = await fetch('https://api.chess.com/pub/puzzle', {
        headers: { 'User-Agent': 'ValkyrieChess/1.0 (Google AI Studio)' }
      });
      if (!response.ok) throw new Error('Failed to fetch daily puzzle');
      const data = await response.json();
      return res.json(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch daily puzzle';
      return res.status(502).json({ error: msg });
    }
  });

  // API 3: Online Multiplayer Room Management
  app.post('/api/online/room/create', (req, res) => {
    const { playerId, colorPreference = 'random' } = req.body;
    const roomId = 'VALK-' + Math.floor(1000 + Math.random() * 9000);

    const isWhite = colorPreference === 'white' 
      ? true 
      : colorPreference === 'black' 
        ? false 
        : Math.random() < 0.5;

    const room: OnlineRoom = {
      id: roomId,
      whitePlayer: isWhite ? playerId : '',
      blackPlayer: isWhite ? '' : playerId,
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      history: [],
      turn: 'w',
      lastMove: null,
      status: 'waiting',
      winner: null,
      updatedAt: Date.now()
    };

    onlineRooms.set(roomId, room);
    res.json({ success: true, room, assignedColor: isWhite ? 'w' : 'b' });
  });

  app.post('/api/online/room/join', (req, res) => {
    const { roomId, playerId } = req.body;
    const room = onlineRooms.get(roomId);

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    let assignedColor: 'w' | 'b' = 'w';
    if (room.whitePlayer === playerId) {
      assignedColor = 'w';
    } else if (room.blackPlayer === playerId) {
      assignedColor = 'b';
    } else if (!room.whitePlayer) {
      room.whitePlayer = playerId;
      assignedColor = 'w';
      room.status = 'active';
    } else if (!room.blackPlayer) {
      room.blackPlayer = playerId;
      assignedColor = 'b';
      room.status = 'active';
    } else {
      return res.status(403).json({ error: 'Room is already full' });
    }

    room.updatedAt = Date.now();
    res.json({ success: true, room, assignedColor });
  });

  app.get('/api/online/room/:roomId', (req, res) => {
    const { roomId } = req.params;
    const room = onlineRooms.get(roomId);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    res.json({ success: true, room });
  });

  app.post('/api/online/room/move', (req, res) => {
    const { roomId, playerId, fen, move, history, isGameOver, winner } = req.body;
    const room = onlineRooms.get(roomId);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Verify player is allowed to move
    const playerColor = room.whitePlayer === playerId ? 'w' : room.blackPlayer === playerId ? 'b' : null;
    if (!playerColor) {
      return res.status(403).json({ error: 'Player is not in room' });
    }

    room.fen = fen;
    room.lastMove = move;
    room.history = history;
    room.turn = room.turn === 'w' ? 'b' : 'w';
    if (isGameOver) {
      room.status = 'ended';
      room.winner = winner || null;
    }
    room.updatedAt = Date.now();

    res.json({ success: true, room });
  });

  // Vite middleware in dev or static files in production
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Valkyrie 3D Chess server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
