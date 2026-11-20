import * as THREE from 'three';

/**
 * Procedural PBR Canvas Textures generator
 * 100% procedural, 0 external assets, zero 404 risk.
 */

export function createWoodTexture(isDark: boolean = false): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const baseCol = isDark ? '#5c2c16' : '#ebdcc5';
  const grainCol = isDark ? '#3b180a' : '#c9a87d';

  ctx.fillStyle = baseCol;
  ctx.fillRect(0, 0, 512, 512);

  // Procedural wood ring layers
  ctx.fillStyle = grainCol;
  ctx.globalAlpha = 0.2;
  for (let i = 0; i < 60; i++) {
    const y = i * 9 + Math.sin(i * 0.4) * 5;
    ctx.beginPath();
    ctx.ellipse(256, y, 240 + Math.sin(i) * 20, 2 + Math.random() * 3, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Micro grain lines
  ctx.globalAlpha = 0.08;
  for (let x = 0; x < 512; x += 3) {
    ctx.fillRect(x + Math.sin(x * 0.05) * 4, 0, 1.5, 512);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

export function createMarbleTexture(isBlack: boolean = false): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const base = isBlack ? '#18181b' : '#f8fafc';
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 512, 512);

  // Veins
  const veinColor = isBlack ? '#3f3f46' : '#94a3b8';
  ctx.strokeStyle = veinColor;
  ctx.globalAlpha = isBlack ? 0.25 : 0.18;
  ctx.lineWidth = 2.5;

  for (let v = 0; v < 6; v++) {
    ctx.beginPath();
    let x = Math.random() * 512;
    let y = 0;
    ctx.moveTo(x, y);
    while (y < 512) {
      x += (Math.random() - 0.5) * 40;
      y += 20 + Math.random() * 30;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

export function createDamascusTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(0, 0, 512, 512);

  // Damascus folded steel watered pattern
  ctx.fillStyle = '#475569';
  ctx.globalAlpha = 0.22;
  for (let y = 0; y < 512; y += 4) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= 512; x += 16) {
      const wave = Math.sin(x * 0.04 + y * 0.02) * 8 + Math.cos(x * 0.08) * 4;
      ctx.lineTo(x, y + wave);
    }
    ctx.lineTo(512, y + 2);
    ctx.lineTo(0, y + 2);
    ctx.fill();
  }

  // Micro folded carbon lines
  ctx.globalAlpha = 0.15;
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 40; i++) {
    const startY = i * 13;
    ctx.beginPath();
    ctx.moveTo(0, startY);
    for (let x = 0; x <= 512; x += 32) {
      ctx.quadraticCurveTo(x + 16, startY + Math.sin(x * 0.1) * 12, x + 32, startY);
    }
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

export function createUltraMarbleTexture(isBlack: boolean = false): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const base = isBlack ? '#111217' : '#fcfbf9';
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 512, 512);

  // Soft cloudy depth mottling
  ctx.fillStyle = isBlack ? '#27272a' : '#f1ede4';
  ctx.globalAlpha = 0.35;
  for (let i = 0; i < 35; i++) {
    const rx = Math.random() * 512;
    const ry = Math.random() * 512;
    const rad = 40 + Math.random() * 80;
    ctx.beginPath();
    ctx.arc(rx, ry, rad, 0, Math.PI * 2);
    ctx.fill();
  }

  // Main natural mineral veins
  ctx.strokeStyle = isBlack ? '#52525b' : '#cbd5e1';
  ctx.globalAlpha = isBlack ? 0.45 : 0.35;
  ctx.lineWidth = 2.2;
  for (let v = 0; v < 8; v++) {
    ctx.beginPath();
    let x = Math.random() * 512;
    let y = 0;
    ctx.moveTo(x, y);
    while (y < 512) {
      x += (Math.random() - 0.5) * 50;
      y += 15 + Math.random() * 35;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // Gold filigree / Kintsugi metallic inlay veins (for Ultra-Realistic pieces)
  ctx.strokeStyle = '#f59e0b';
  ctx.globalAlpha = 0.65;
  ctx.lineWidth = 1.6;
  for (let g = 0; g < 4; g++) {
    ctx.beginPath();
    let gx = Math.random() * 512;
    let gy = 0;
    ctx.moveTo(gx, gy);
    while (gy < 512) {
      gx += (Math.sin(gy * 0.05) + (Math.random() - 0.5)) * 30;
      gy += 20 + Math.random() * 40;
      ctx.lineTo(gx, gy);
    }
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

export function createOverlayTexture(
  type: 'safe' | 'attacked' | 'illegal',
  withCaptureRing: boolean = false
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, 256, 256);

  if (type === 'safe') {
    // Glowing Blue Neon with soft center and sharp border
    const grad = ctx.createRadialGradient(128, 128, 20, 128, 128, 120);
    grad.addColorStop(0, 'rgba(59, 130, 246, 0.45)');
    grad.addColorStop(0.7, 'rgba(37, 99, 235, 0.3)');
    grad.addColorStop(1, 'rgba(96, 165, 250, 0.9)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(16, 16, 224, 224, 28);
    ctx.fill();

    // Luminous perimeter border
    ctx.strokeStyle = '#60a5fa';
    ctx.lineWidth = 8;
    ctx.stroke();

    // Inner target ring (only when not a capture, or kept subtle under piece)
    if (!withCaptureRing) {
      ctx.beginPath();
      ctx.arc(128, 128, 36, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(147, 197, 253, 0.85)';
      ctx.fill();
    }

  } else if (type === 'attacked') {
    // Glowing Amber/Yellow with target brackets
    const grad = ctx.createRadialGradient(128, 128, 20, 128, 128, 120);
    grad.addColorStop(0, 'rgba(234, 179, 8, 0.5)');
    grad.addColorStop(0.7, 'rgba(202, 138, 4, 0.35)');
    grad.addColorStop(1, 'rgba(250, 204, 21, 0.95)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(16, 16, 224, 224, 28);
    ctx.fill();

    // Corner combat brackets
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';

    const bLen = 42;
    // Top-left
    ctx.beginPath();
    ctx.moveTo(32, 32 + bLen);
    ctx.lineTo(32, 32);
    ctx.lineTo(32 + bLen, 32);
    ctx.stroke();

    // Top-right
    ctx.beginPath();
    ctx.moveTo(224 - bLen, 32);
    ctx.lineTo(224, 32);
    ctx.lineTo(224, 32 + bLen);
    ctx.stroke();

    // Bottom-left
    ctx.beginPath();
    ctx.moveTo(32, 224 - bLen);
    ctx.lineTo(32, 224);
    ctx.lineTo(32 + bLen, 224);
    ctx.stroke();

    // Bottom-right
    ctx.beginPath();
    ctx.moveTo(224 - bLen, 224);
    ctx.lineTo(224, 224);
    ctx.lineTo(224, 224 - bLen);
    ctx.stroke();

  } else {
    // Illegal: Glowing Red background with bold 'X' (バツ印)
    ctx.fillStyle = 'rgba(239, 68, 68, 0.4)';
    ctx.beginPath();
    ctx.roundRect(16, 16, 224, 224, 28);
    ctx.fill();

    ctx.strokeStyle = '#f87171';
    ctx.lineWidth = 6;
    ctx.stroke();

    // Prominent Red Cross 'X' (バツ印)
    ctx.strokeStyle = '#fee2e2';
    ctx.lineWidth = 18;
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.moveTo(70, 70);
    ctx.lineTo(186, 186);
    ctx.moveTo(186, 70);
    ctx.lineTo(70, 186);
    ctx.stroke();
  }

  // Red Circle at the feet of capturable enemy pieces (選択した駒で取れる駒は今までの表示＋足元に赤丸)
  if (withCaptureRing) {
    // Outer soft crimson glow ring around piece base radius
    ctx.save();
    ctx.beginPath();
    ctx.arc(128, 128, 98, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.55)';
    ctx.lineWidth = 22;
    ctx.stroke();

    // Crisp bright red circle right around piece feet
    ctx.beginPath();
    ctx.arc(128, 128, 98, 0, Math.PI * 2);
    ctx.strokeStyle = '#ff2424';
    ctx.lineWidth = 12;
    ctx.stroke();

    // Inner bright highlight rim
    ctx.beginPath();
    ctx.arc(128, 128, 92, 0, Math.PI * 2);
    ctx.strokeStyle = '#fecaca';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export class MaterialLibrary {
  public whitePieceMat: THREE.MeshStandardMaterial;
  public blackPieceMat: THREE.MeshStandardMaterial;
  public goldAccentMat: THREE.MeshStandardMaterial;
  public steelBladeMat: THREE.MeshStandardMaterial;
  public darkSteelMat: THREE.MeshStandardMaterial;
  public gemBlueMat: THREE.MeshStandardMaterial;
  public gemRedMat: THREE.MeshStandardMaterial;
  public woodLightMat: THREE.MeshStandardMaterial;
  public woodDarkMat: THREE.MeshStandardMaterial;
  public boardFrameMat: THREE.MeshStandardMaterial;

  public ultraWhitePieceMat: THREE.MeshStandardMaterial;
  public ultraBlackPieceMat: THREE.MeshStandardMaterial;
  public damascusBladeMat: THREE.MeshStandardMaterial;
  public royalGoldMat: THREE.MeshStandardMaterial;

  // Humanoid Character Materials for Ultra-Realistic Mode
  public humanSkinWhiteSideMat: THREE.MeshStandardMaterial;
  public humanSkinBlackSideMat: THREE.MeshStandardMaterial;
  public hairBlondeMat: THREE.MeshStandardMaterial;
  public hairDarkMat: THREE.MeshStandardMaterial;
  public hairSilverMat: THREE.MeshStandardMaterial;
  public tunicWhiteMat: THREE.MeshStandardMaterial;
  public tunicBlackMat: THREE.MeshStandardMaterial;
  public capeWhiteSideMat: THREE.MeshStandardMaterial;
  public capeBlackSideMat: THREE.MeshStandardMaterial;
  public leatherMat: THREE.MeshStandardMaterial;
  public eyeScleraMat: THREE.MeshBasicMaterial;
  public eyeIrisBlueMat: THREE.MeshBasicMaterial;
  public eyeIrisAmberMat: THREE.MeshBasicMaterial;
  public lipMat: THREE.MeshStandardMaterial;

  public overlaySafeMat: THREE.MeshBasicMaterial;
  public overlaySafeCaptureMat: THREE.MeshBasicMaterial;
  public overlayAttackedMat: THREE.MeshBasicMaterial;
  public overlayAttackedCaptureMat: THREE.MeshBasicMaterial;
  public overlayIllegalMat: THREE.MeshBasicMaterial;
  public overlaySelectedMat: THREE.MeshBasicMaterial;
  public captureFootRingMat: THREE.MeshBasicMaterial;

  // Flashy Capture Combat Effects Materials
  public impactShockwaveMat: THREE.MeshBasicMaterial;
  public sparkParticleMat: THREE.MeshBasicMaterial;
  public slashArcMat: THREE.MeshBasicMaterial;

  constructor() {
    const whiteMarbleTex = createMarbleTexture(false);
    const blackMarbleTex = createMarbleTexture(true);
    const ultraWhiteTex = createUltraMarbleTexture(false);
    const ultraBlackTex = createUltraMarbleTexture(true);
    const damascusTex = createDamascusTexture();
    const woodLightTex = createWoodTexture(false);
    const woodDarkTex = createWoodTexture(true);

    // Standard White piece material (Polished Alabaster Ivory)
    this.whitePieceMat = new THREE.MeshStandardMaterial({
      color: 0xf8f9fa,
      map: whiteMarbleTex,
      roughness: 0.2,
      metalness: 0.1,
    });

    // Standard Black piece material (Deep volcanic obsidian)
    this.blackPieceMat = new THREE.MeshStandardMaterial({
      color: 0x242428,
      map: blackMarbleTex,
      roughness: 0.25,
      metalness: 0.35,
    });

    // Ultra-Realistic White Armor (Mirrored Silver-White Plate with Gold Filigree)
    this.ultraWhitePieceMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      map: ultraWhiteTex,
      roughness: 0.18,
      metalness: 0.72,
    });

    // Ultra-Realistic Black Armor (Blackened Obsidian Knight Plate with Gold Filigree)
    this.ultraBlackPieceMat = new THREE.MeshStandardMaterial({
      color: 0x1e2028,
      map: ultraBlackTex,
      roughness: 0.2,
      metalness: 0.78,
    });

    // Lifelike Human Skin Materials
    this.humanSkinWhiteSideMat = new THREE.MeshStandardMaterial({
      color: 0xf7d3ba,
      roughness: 0.55,
      metalness: 0.02,
    });

    this.humanSkinBlackSideMat = new THREE.MeshStandardMaterial({
      color: 0xe6b89c,
      roughness: 0.55,
      metalness: 0.02,
    });

    this.lipMat = new THREE.MeshStandardMaterial({
      color: 0xc97a72,
      roughness: 0.45,
      metalness: 0.02,
    });

    // Hair & Beard Materials
    this.hairBlondeMat = new THREE.MeshStandardMaterial({
      color: 0xd4a359,
      roughness: 0.65,
      metalness: 0.08,
    });

    this.hairDarkMat = new THREE.MeshStandardMaterial({
      color: 0x221c1a,
      roughness: 0.6,
      metalness: 0.1,
    });

    this.hairSilverMat = new THREE.MeshStandardMaterial({
      color: 0xdbe2ef,
      roughness: 0.5,
      metalness: 0.15,
    });

    // Royal Cloth / Velvet Tunics & Capes
    this.tunicWhiteMat = new THREE.MeshStandardMaterial({
      color: 0xeff6ff,
      roughness: 0.7,
      metalness: 0.05,
    });

    this.tunicBlackMat = new THREE.MeshStandardMaterial({
      color: 0x1e1b2e,
      roughness: 0.7,
      metalness: 0.05,
    });

    this.capeWhiteSideMat = new THREE.MeshStandardMaterial({
      color: 0x1d4ed8,
      roughness: 0.75,
      metalness: 0.05,
      side: THREE.DoubleSide,
    });

    this.capeBlackSideMat = new THREE.MeshStandardMaterial({
      color: 0x991b1b,
      roughness: 0.75,
      metalness: 0.05,
      side: THREE.DoubleSide,
    });

    this.leatherMat = new THREE.MeshStandardMaterial({
      color: 0x452719,
      roughness: 0.65,
      metalness: 0.08,
    });

    this.eyeScleraMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
    });

    this.eyeIrisBlueMat = new THREE.MeshBasicMaterial({
      color: 0x1d4ed8,
    });

    this.eyeIrisAmberMat = new THREE.MeshBasicMaterial({
      color: 0xd97706,
    });

    // Damascus folded steel for Ultra-Realistic weapons
    this.damascusBladeMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      map: damascusTex,
      roughness: 0.12,
      metalness: 0.98,
    });

    // Royal 24K Polished Gold for Ultra filigree
    this.royalGoldMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      roughness: 0.16,
      metalness: 0.96,
    });

    // Gold trim
    this.goldAccentMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.25,
      metalness: 0.9,
    });

    // Weapon forged steel
    this.steelBladeMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.15,
      metalness: 0.95,
    });

    this.darkSteelMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.3,
      metalness: 0.85,
    });

    // Gemstones for Bishop staff / King crown
    this.gemBlueMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      emissive: 0x0284c7,
      emissiveIntensity: 0.45,
      roughness: 0.1,
      metalness: 0.2,
    });

    this.gemRedMat = new THREE.MeshStandardMaterial({
      color: 0xdc2626,
      emissive: 0xdc2626,
      emissiveIntensity: 0.45,
      roughness: 0.1,
      metalness: 0.2,
    });

    // Chessboard squares
    this.woodLightMat = new THREE.MeshStandardMaterial({
      map: woodLightTex,
      roughness: 0.35,
      metalness: 0.05,
    });

    this.woodDarkMat = new THREE.MeshStandardMaterial({
      map: woodDarkTex,
      roughness: 0.35,
      metalness: 0.05,
    });

    // Board Mahogany and Brass perimeter
    this.boardFrameMat = new THREE.MeshStandardMaterial({
      color: 0x1c130d,
      roughness: 0.4,
      metalness: 0.2,
    });

    // Tile Overlays
    this.overlaySafeMat = new THREE.MeshBasicMaterial({
      map: createOverlayTexture('safe', false),
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });

    this.overlaySafeCaptureMat = new THREE.MeshBasicMaterial({
      map: createOverlayTexture('safe', true),
      transparent: true,
      opacity: 0.96,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });

    this.overlayAttackedMat = new THREE.MeshBasicMaterial({
      map: createOverlayTexture('attacked', false),
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });

    this.overlayAttackedCaptureMat = new THREE.MeshBasicMaterial({
      map: createOverlayTexture('attacked', true),
      transparent: true,
      opacity: 0.96,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });

    this.overlayIllegalMat = new THREE.MeshBasicMaterial({
      map: createOverlayTexture('illegal', false),
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });

    this.overlaySelectedMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });

    this.captureFootRingMat = new THREE.MeshBasicMaterial({
      color: 0xff2424,
      transparent: true,
      opacity: 0.95,
    });

    // Combat Shockwave ring on capture strike
    this.impactShockwaveMat = new THREE.MeshBasicMaterial({
      color: 0xffb703,
      transparent: true,
      opacity: 0.95,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    // Combat Sparks radiating from impact
    this.sparkParticleMat = new THREE.MeshBasicMaterial({
      color: 0xfff3b0,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    // Dynamic slash arc mesh
    this.slashArcMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  }
}
