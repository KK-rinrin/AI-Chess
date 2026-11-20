import test from 'node:test';
import assert from 'node:assert';
import { ChessService } from './chessLogic';

test('ChessService initial board state and legal moves', () => {
  const service = new ChessService();
  assert.strictEqual(service.turn, 'w');
  assert.strictEqual(service.isGameOver, false);

  const whiteLegalMoves = service.getLegalMoves();
  // 16 pawn moves + 4 knight moves = 20 initial moves
  assert.strictEqual(whiteLegalMoves.length, 20);
});

test('Tactical status computation (tremble, attack stance, defend stance)', () => {
  const service = new ChessService();
  const statuses = service.computeAllPiecesTacticalStatus();

  // On opening position: no piece is under attack
  for (const status of statuses.values()) {
    assert.strictEqual(status.isTrembling, false, 'No piece should tremble at game start');
  }

  // Play Scholar\'s Mate opening to test attack and defense
  service.makeMove('e2', 'e4');
  service.makeMove('e7', 'e5');
  service.makeMove('d1', 'h5'); // Queen attacks e5 pawn and f7 pawn

  const afterQ = service.computeAllPiecesTacticalStatus();
  const blackE5 = afterQ.get('e5');
  assert.ok(blackE5, 'e5 pawn exists');
  assert.strictEqual(blackE5.isAttacked, true, 'e5 pawn should be attacked by White Queen');
  assert.strictEqual(blackE5.isDefended, false, 'e5 pawn is undefended right now');
  assert.strictEqual(blackE5.isTrembling, true, 'Undefended and attacked piece must tremble!');

  const whiteQ = afterQ.get('h5');
  assert.ok(whiteQ, 'White Queen exists');
  assert.strictEqual(whiteQ.isAttacking, true, 'Queen is actively attacking opponent pieces');
  assert.strictEqual(whiteQ.weaponStance, 'attack', 'Attacking piece must raise weapon in attack stance');
});

test('Overlays classification (safe vs attacked & capture red circle)', () => {
  const service = new ChessService();
  service.makeMove('e2', 'e4');
  service.makeMove('d7', 'd5');

  // Note: d5 is defended by Black Queen at d8! So d5 is defended ('attacked' -> yellow) AND capturable (isCapture: true -> red circle at feet)
  const overlays = service.getOverlaysForSelection('e4');
  const d5Overlay = overlays.find(o => o.square === 'd5');
  assert.ok(d5Overlay, 'd5 should be an overlay');
  assert.strictEqual(d5Overlay.type, 'attacked', 'Defended d5 capture should be classified as attacked (yellow)');
  assert.strictEqual(d5Overlay.isCapture, true, 'd5 capture should have isCapture: true (red circle at feet)');

  const e5Overlay = overlays.find(o => o.square === 'e5');
  assert.ok(e5Overlay, 'e5 should be an overlay');
  assert.strictEqual(e5Overlay.type, 'safe', 'e5 should be safe (blue)');
  assert.strictEqual(e5Overlay.isCapture, false, 'e5 is not a capture');

  // Now test capturing an UNDEFENDED (trembling) enemy piece:
  // 1. e4 e5 2. Qh5 (Black's e5 pawn is attacked by White Queen and undefended -> trembling!)
  const service2 = new ChessService();
  service2.makeMove('e2', 'e4');
  service2.makeMove('e7', 'e5');
  service2.makeMove('d1', 'h5');
  service2.makeMove('a7', 'a6'); // Black plays a6, leaving e5 undefended

  const statuses = service2.computeAllPiecesTacticalStatus();
  assert.strictEqual(statuses.get('e5')?.isTrembling, true, 'Black e5 pawn is undefended and trembling');

  const queenOverlays = service2.getOverlaysForSelection('h5');
  const e5CaptureOverlay = queenOverlays.find(o => o.square === 'e5');
  assert.ok(e5CaptureOverlay, 'e5 should be a legal capture for Queen at h5');
  assert.strictEqual(
    e5CaptureOverlay.type,
    'safe',
    'Capturing an undefended trembling piece (e5) must be SAFE (Blue), not Yellow!'
  );
  assert.strictEqual(
    e5CaptureOverlay.isCapture,
    'true' === 'true',
    'Capturable piece must have isCapture: true for Red Circle at feet'
  );

  // Meanwhile f7 is defended by Black King at e8, so f7 capture is 'attacked' (Yellow) + isCapture: true
  const f7CaptureOverlay = queenOverlays.find(o => o.square === 'f7');
  assert.ok(f7CaptureOverlay, 'f7 should be a legal capture for Queen at h5');
  assert.strictEqual(
    f7CaptureOverlay.type,
    'attacked',
    'Capturing a defended piece (f7 defended by King) must be ATTACKED (Yellow)'
  );
  assert.strictEqual(f7CaptureOverlay.isCapture, true, 'f7 capture also gets Red Circle at feet');
});

test('Game review generation and accuracy evaluation', () => {
  const service = new ChessService();
  service.makeMove('e2', 'e4');
  service.makeMove('e7', 'e5');
  service.makeMove('g1', 'f3');
  service.makeMove('b8', 'c6');

  const review = ChessService.generateReview(service.pgn);
  assert.ok(review.whiteAccuracy > 50, 'White accuracy calculated');
  assert.ok(review.blackAccuracy > 50, 'Black accuracy calculated');
  assert.strictEqual(review.moves.length, 4);
});
