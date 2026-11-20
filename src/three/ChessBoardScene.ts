import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { Square, PieceSymbol, Color } from 'chess.js';
import { MaterialLibrary } from './materials';
import { PieceFactory, Piece3DUserData } from './pieceFactory';
import { PieceTacticalStatus, TileOverlayInfo, GraphicStyle } from '../types/chess';
import { sound } from '../utils/audio';

export interface ChessBoardSceneConfig {
  container: HTMLDivElement;
  onSquareClick: (sq: Square) => void;
  onPieceSelect?: (sq: Square | null) => void;
  onPieceDrop?: (fromSq: Square, toSq: Square) => void;
}

export class ChessBoardScene {
  private container: HTMLDivElement;
  private onSquareClick: (sq: Square) => void;
  private onPieceSelect?: (sq: Square | null) => void;
  private onPieceDrop?: (fromSq: Square, toSq: Square) => void;

  public renderer!: THREE.WebGLRenderer;
  public scene!: THREE.Scene;
  public camera!: THREE.PerspectiveCamera;

  private materials!: MaterialLibrary;
  private pieceFactory!: PieceFactory;

  // Groups
  private boardGroup: THREE.Group = new THREE.Group();
  private piecesGroup: THREE.Group = new THREE.Group();
  private overlayGroup: THREE.Group = new THREE.Group();
  private vfxGroup: THREE.Group = new THREE.Group();
  private piecesMap: Map<Square, THREE.Group> = new Map();
  private overlayMeshes: Map<Square, THREE.Mesh> = new Map();
  private captureRingMeshes: Map<Square, THREE.Mesh> = new Map();

  // Graphic Style option: 'ultra' (極限リアル) or 'classic'
  public graphicStyle: GraphicStyle = 'ultra';

  // Raycaster & interaction
  private raycaster: THREE.Raycaster = new THREE.Vector2() ? new THREE.Raycaster() : new THREE.Raycaster();
  private pointer: THREE.Vector2 = new THREE.Vector2();
  private dragPlane: THREE.Plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private dragIntersection: THREE.Vector3 = new THREE.Vector3();

  // Pointer & Multi-touch Pinch tracking
  private isPointerDown: boolean = false;
  private pointerDownPos: { x: number; y: number } = { x: 0, y: 0 };
  private activePointers: Map<number, { x: number; y: number }> = new Map();
  private lastPinchDistance: number = 0;
  private isPinching: boolean = false;
  private didDragCamera: boolean = false;
  private draggedPiece: THREE.Group | null = null;
  private isDraggingPiece: boolean = false;
  private dragStartSquare: Square | null = null;

  // Camera Orbit & Distance (Zoom) around center lookAt point
  public targetAngleY: number = 0.2; // slight cinematic angle
  public currentAngleY: number = 0.2;
  public targetPitch: number = 0.72; // ~41 degrees elevation for 3D depth
  public currentPitch: number = 0.72;
  public targetDistance: number = 11.2;
  public currentDistance: number = 11.2;
  public readonly minDistance: number = 5.0;
  public readonly maxDistance: number = 18.5;
  public lookAtTarget: THREE.Vector3 = new THREE.Vector3(0, 0.4, 0);
  private cameraShake: number = 0;

  // Moving piece animation & Flashy Capture Combat
  private activeMoveAnimations: Array<{
    mesh: THREE.Group;
    startPos: THREE.Vector3;
    endPos: THREE.Vector3;
    progress: number;
    speed: number;
    isCapture: boolean;
    capturedMesh?: THREE.Group;
    effectSpawned?: boolean;
    onComplete?: () => void;
  }> = [];

  // Active Combat Visual Effects (Shockwave rings, Spark particles, Slash arcs)
  private activeVfx: Array<{
    group: THREE.Group;
    age: number;
    lifetime: number;
    update: (delta: number, progress: number) => void;
  }> = [];

  // Loop control
  private animationFrameId: number = 0;
  private clock: THREE.Clock = new THREE.Clock();
  private isSoftwareGl: boolean = false;
  private isDisposed: boolean = false;

  // Selection & Legal destination tracking
  public selectedSquare: Square | null = null;
  private legalDestinations: Set<Square> = new Set();

  constructor(config: ChessBoardSceneConfig) {
    this.container = config.container;
    this.onSquareClick = config.onSquareClick;
    this.onPieceSelect = config.onPieceSelect;
    this.onPieceDrop = config.onPieceDrop;

    this.init();
  }

