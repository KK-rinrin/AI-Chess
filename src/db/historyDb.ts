import { GameRecord, GameReviewReport } from '../types/chess';
import { ChessService } from '../game/chessLogic';

const DB_NAME = 'valkyrie_chess_db';
const DB_VERSION = 1;
const STORE_GAMES = 'games';

class HistoryDatabase {
  private dbPromise: Promise<IDBDatabase>;

  constructor() {
    this.dbPromise = this.initDB();
  }

  private initDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        return reject(new Error('IndexedDB not supported in this environment'));
      }
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_GAMES)) {
          const store = db.createObjectStore(STORE_GAMES, { keyPath: 'id' });
          store.createIndex('date', 'date', { unique: false });
          store.createIndex('mode', 'mode', { unique: false });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  public async saveGame(record: GameRecord): Promise<void> {
    const db = await this.dbPromise;
    // Calculate accuracies if missing
    if (record.whiteAccuracy === undefined && record.pgn) {
      try {
        const report = ChessService.generateReview(record.pgn);
        record.whiteAccuracy = report.whiteAccuracy;
        record.blackAccuracy = report.blackAccuracy;
      } catch {
        record.whiteAccuracy = 80;
        record.blackAccuracy = 80;
      }
    }

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_GAMES, 'readwrite');
      const store = tx.objectStore(STORE_GAMES);
      const req = store.put(record);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  public async getAllGames(): Promise<GameRecord[]> {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_GAMES, 'readonly');
      const store = tx.objectStore(STORE_GAMES);
      const req = store.getAll();

      req.onsuccess = () => {
        const records = (req.result as GameRecord[]).sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        resolve(records);
      };
      req.onerror = () => reject(req.error);
    });
  }

  public async getGameById(id: string): Promise<GameRecord | null> {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_GAMES, 'readonly');
      const store = tx.objectStore(STORE_GAMES);
      const req = store.get(id);

      req.onsuccess = () => resolve((req.result as GameRecord) || null);
      req.onerror = () => reject(req.error);
    });
  }

  public async deleteGame(id: string): Promise<void> {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_GAMES, 'readwrite');
      const store = tx.objectStore(STORE_GAMES);
      const req = store.delete(id);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  public async clearAll(): Promise<void> {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_GAMES, 'readwrite');
      const store = tx.objectStore(STORE_GAMES);
      const req = store.clear();

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }
}

export const historyDb = new HistoryDatabase();