  private init() {
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    // Detect software WebGL
    this.isSoftwareGl = (() => {
      try {
        const gl = document.createElement('canvas').getContext('webgl2');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return false;
      }
    })();

    // 1. Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: false,
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Prevent browser default touch gestures so pinch-in/out & orbit work smoothly on mobile
    this.renderer.domElement.style.touchAction = 'none';
    this.container.appendChild(this.renderer.domElement);

    // 2. Scene & Environment
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0f1d);
    this.scene.fog = new THREE.FogExp2(0x0a0f1d, 0.035);

    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 3. Camera (near=0.5, far=50 for high 24-bit depth buffer precision)
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.5, 50);
    this.updateCameraTransform();

    // 4. Lighting Rig
    const keyLight = new THREE.DirectionalLight(0xfff8ee, 2.3);
    keyLight.position.set(6, 12, 8);
    keyLight.castShadow = !this.isSoftwareGl;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 2.0;
    keyLight.shadow.camera.far = 24;
    const shadowD = 6;
    keyLight.shadow.camera.left = -shadowD;
    keyLight.shadow.camera.right = shadowD;
    keyLight.shadow.camera.top = shadowD;
    keyLight.shadow.camera.bottom = -shadowD;
    keyLight.shadow.bias = -0.0015;
    keyLight.shadow.normalBias = 0.03;
    this.scene.add(keyLight);

    const hemiLight = new THREE.HemisphereLight(0x93c5fd, 0x1e293b, 1.25);
    this.scene.add(hemiLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.0);
    rimLight.position.set(-6, 8, -8);
    this.scene.add(rimLight);

    // 5. Materials and Pieces
    this.materials = new MaterialLibrary();
    this.pieceFactory = new PieceFactory(this.materials);

    // 6. Build Board & Overlays
    this.buildBoard();
    this.buildOverlayMeshes();

    this.scene.add(this.boardGroup);
    this.scene.add(this.overlayGroup);
    this.scene.add(this.piecesGroup);
    this.scene.add(this.vfxGroup);

    // 7. Event listeners
    this.setupEventListeners();

    // 8. Start Loop
    this.tick = this.tick.bind(this);
    this.animationFrameId = requestAnimationFrame(this.tick);
  }

  private buildBoard() {
    // Ground Contact Shadow plane well below the board plinth (y = -0.52)
    const shadowGeo = new THREE.PlaneGeometry(16, 16);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x020617,
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
    });
    const shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = -0.52;
    this.boardGroup.add(shadowPlane);

    // Lower Plinth Base strictly below tiles (spans y in [-0.46, -0.22], tiles start at -0.20)
    const basePlinthGeo = new THREE.BoxGeometry(9.6, 0.24, 9.6);
    const basePlinth = new THREE.Mesh(basePlinthGeo, this.materials.boardFrameMat);
    basePlinth.position.y = -0.34;
    basePlinth.receiveShadow = true;
    this.boardGroup.add(basePlinth);

    // 4 Non-Overlapping Perimeter Frame Beams outside the [-4, 4] tile grid
    const northSouthGeo = new THREE.BoxGeometry(9.6, 0.22, 0.72);
    const northBeam = new THREE.Mesh(northSouthGeo, this.materials.boardFrameMat);
    northBeam.position.set(0, -0.11, -4.44);
    northBeam.receiveShadow = true;

    const southBeam = new THREE.Mesh(northSouthGeo, this.materials.boardFrameMat);
    southBeam.position.set(0, -0.11, 4.44);
    southBeam.receiveShadow = true;

    const eastWestGeo = new THREE.BoxGeometry(0.72, 0.22, 8.16);
    const westBeam = new THREE.Mesh(eastWestGeo, this.materials.boardFrameMat);
    westBeam.position.set(-4.44, -0.11, 0);
    westBeam.receiveShadow = true;

    const eastBeam = new THREE.Mesh(eastWestGeo, this.materials.boardFrameMat);
    eastBeam.position.set(4.44, -0.11, 0);
    eastBeam.receiveShadow = true;

    this.boardGroup.add(northBeam, southBeam, westBeam, eastBeam);

    // 4 Non-Overlapping Gold Trim Strips between tiles ([-4, 4]) and outer beams ([-4.08, 4.08])
    const goldNSGeo = new THREE.BoxGeometry(8.16, 0.21, 0.08);
    const goldNorth = new THREE.Mesh(goldNSGeo, this.materials.goldAccentMat);
    goldNorth.position.set(0, -0.105, -4.04);

    const goldSouth = new THREE.Mesh(goldNSGeo, this.materials.goldAccentMat);
    goldSouth.position.set(0, -0.105, 4.04);

    const goldEWGeo = new THREE.BoxGeometry(0.08, 0.21, 8.0);
    const goldWest = new THREE.Mesh(goldEWGeo, this.materials.goldAccentMat);
    goldWest.position.set(-4.04, -0.105, 0);

    const goldEast = new THREE.Mesh(goldEWGeo, this.materials.goldAccentMat);
    goldEast.position.set(4.04, -0.105, 0);

    this.boardGroup.add(goldNorth, goldSouth, goldWest, goldEast);

    // 8x8 Board Tiles (slight 0.996 spacing prevents internal coplanar side-face fighting)
    const tileGeo = new THREE.BoxGeometry(0.996, 0.2, 0.996);
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const isDark = (r + c) % 2 === 0;
        const mat = isDark ? this.materials.woodDarkMat : this.materials.woodLightMat;
        const tile = new THREE.Mesh(tileGeo, mat);

        const x = (c - 3.5) * 1.0;
        const z = (3.5 - r) * 1.0;
        tile.position.set(x, -0.1, z);
        tile.receiveShadow = true;
        tile.castShadow = false;

        const sq = `${String.fromCharCode('a'.charCodeAt(0) + c)}${r + 1}` as Square;
        tile.name = `tile_${sq}`;
        tile.userData = { square: sq, isTile: true };

        this.boardGroup.add(tile);
      }
    }
  }

  private buildOverlayMeshes() {
    const geo = new THREE.PlaneGeometry(0.94, 0.94);
    geo.rotateX(-Math.PI / 2);

    // 3D Red Circle ring right around the piece's base feet (radius 0.435 surrounds the 0.42 piece pedestal)
    const footRingGeo = new THREE.TorusGeometry(0.435, 0.026, 16, 48);
    footRingGeo.rotateX(Math.PI / 2);

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const sq = `${String.fromCharCode('a'.charCodeAt(0) + c)}${r + 1}` as Square;
        const x = (c - 3.5) * 1.0;
        const z = (3.5 - r) * 1.0;

        const mesh = new THREE.Mesh(geo, this.materials.overlaySafeMat);
        mesh.position.set(x, 0.018, z);
        mesh.renderOrder = 2;
        mesh.visible = false;
        mesh.userData = { square: sq, isOverlay: true };

        this.overlayMeshes.set(sq, mesh);
        this.overlayGroup.add(mesh);

        const ringMesh = new THREE.Mesh(footRingGeo, this.materials.captureFootRingMat);
        ringMesh.position.set(x, 0.032, z);
        ringMesh.renderOrder = 3;
        ringMesh.visible = false;
        ringMesh.userData = { square: sq, isCaptureRing: true };

        this.captureRingMeshes.set(sq, ringMesh);
        this.overlayGroup.add(ringMesh);
      }
    }
  }

  public cancelActiveAnimations() {
    for (const anim of this.activeMoveAnimations) {
      const data = anim.mesh.userData as Piece3DUserData | undefined;
      if (data?.bodyGroup) {
        data.bodyGroup.position.set(0, 0, 0);
        data.bodyGroup.rotation.set(0, 0, 0);
      }
      if (data?.leftLegGroup && data?.rightLegGroup) {
        data.leftLegGroup.rotation.set(0, 0, 0);
        data.rightLegGroup.rotation.set(0, 0, 0);
      }
      if (anim.capturedMesh) {
        anim.capturedMesh.scale.set(1, 1, 1);
        anim.capturedMesh.rotation.set(0, 0, 0);
        anim.capturedMesh.position.y = 0;
      }
    }
    this.activeMoveAnimations = [];
    this.cancelCurrentPieceDrag();
  }

  public setGraphicStyle(
    style: GraphicStyle,
    currentBoard: ({ square: Square; type: PieceSymbol; color: Color } | null)[][]
  ) {
    this.graphicStyle = style;
    this.cancelActiveAnimations();
    // Recreate all pieces with the chosen aesthetic
    for (let i = this.piecesGroup.children.length - 1; i >= 0; i--) {
      this.piecesGroup.remove(this.piecesGroup.children[i]);
    }
    this.piecesMap.clear();
    this.syncPieces(currentBoard, true);
  }

  public syncPieces(
    board: ({ square: Square; type: PieceSymbol; color: Color } | null)[][],
    forceRebuild: boolean = false
  ) {
    // Always cancel in-flight move animations so stale onComplete callbacks cannot corrupt piecesMap or leave ghost meshes
    this.cancelActiveAnimations();

    if (forceRebuild) {
      for (let i = this.piecesGroup.children.length - 1; i >= 0; i--) {
        this.piecesGroup.remove(this.piecesGroup.children[i]);
      }
      this.piecesMap.clear();
    }

    const activeSquares = new Set<Square>();

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const item = board[r][c];
        if (!item) continue;

        activeSquares.add(item.square);
        let mesh = this.piecesMap.get(item.square);

        const needsRebuild =
          forceRebuild ||
          !mesh ||
          mesh.userData.pieceType !== item.type ||
          mesh.userData.color !== item.color ||
          mesh.userData.graphicStyle !== this.graphicStyle;

        if (needsRebuild) {
          if (mesh) {
            this.piecesGroup.remove(mesh);
          }
          mesh = this.pieceFactory.createPieceMesh(item.type, item.color, item.square, this.graphicStyle);
          this.piecesGroup.add(mesh);
          this.piecesMap.set(item.square, mesh);
        } else if (mesh) {
          if (mesh.parent !== this.piecesGroup) {
            this.piecesGroup.add(mesh);
          }
          const col = item.square.charCodeAt(0) - 'a'.charCodeAt(0);
          const row = parseInt(item.square[1], 10) - 1;
          mesh.scale.set(1, 1, 1);
          mesh.rotation.set(0, 0, 0);
          mesh.position.set((col - 3.5) * 1.0, 0, (3.5 - row) * 1.0);
          mesh.userData.targetPos.copy(mesh.position);
          mesh.userData.originalPos.copy(mesh.position);
          mesh.userData.square = item.square;
          const data = mesh.userData as Piece3DUserData;
          if (data?.bodyGroup) {
            data.bodyGroup.position.set(0, 0, 0);
            data.bodyGroup.rotation.set(0, 0, 0);
          }
        }
      }
    }

    for (const [sq, mesh] of this.piecesMap.entries()) {
      if (!activeSquares.has(sq)) {
        this.piecesGroup.remove(mesh);
        this.piecesMap.delete(sq);
      }
    }

    // Strictly prune any orphaned/leftover meshes in piecesGroup that are not in piecesMap
    const validMeshes = new Set<THREE.Object3D>(this.piecesMap.values());
    for (let i = this.piecesGroup.children.length - 1; i >= 0; i--) {
      const child = this.piecesGroup.children[i];
      if (!validMeshes.has(child)) {
        this.piecesGroup.remove(child);
      }
    }
  }

  private spawnCaptureVfx(targetPos: THREE.Vector3, isWhiteAttacker: boolean) {
    const vfxParent = new THREE.Group();
    vfxParent.position.copy(targetPos);
    this.vfxGroup.add(vfxParent);

    // 1. Shockwave ring expanding on board surface
    const ringGeo = new THREE.TorusGeometry(0.35, 0.04, 12, 36);
    ringGeo.rotateX(Math.PI / 2);
    const ringMat = this.materials.impactShockwaveMat.clone();
    ringMat.color = isWhiteAttacker ? new THREE.Color(0xf59e0b) : new THREE.Color(0xef4444);
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.position.y = 0.05;
    vfxParent.add(ringMesh);

    // 2. High-speed Slash Arc Mesh
    const arcGeo = new THREE.RingGeometry(0.2, 0.45, 16, 1, -Math.PI / 3, Math.PI * 0.85);
    const arcMat = this.materials.slashArcMat.clone();
    arcMat.color = isWhiteAttacker ? new THREE.Color(0x67e8f9) : new THREE.Color(0xf43f5e);
    const arcMesh = new THREE.Mesh(arcGeo, arcMat);
    arcMesh.position.set(0, 0.55, 0);
    arcMesh.rotation.x = -Math.PI / 3;
    arcMesh.rotation.y = Math.PI / 4;
    vfxParent.add(arcMesh);

    // 3. Radial Spark particles bursting outwards in arcs
    const sparkCount = 18;
    const sparkGeos: Array<{ mesh: THREE.Mesh; vel: THREE.Vector3 }> = [];
    const sparkMat = this.materials.sparkParticleMat.clone();
    sparkMat.color = isWhiteAttacker ? new THREE.Color(0xfef08a) : new THREE.Color(0xfca5a5);

    for (let i = 0; i < sparkCount; i++) {
      const sp = new THREE.Mesh(new THREE.SphereGeometry(0.024, 6, 6), sparkMat);
      sp.position.set(0, 0.45, 0);
      const angle = (i / sparkCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
      const speed = 2.2 + Math.random() * 2.8;
      const vel = new THREE.Vector3(
        Math.cos(angle) * speed,
        1.8 + Math.random() * 2.5,
        Math.sin(angle) * speed
      );
      vfxParent.add(sp);
      sparkGeos.push({ mesh: sp, vel });
    }

    this.cameraShake = 0.22;

    this.activeVfx.push({
      group: vfxParent,
      age: 0,
      lifetime: 0.75,
      update: (delta, progress) => {
        // Shockwave expansion & fade
        const scale = 0.3 + progress * 2.8;
        ringMesh.scale.set(scale, scale, scale);
        ringMat.opacity = Math.max(0, 1.0 - progress * 1.2);

        // Slash arc rotation & fade
        arcMesh.rotation.z += delta * 12;
        arcMesh.scale.setScalar(1.0 + progress * 0.8);
        arcMat.opacity = Math.max(0, 1.0 - progress * 1.6);

        // Sparks physics
        for (const item of sparkGeos) {
          item.mesh.position.x += item.vel.x * delta;
          item.mesh.position.y += item.vel.y * delta;
          item.mesh.position.z += item.vel.z * delta;
          item.vel.y -= 9.8 * delta; // gravity
          const s = Math.max(0.001, (1.0 - progress) * 0.024);
          item.mesh.scale.set(s, s, s);
        }
      },
    });
  }

  public animateMove(from: Square, to: Square, isCapture: boolean, onFinished?: () => void) {
    const mesh = this.piecesMap.get(from);
    if (!mesh) {
      if (onFinished) onFinished();
      return;
    }

    const tCol = to.charCodeAt(0) - 'a'.charCodeAt(0);
    const tRow = parseInt(to[1], 10) - 1;
    const destPos = new THREE.Vector3((tCol - 3.5) * 1.0, 0, (3.5 - tRow) * 1.0);

    const capturedMesh = this.piecesMap.get(to);

    if (isCapture) {
      sound.playCapture();
    } else {
      sound.playMove();
    }

    // Capture attack animation has cinematic wind-up, dynamic strike, and victim recoil
    this.activeMoveAnimations.push({
      mesh,
      startPos: mesh.position.clone(),
      endPos: destPos,
      progress: 0,
      speed: isCapture ? 2.4 : 3.5,
      isCapture,
      capturedMesh,
      effectSpawned: false,
      onComplete: () => {
        if (capturedMesh) {
          this.piecesGroup.remove(capturedMesh);
        }
        this.piecesMap.delete(from);
        this.piecesMap.set(to, mesh);
        mesh.userData.square = to;
        mesh.userData.originalPos.copy(destPos);
        mesh.userData.targetPos.copy(destPos);
        // Reset attacker posture
        const data = mesh.userData as Piece3DUserData;
        if (data && data.bodyGroup) {
          data.bodyGroup.rotation.set(0, 0, 0);
          data.bodyGroup.position.set(0, 0, 0);
        }
        if (onFinished) onFinished();
      },
    });
  }

  public updateTacticalStatuses(statuses: Map<Square, PieceTacticalStatus>) {
    for (const [sq, mesh] of this.piecesMap.entries()) {
      const status = statuses.get(sq);
      const data = mesh.userData as Piece3DUserData;
      if (!data) continue;

      if (status) {
        data.isTrembling = status.isTrembling;
        this.pieceFactory.updateWeaponStance(mesh, status.weaponStance);
      } else {
        data.isTrembling = false;
        this.pieceFactory.updateWeaponStance(mesh, 'none');
      }
    }
  }

  /**
   * Applies overlay tiles:
   * - 安全なマスは青色 (守りのない震えている敵駒のマスも青色)
   * - 効きのあるマスは黄色 (敵の守り・効きがあるマス)
   * - 選択した駒で取れる駒は今までの表示(青or黄)＋足元に赤丸
   * - 選択された駒マスは青ハイライト
   * - 行けないマスは何もしない (非表示)
   */
  public setTileOverlays(overlays: TileOverlayInfo[]) {
    // Hide all first
    for (const mesh of this.overlayMeshes.values()) {
      mesh.visible = false;
    }
    for (const ring of this.captureRingMeshes.values()) {
      ring.visible = false;
    }

    this.legalDestinations.clear();

    for (const item of overlays) {
      const mesh = this.overlayMeshes.get(item.square);
      if (!mesh) continue;

      if (item.type === 'safe') {
        mesh.visible = true;
        mesh.material = item.isCapture
          ? this.materials.overlaySafeCaptureMat
          : this.materials.overlaySafeMat;
        this.legalDestinations.add(item.square);
      } else if (item.type === 'attacked') {
        mesh.visible = true;
        mesh.material = item.isCapture
          ? this.materials.overlayAttackedCaptureMat
          : this.materials.overlayAttackedMat;
        this.legalDestinations.add(item.square);
      } else if (item.type === 'selected') {
        mesh.visible = true;
        mesh.material = this.materials.overlaySelectedMat;
      } else if (item.type === 'illegal') {
        mesh.visible = true;
        mesh.material = this.materials.overlayIllegalMat;
      }

      if (item.isCapture) {
        const ring = this.captureRingMeshes.get(item.square);
        if (ring) {
          ring.visible = true;
        }
      }
    }
  }

  public flashIllegalSquare(square: Square) {
    const mesh = this.overlayMeshes.get(square);
    if (!mesh) return;

    sound.playIllegal();
    mesh.visible = true;
    mesh.material = this.materials.overlayIllegalMat;

    // Disappear after brief feedback
    setTimeout(() => {
      if (mesh && mesh.material === this.materials.overlayIllegalMat) {
        mesh.visible = false;
      }
    }, 700);
  }

  public clearOverlays() {
    this.legalDestinations.clear();
    for (const mesh of this.overlayMeshes.values()) {
      mesh.visible = false;
    }
    for (const ring of this.captureRingMeshes.values()) {
      ring.visible = false;
    }
  }

  public setCameraView(preset: 'white' | 'black' | 'side' | 'top' | 'isometric') {
    if (preset === 'white') {
      this.targetAngleY = 0;
      this.targetPitch = 0.82;
      this.targetDistance = 10.5;
    } else if (preset === 'black') {
      this.targetAngleY = Math.PI;
      this.targetPitch = 0.82;
      this.targetDistance = 10.5;
    } else if (preset === 'side') {
      this.targetAngleY = Math.PI / 2;
      this.targetPitch = 0.85;
      this.targetDistance = 10.5;
    } else if (preset === 'top') {
      this.targetPitch = 1.48;
      this.targetDistance = 11.2;
    } else if (preset === 'isometric') {
      this.targetAngleY = Math.PI / 4;
      this.targetPitch = 0.75;
      this.targetDistance = 10.0;
    }
  }

  public rotateYBy(deltaAngle: number) {
    this.targetAngleY += deltaAngle;
  }

  public zoomBy(deltaDistance: number) {
    this.targetDistance = Math.max(
      this.minDistance,
      Math.min(this.maxDistance, this.targetDistance + deltaDistance)
    );
  }

  public setZoomDistance(distance: number) {
    this.targetDistance = Math.max(
      this.minDistance,
      Math.min(this.maxDistance, distance)
    );
  }

  private updateCameraTransform() {
    const horizontalDist = this.currentDistance * Math.cos(this.currentPitch);
    const camY = this.lookAtTarget.y + this.currentDistance * Math.sin(this.currentPitch);
    const camX = this.lookAtTarget.x + horizontalDist * Math.sin(this.currentAngleY);
    const camZ = this.lookAtTarget.z + horizontalDist * Math.cos(this.currentAngleY);

    if (this.cameraShake > 0) {
      const sx = (Math.random() - 0.5) * this.cameraShake;
      const sy = (Math.random() - 0.5) * this.cameraShake;
      const sz = (Math.random() - 0.5) * this.cameraShake;
      this.camera.position.set(camX + sx, camY + sy, camZ + sz);
      this.camera.lookAt(
        this.lookAtTarget.x + sx * 0.5,
        this.lookAtTarget.y + sy * 0.5,
        this.lookAtTarget.z + sz * 0.5
      );
    } else {
      this.camera.position.set(camX, camY, camZ);
      this.camera.lookAt(this.lookAtTarget);
    }
  }

  private cancelCurrentPieceDrag() {
    if (this.draggedPiece) {
      const targetPos = this.draggedPiece.userData?.targetPos as THREE.Vector3 | undefined;
      if (targetPos) {
        this.draggedPiece.position.copy(targetPos);
      }
    }
    this.draggedPiece = null;
    this.dragStartSquare = null;
    this.isDraggingPiece = false;
  }

  private setupEventListeners() {
    const el = this.renderer.domElement;

    // 1. Pointer Down (Single pointer or Multi-touch Pinch start)
    el.addEventListener('pointerdown', (e) => {
      this.activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      // If 2 or more fingers are touching -> switch to Pinch Zoom mode immediately
      if (this.activePointers.size >= 2) {
        this.isPinching = true;
        this.didDragCamera = true;
        this.cancelCurrentPieceDrag();

        const pts = Array.from(this.activePointers.values());
        this.lastPinchDistance = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        return;
      }

      this.isPinching = false;
      this.isPointerDown = true;
      this.didDragCamera = false;
      this.pointerDownPos = { x: e.clientX, y: e.clientY };

      const rect = el.getBoundingClientRect();
      this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.pointer, this.camera);
      const pieceIntersects = this.raycaster.intersectObjects(this.piecesGroup.children, true);

      if (pieceIntersects.length > 0) {
        let cur: THREE.Object3D | null = pieceIntersects[0].object;
        while (cur && cur !== this.piecesGroup) {
          if (cur.userData && cur.userData.square) {
            this.draggedPiece = cur as THREE.Group;
            this.dragStartSquare = cur.userData.square as Square;
            break;
          }
          cur = cur.parent;
        }
      } else {
        this.draggedPiece = null;
        this.dragStartSquare = null;
      }
    });

    // 2. Pointer Move (Pinch Zoom, Orbit, or Drag Piece)
    window.addEventListener('pointermove', (e) => {
      if (this.activePointers.has(e.pointerId)) {
        this.activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      }

      // Handle 2-finger Pinch-in / Pinch-out via PointerEvents
      if (this.activePointers.size >= 2) {
        this.isPinching = true;
        this.didDragCamera = true;
        this.cancelCurrentPieceDrag();

        const pts = Array.from(this.activePointers.values());
        const currentDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        if (this.lastPinchDistance > 0) {
          const delta = (this.lastPinchDistance - currentDist) * 0.025;
          this.zoomBy(delta);
        }
        this.lastPinchDistance = currentDist;
        return;
      }

      if (!this.isPointerDown || this.isPinching) return;
      const dx = e.clientX - this.pointerDownPos.x;
      const dy = e.clientY - this.pointerDownPos.y;

      const rect = el.getBoundingClientRect();
      this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      // Check if dragging piece or orbiting camera
      if (this.draggedPiece) {
        if (!this.isDraggingPiece && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
          this.isDraggingPiece = true;
          // Notify piece selection for overlays
          if (this.dragStartSquare && this.onPieceSelect) {
            this.onPieceSelect(this.dragStartSquare);
          }
        }

        if (this.isDraggingPiece) {
          // Raycast to ground plane y = 0.5 to follow cursor in 3D
          this.raycaster.setFromCamera(this.pointer, this.camera);
          if (this.raycaster.ray.intersectPlane(this.dragPlane, this.dragIntersection)) {
            this.draggedPiece.position.x = this.dragIntersection.x;
            this.draggedPiece.position.z = this.dragIntersection.z;
            this.draggedPiece.position.y = 0.55; // lifted height while dragging
          }
          return;
        }
      }

      // Otherwise camera orbit
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
        this.didDragCamera = true;
        this.targetAngleY -= dx * 0.006;
        this.targetPitch = Math.max(0.3, Math.min(1.5, this.targetPitch + dy * 0.005));
        this.pointerDownPos = { x: e.clientX, y: e.clientY };
      }
    });

    // 3. Pointer Up / Cancel (Drop or Tap)
    const handlePointerEnd = (e: PointerEvent, isCancel: boolean) => {
      this.activePointers.delete(e.pointerId);

      if (this.activePointers.size < 2) {
        this.lastPinchDistance = 0;
      }
      if (this.activePointers.size === 0) {
        // Reset pinch flag once all fingers lift
        if (this.isPinching) {
          this.isPinching = false;
          this.isPointerDown = false;
          return;
        }
      } else {
        // Still one finger down after a pinch
        const remaining = Array.from(this.activePointers.values())[0];
        this.pointerDownPos = { x: remaining.x, y: remaining.y };
        return;
      }

      if (!this.isPointerDown) return;
      this.isPointerDown = false;

      if (isCancel) {
        this.cancelCurrentPieceDrag();
        return;
      }

      const rect = el.getBoundingClientRect();
      this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      // If user was dragging a piece -> DROP handling
      if (this.isDraggingPiece && this.draggedPiece && this.dragStartSquare) {
        this.isDraggingPiece = false;
        const fromSq = this.dragStartSquare;
        const pieceMesh = this.draggedPiece;
        this.draggedPiece = null;
        this.dragStartSquare = null;

        // Find which tile it was dropped on
        this.raycaster.setFromCamera(this.pointer, this.camera);
        const tileIntersects = this.raycaster.intersectObjects([
          ...this.boardGroup.children,
          ...this.overlayGroup.children
        ], true);

        let droppedSquare: Square | null = null;
        for (const hit of tileIntersects) {
          let cur: THREE.Object3D | null = hit.object;
          while (cur && cur !== this.scene) {
            if (cur.userData && cur.userData.square) {
              droppedSquare = cur.userData.square as Square;
              break;
            }
            cur = cur.parent;
          }
          if (droppedSquare) break;
        }

        if (droppedSquare && droppedSquare !== fromSq) {
          // If dropped on a valid legal destination
          if (this.legalDestinations.has(droppedSquare)) {
            if (this.onPieceDrop) {
              this.onPieceDrop(fromSq, droppedSquare);
            } else {
              this.onSquareClick(droppedSquare);
            }
            return;
          } else {
            // Illegal drop destination -> snap back with 'X' mark flash
            this.flashIllegalSquare(droppedSquare);
            const targetPos = pieceMesh.userData.targetPos as THREE.Vector3;
            pieceMesh.position.copy(targetPos);
            return;
          }
        } else {
          // Released outside or on same square -> return to original
          const targetPos = pieceMesh.userData.targetPos as THREE.Vector3;
          pieceMesh.position.copy(targetPos);
          return;
        }
      }

      this.draggedPiece = null;
      this.dragStartSquare = null;
      this.isDraggingPiece = false;

      // If not camera drag -> SINGLE TAP
      if (!this.didDragCamera) {
        this.handleSingleTap(e.clientX, e.clientY);
      }
    };

    window.addEventListener('pointerup', (e) => handlePointerEnd(e, false));
    window.addEventListener('pointercancel', (e) => handlePointerEnd(e, true));

    // Touch pinch-to-zoom fallback for mobile browsers (TouchEvents)
    let initialTouchDist = 0;
    el.addEventListener('touchstart', (e) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        this.isPinching = true;
        this.didDragCamera = true;
        this.cancelCurrentPieceDrag();
        initialTouchDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
      }
    }, { passive: false });

    el.addEventListener('touchmove', (e) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const currentDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        // Only apply if activePointers didn't already process this frame
        if (this.activePointers.size < 2 && initialTouchDist > 0) {
          const factor = (initialTouchDist - currentDist) * 0.025;
          this.zoomBy(factor);
        }
        initialTouchDist = currentDist;
      }
    }, { passive: false });

    // Mouse wheel & Trackpad two-finger pinch (ctrlKey) zoom
    el.addEventListener('wheel', (e) => {
      e.preventDefault();
      // Trackpad pinch gestures send wheel events with e.ctrlKey === true and smaller deltaY
      const sensitivity = e.ctrlKey ? 0.02 : 0.006;
      this.zoomBy(e.deltaY * sensitivity);
    }, { passive: false });

    window.addEventListener('resize', this.handleResize.bind(this));
  }

  /**
   * Single Tap on a piece or destination square
   */
  private handleSingleTap(clientX: number, clientY: number) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.pointer, this.camera);

    const intersects = this.raycaster.intersectObjects([
      ...this.piecesGroup.children,
      ...this.overlayGroup.children,
      ...this.boardGroup.children,
    ], true);

    if (intersects.length > 0) {
      for (const hit of intersects) {
        let cur: THREE.Object3D | null = hit.object;
        while (cur && cur !== this.scene) {
          if (cur.userData && cur.userData.square) {
            const sq = cur.userData.square as Square;
            this.onSquareClick(sq);
            return;
          }
          cur = cur.parent;
        }
      }
    } else {
      if (this.onPieceSelect) this.onPieceSelect(null);
    }
  }

  public handleResize() {
    if (!this.container || this.isDisposed) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  private tick() {
    if (this.isDisposed) return;

    const delta = Math.min(this.clock.getDelta(), 0.05);
    const elapsedTime = this.clock.getElapsedTime();

    // 1. Camera interpolation & Shake decay
    this.currentAngleY = THREE.MathUtils.damp(this.currentAngleY, this.targetAngleY, 12, delta);
    this.currentPitch = THREE.MathUtils.damp(this.currentPitch, this.targetPitch, 12, delta);
    this.currentDistance = THREE.MathUtils.damp(this.currentDistance, this.targetDistance, 10, delta);
    if (this.cameraShake > 0) {
      this.cameraShake = Math.max(0, this.cameraShake - delta * 1.4);
    }
    this.updateCameraTransform();

    // 2. Animate move glide & dynamic capture attacks
    for (let i = this.activeMoveAnimations.length - 1; i >= 0; i--) {
      const anim = this.activeMoveAnimations[i];
      anim.progress += delta * anim.speed;
      const p = Math.min(1.0, anim.progress);
      const data = anim.mesh.userData as Piece3DUserData;

      if (anim.isCapture) {
        // High-octane capture attack sequence:
        // Phase 1 (0 to 0.45): Attacker leaps up, winds up right arm & weapon overhead
        if (p < 0.45) {
          const leapT = p / 0.45;
          anim.mesh.position.lerpVectors(anim.startPos, anim.endPos, p);
          anim.mesh.position.y = Math.sin(leapT * Math.PI * 0.5) * 1.25;
          if (data && data.bodyGroup) {
            data.bodyGroup.rotation.x = -0.35 * leapT; // wind-up back arch
            if (data.rightArmGroup) {
              // Human warrior raises sword/lance arm high overhead
              data.rightArmGroup.rotation.set(-2.1 * leapT, -0.2, -0.15);
              if (data.weaponGroup) data.weaponGroup.rotation.set(0.95 * leapT, 0, 0);
            } else if (data.weaponGroup) {
              data.weaponGroup.rotation.x = -0.95 * leapT;
            }
            if (data.leftArmGroup) {
              data.leftArmGroup.rotation.set(-0.9 * leapT, 0.3, 0.35);
            }
            if (data.leftLegGroup && data.rightLegGroup) {
              // Mid-air heroic leap stride
              data.leftLegGroup.rotation.x = 0.55 * leapT;
              data.rightLegGroup.rotation.x = -0.45 * leapT;
            }
          }
        } else {
          // Phase 2 (0.45 to 1.0): Attacker slams down & slashes weapon across target!
          const strikeT = (p - 0.45) / 0.55;
          anim.mesh.position.lerpVectors(anim.startPos, anim.endPos, p);
          anim.mesh.position.y = Math.cos(strikeT * Math.PI * 0.5) * 1.25;

          if (!anim.effectSpawned) {
            anim.effectSpawned = true;
            this.spawnCaptureVfx(anim.endPos, data.color === 'w');
          }

          if (data && data.bodyGroup) {
            // Forward strike slash follow-through
            data.bodyGroup.rotation.x = Math.sin((1 - strikeT) * Math.PI) * 0.42;
            if (data.rightArmGroup) {
              // Overhead downward cleave toward +Z
              const slashAngle = THREE.MathUtils.lerp(-2.1, -0.35, Math.min(1, strikeT * 1.5));
              data.rightArmGroup.rotation.set(slashAngle, 0.15, 0);
              if (data.weaponGroup) {
                data.weaponGroup.rotation.set(THREE.MathUtils.lerp(0.95, 1.55, Math.min(1, strikeT * 1.5)), 0, 0);
              }
            } else if (data.weaponGroup) {
              data.weaponGroup.rotation.x = 0.85 * (1 - strikeT * 0.5);
            }
            if (data.leftArmGroup) {
              data.leftArmGroup.rotation.set(-0.3, -0.2, 0.25);
            }
            if (data.leftLegGroup && data.rightLegGroup) {
              data.leftLegGroup.rotation.x = 0.35 * (1 - strikeT);
              data.rightLegGroup.rotation.x = -0.35 * (1 - strikeT);
            }
          }

          // Victim knocked back, toppled, and dissolved
          if (anim.capturedMesh) {
            anim.capturedMesh.rotation.x = -strikeT * Math.PI * 0.65;
            anim.capturedMesh.rotation.z = Math.sin(strikeT * Math.PI) * 0.35;
            anim.capturedMesh.position.y = -strikeT * 0.45;
            const s = Math.max(0.001, 1.0 - strikeT * 0.95);
            anim.capturedMesh.scale.set(s, s, s);
          }
        }
      } else {
        // Standard non-capture move: smooth arched stride
        anim.mesh.position.lerpVectors(anim.startPos, anim.endPos, p);
        anim.mesh.position.y = Math.sin(p * Math.PI) * 0.75;
        if (data && data.leftLegGroup && data.rightLegGroup) {
          const stride = Math.sin(p * Math.PI * 2) * 0.4;
          data.leftLegGroup.rotation.x = stride;
          data.rightLegGroup.rotation.x = -stride;
        }
      }

      if (p >= 1.0) {
        anim.mesh.position.copy(anim.endPos);
        anim.mesh.position.y = 0;
        if (data && data.leftLegGroup && data.rightLegGroup) {
          data.leftLegGroup.rotation.set(0, 0, 0);
          data.rightLegGroup.rotation.set(0, 0, 0);
        }
        if (anim.capturedMesh) {
          this.piecesGroup.remove(anim.capturedMesh);
        }
        if (anim.onComplete) anim.onComplete();
        this.activeMoveAnimations.splice(i, 1);
      }
    }

    // 3. Update Combat VFX (Shockwave ring expansion, spark physics, slash arc)
    for (let i = this.activeVfx.length - 1; i >= 0; i--) {
      const vfx = this.activeVfx[i];
      vfx.age += delta;
      const vfxProgress = Math.min(1.0, vfx.age / vfx.lifetime);
      vfx.update(delta, vfxProgress);
      if (vfxProgress >= 1.0) {
        this.vfxGroup.remove(vfx.group);
        this.activeVfx.splice(i, 1);
      }
    }

    // 4. Dynamic Humanoid & Piece Motions:
    // - 通常時: 人間らしい呼吸・周囲を見渡す頭部・自然な腕の揺れ
    // - 構える: 一歩踏み出し前傾して武器を敵に突きつける攻撃姿勢
    // - 携える: 足腰を据えて盾と武器を胸元に構える護衛姿勢
    // - 恐怖（震え）: 頭を抱えうずくまり、首を振って膝がガタガタ震える恐怖モーション
    for (const mesh of this.piecesMap.values()) {
      const data = mesh.userData as Piece3DUserData;
      if (!data) continue;

      // Skip dragged or moving piece
      if (mesh === this.draggedPiece || this.activeMoveAnimations.some(a => a.mesh === mesh)) {
        continue;
      }

      const seedTime = elapsedTime + (data.seed || 0);

      // Base (mesh.position) always stays firmly planted on the square
      mesh.position.x = data.targetPos.x;
      mesh.position.z = data.targetPos.z;
      mesh.position.y = 0;

      if (data.isTrembling) {
        // 恐怖（震え）: 土台は一切動かさず、上のキャラクター（駒本体）だけがその場で小刻みにブルブル震える
        const shiverX = Math.sin(seedTime * 55) * 0.014;
        const shiverZ = Math.cos(seedTime * 61) * 0.014;

        if (data.bodyGroup) {
          data.bodyGroup.position.set(shiverX, 0, shiverZ);
          data.bodyGroup.rotation.set(
            0.04 + Math.sin(seedTime * 42) * 0.015,
            Math.sin(seedTime * 38) * 0.025,
            Math.cos(seedTime * 46) * 0.015
          );
        }
        if (data.headGroup) {
          // 怯えて少し俯きながら小刻みに震える
          data.headGroup.rotation.set(
            0.08 + Math.sin(seedTime * 40) * 0.025,
            Math.sin(seedTime * 30) * 0.09,
            0
          );
        }
        if (data.leftArmGroup && data.rightArmGroup) {
          // 脇を締めて身構えながら腕と武器が小刻みに震える
          data.leftArmGroup.rotation.set(
            -0.38 + Math.sin(seedTime * 50) * 0.045,
            0.22,
            0.08
          );
          data.rightArmGroup.rotation.set(
            -0.38 + Math.cos(seedTime * 52) * 0.045,
            -0.2,
            -0.08
          );
          if (data.weaponGroup) {
            data.weaponGroup.rotation.set(
              0.35 + Math.sin(seedTime * 54) * 0.05,
              0,
              0
            );
          }
        } else if (data.weaponGroup) {
          data.weaponGroup.rotation.x = Math.sin(seedTime * 50) * 0.06;
        }
        if (data.leftLegGroup && data.rightLegGroup) {
          // 膝がわずかにガクガク震える
          const kneeTremor = Math.sin(seedTime * 50) * 0.025;
          data.leftLegGroup.rotation.set(0, 0, 0.03 + kneeTremor);
          data.rightLegGroup.rotation.set(0, 0, -0.03 - kneeTremor);
        }

      } else if (data.weaponStance === 'attack') {
        // 構える: 一歩前に踏み込み、身を乗り出して右腕の武器を敵へ突きつける攻撃態勢
        if (data.bodyGroup) {
          data.bodyGroup.position.set(0, Math.sin(seedTime * 3.8) * 0.01, 0);
          data.bodyGroup.rotation.set(
            0.12,
            0,
            Math.sin(seedTime * 2.0) * 0.01
          );
        }
        if (data.headGroup) {
          data.headGroup.rotation.set(-0.08, Math.sin(seedTime * 1.5) * 0.05, 0);
        }
        if (data.rightArmGroup) {
          data.rightArmGroup.rotation.set(
            -0.75 + Math.sin(seedTime * 4.2) * 0.05,
            -0.12,
            -0.1
          );
          if (data.weaponGroup) data.weaponGroup.rotation.set(1.35, 0, 0);
        } else if (data.weaponGroup) {
          data.weaponGroup.rotation.x = Math.PI / 3.2 + Math.sin(seedTime * 4.0) * 0.04;
        }
        if (data.leftArmGroup) {
          data.leftArmGroup.rotation.set(-0.48, 0.28, 0.15);
        }
        if (data.leftLegGroup && data.rightLegGroup) {
          data.leftLegGroup.rotation.set(0.18, 0, 0);
          data.rightLegGroup.rotation.set(-0.18, 0, 0);
        }

      } else if (data.weaponStance === 'defense') {
        // 携える: 足腰をどっしり落とし、左腕の盾と右腕の武器を胸前に掲げて味方を護衛する姿勢
        if (data.bodyGroup) {
          data.bodyGroup.position.set(0, Math.sin(seedTime * 2.0) * 0.005, 0);
          data.bodyGroup.rotation.set(-0.05, 0, 0);
        }
        if (data.headGroup) {
          data.headGroup.rotation.set(0.03, Math.sin(seedTime * 1.2) * 0.12, 0);
        }
        if (data.rightArmGroup) {
          data.rightArmGroup.rotation.set(
            -0.32 + Math.sin(seedTime * 2.2) * 0.025,
            0.25,
            0.15
          );
          if (data.weaponGroup) data.weaponGroup.rotation.set(0.35, 0, -0.15);
        } else if (data.weaponGroup) {
          data.weaponGroup.rotation.x = 0;
          data.weaponGroup.rotation.z = -0.1;
        }
        if (data.leftArmGroup) {
          data.leftArmGroup.rotation.set(-0.62, 0.48, 0.22);
        }
        if (data.leftLegGroup && data.rightLegGroup) {
          data.leftLegGroup.rotation.set(-0.1, 0, -0.04);
          data.rightLegGroup.rotation.set(0.1, 0, 0.04);
        }

      } else {
        // 通常時: 人間らしい自然な呼吸モーション、周囲を見渡す頭部、リラックスした両腕の揺れ
        const breath = Math.sin(seedTime * 2.2);
        if (data.bodyGroup) {
          data.bodyGroup.position.set(0, (breath + 1) * 0.005, 0);
          data.bodyGroup.rotation.set(
            breath * 0.012,
            0,
            Math.cos(seedTime * 1.4) * 0.008
          );
        }
        if (data.headGroup) {
          data.headGroup.rotation.set(
            -breath * 0.02,
            Math.sin(seedTime * 0.85) * 0.1,
            0
          );
        }
        if (data.leftArmGroup && data.rightArmGroup) {
          data.leftArmGroup.rotation.set(breath * 0.035, 0, 0.05 + breath * 0.015);
          data.rightArmGroup.rotation.set(-breath * 0.035, 0, -0.05 - breath * 0.015);
        }
        if (data.leftLegGroup && data.rightLegGroup) {
          data.leftLegGroup.rotation.set(0, 0, 0);
          data.rightLegGroup.rotation.set(0, 0, 0);
        }
      }
    }

    this.renderer.render(this.scene, this.camera);
    this.animationFrameId = requestAnimationFrame(this.tick);
  }

  public dispose() {
    this.isDisposed = true;
    cancelAnimationFrame(this.animationFrameId);
    window.removeEventListener('resize', this.handleResize);

    this.renderer.dispose();
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}
