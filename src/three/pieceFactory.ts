import * as THREE from 'three';
import { PieceSymbol, Color, Square } from 'chess.js';
import { MaterialLibrary } from './materials';
import { WeaponStance, GraphicStyle } from '../types/chess';

export interface Piece3DUserData {
  square: Square;
  pieceType: PieceSymbol;
  color: Color;
  originalPos: THREE.Vector3;
  targetPos: THREE.Vector3;
  weaponGroup: THREE.Group;
  bodyGroup: THREE.Group; // Upper body / full character root that breathes, leans, cowers, and leaps
  headGroup?: THREE.Group; // Human head for looking around, nodding, or shaking in terror
  leftArmGroup?: THREE.Group; // Left arm for shield/tome/balance animation
  rightArmGroup?: THREE.Group; // Right sword/lance arm for combat stances and overhead capture slash
  leftLegGroup?: THREE.Group; // Left leg for stance bracing and leaping
  rightLegGroup?: THREE.Group; // Right leg for stance bracing and leaping
  weaponStance: WeaponStance;
  isTrembling: boolean;
  baseY: number;
  seed: number; // Unique phase for desynchronized alive breathing
  graphicStyle: GraphicStyle;
}

export class PieceFactory {
  private materials: MaterialLibrary;

  constructor(materials: MaterialLibrary) {
    this.materials = materials;
  }

  /**
   * Builds the unique weapon for each chess piece type:
   * - Pawn: Spear & Buckler
   * - Knight: Jousting Lance with Pennant
   * - Bishop: Arcane Cathedral Crozier / Mystic Staff
   * - Rook: Double Battleaxe
   * - Queen: Royal Swept-Hilt Rapier
   * - King: Excalibur Greatsword
   */
  public createWeapon(pieceType: PieceSymbol, color: Color, graphicStyle: GraphicStyle = 'ultra'): THREE.Group {
    const weapon = new THREE.Group();
    weapon.name = `weapon_${pieceType}_${color}`;
    const isUltra = graphicStyle === 'ultra';

    const bladeMat = isUltra ? this.materials.damascusBladeMat : this.materials.steelBladeMat;
    const goldMat = isUltra ? this.materials.royalGoldMat : this.materials.goldAccentMat;
    const darkMat = this.materials.darkSteelMat;
    const gemMat = color === 'w' ? this.materials.gemBlueMat : this.materials.gemRedMat;

    if (pieceType === 'p') {
      // Pawn: Spear + Round Buckler shield
      const shaftGeo = new THREE.CylinderGeometry(0.015, 0.018, 1.25, 8);
      const shaft = new THREE.Mesh(shaftGeo, darkMat);
      shaft.position.y = 0.45;
      weapon.add(shaft);

      // Leaf-shaped spearhead
      const headGeo = new THREE.ConeGeometry(0.05, 0.25, 6);
      const head = new THREE.Mesh(headGeo, bladeMat);
      head.position.y = 1.15;
      weapon.add(head);

      // Gold wire collar
      const collarGeo = new THREE.CylinderGeometry(0.026, 0.026, 0.045, 8);
      const collar = new THREE.Mesh(collarGeo, goldMat);
      collar.position.y = 1.03;
      weapon.add(collar);

      if (!isUltra) {
        // In classic mode, attach buckler to weaponGroup directly
        const shieldGeo = new THREE.CylinderGeometry(0.19, 0.19, 0.035, 16);
        const shield = new THREE.Mesh(shieldGeo, goldMat);
        shield.rotation.x = Math.PI / 2;
        shield.position.set(-0.22, 0.46, 0.12);

        const bossGeo = new THREE.SphereGeometry(0.075, 12, 12);
        const boss = new THREE.Mesh(bossGeo, bladeMat);
        boss.position.set(-0.22, 0.46, 0.14);
        weapon.add(shield, boss);
        weapon.position.set(0.18, 0.1, 0.12);
      } else {
        weapon.position.set(0, -0.22, 0.06);
      }

    } else if (pieceType === 'n') {
      // Knight: Medieval Jousting Lance with Pennant
      const shaftGeo = new THREE.CylinderGeometry(0.018, 0.034, 1.5, 8);
      const shaft = new THREE.Mesh(shaftGeo, darkMat);
      shaft.position.y = 0.55;
      weapon.add(shaft);

      // Lance cone guard (vamplate)
      const vamplateGeo = new THREE.ConeGeometry(0.14, 0.18, 16);
      const vamplate = new THREE.Mesh(vamplateGeo, goldMat);
      vamplate.rotation.x = Math.PI;
      vamplate.position.y = 0.22;
      weapon.add(vamplate);

      // Lance steel tip
      const tipGeo = new THREE.ConeGeometry(0.045, 0.34, 6);
      const tip = new THREE.Mesh(tipGeo, bladeMat);
      tip.position.y = 1.42;
      weapon.add(tip);

      if (isUltra) {
        // Tournament Silk Pennant flag
        const pennantShape = new THREE.Shape();
        pennantShape.moveTo(0, 0);
        pennantShape.lineTo(0.28, -0.05);
        pennantShape.lineTo(0, -0.13);
        pennantShape.closePath();
        const pennantGeo = new THREE.ShapeGeometry(pennantShape);
        const pennant = new THREE.Mesh(pennantGeo, gemMat);
        pennant.position.set(0.02, 1.22, 0);
        weapon.add(pennant);
        weapon.position.set(0, -0.22, 0.08);
      } else {
        weapon.position.set(0.24, 0.15, 0.15);
      }

    } else if (pieceType === 'b') {
      // Bishop: Arcane Cathedral Crozier / Mystic Staff
      const staffGeo = new THREE.CylinderGeometry(0.02, 0.02, 1.4, 8);
      const staff = new THREE.Mesh(staffGeo, goldMat);
      staff.position.y = 0.5;
      weapon.add(staff);

      // Ornate finial crown ring
      const finialRingGeo = new THREE.TorusGeometry(0.1, 0.02, 8, 20);
      const finialRing = new THREE.Mesh(finialRingGeo, goldMat);
      finialRing.position.y = 1.26;
      weapon.add(finialRing);

      // Glowing magical gemstone floating in the center
      const crystalGeo = new THREE.OctahedronGeometry(0.08, 0);
      const crystal = new THREE.Mesh(crystalGeo, gemMat);
      crystal.position.y = 1.26;
      weapon.add(crystal);

      if (isUltra) {
        const crook = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.015, 6, 12, Math.PI * 1.5), goldMat);
        crook.position.set(0.06, 1.36, 0);
        weapon.add(crook);
        weapon.position.set(0, -0.22, 0.06);
      } else {
        weapon.position.set(0.22, 0.15, 0.12);
      }

    } else if (pieceType === 'r') {
      // Rook: Heavy Double Battleaxe
      const handleGeo = new THREE.CylinderGeometry(0.024, 0.024, 1.3, 8);
      const handle = new THREE.Mesh(handleGeo, darkMat);
      handle.position.y = 0.48;
      weapon.add(handle);

      const bladeShape = new THREE.Shape();
      bladeShape.moveTo(0, 0);
      bladeShape.quadraticCurveTo(0.26, 0.17, 0.3, 0);
      bladeShape.quadraticCurveTo(0.26, -0.17, 0, 0);

      const extrudeSettings = { depth: 0.02, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: 0.01, bevelThickness: 0.01 };
      const leftBladeGeo = new THREE.ExtrudeGeometry(bladeShape, extrudeSettings);
      const leftBlade = new THREE.Mesh(leftBladeGeo, bladeMat);
      leftBlade.position.set(0, 0.96, -0.01);
      weapon.add(leftBlade);

      const rightBlade = new THREE.Mesh(leftBladeGeo, bladeMat);
      rightBlade.rotation.y = Math.PI;
      rightBlade.position.set(0, 0.96, 0.01);
      weapon.add(rightBlade);

      const centerNut = new THREE.Mesh(new THREE.SphereGeometry(0.065, 10, 10), goldMat);
      centerNut.position.y = 0.96;
      weapon.add(centerNut);

      if (isUltra) {
        const topSpike = new THREE.Mesh(new THREE.ConeGeometry(0.032, 0.15, 6), bladeMat);
        topSpike.position.y = 1.2;
        weapon.add(topSpike);
        weapon.position.set(0, -0.22, 0.06);
      } else {
        weapon.position.set(0.24, 0.1, 0.15);
      }

    } else if (pieceType === 'q') {
      // Queen: Royal Rapier with delicate basket swept-hilt
      const bladeGeo = new THREE.CylinderGeometry(0.009, 0.02, 1.25, 6);
      const blade = new THREE.Mesh(bladeGeo, bladeMat);
      blade.position.y = 0.72;
      weapon.add(blade);

      const tipGeo = new THREE.ConeGeometry(0.018, 0.15, 6);
      const tip = new THREE.Mesh(tipGeo, bladeMat);
      tip.position.y = 1.4;
      weapon.add(tip);

      // Basket swept hilt
      const basketGeo = new THREE.SphereGeometry(0.095, 10, 10, 0, Math.PI);
      const basket = new THREE.Mesh(basketGeo, goldMat);
      basket.rotation.x = Math.PI / 2;
      basket.position.y = 0.12;
      weapon.add(basket);

      // Grip and pommel
      const gripGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.16, 8);
      const grip = new THREE.Mesh(gripGeo, darkMat);
      grip.position.y = 0.02;
      weapon.add(grip);

      const pommelGeo = new THREE.SphereGeometry(0.04, 8, 8);
      const pommel = new THREE.Mesh(pommelGeo, gemMat);
      pommel.position.y = -0.07;
      weapon.add(pommel);

      if (isUltra) {
        const loopGeo = new THREE.TorusGeometry(0.06, 0.01, 6, 12);
        const loop = new THREE.Mesh(loopGeo, goldMat);
        loop.position.set(0.035, 0.14, 0);
        loop.rotation.y = Math.PI / 4;
        weapon.add(loop);
        weapon.position.set(0, -0.2, 0.06);
      } else {
        weapon.position.set(0.22, 0.2, 0.14);
      }

    } else if (pieceType === 'k') {
      // King: Majestic Excalibur Greatsword
      const bladeShape = new THREE.Shape();
      bladeShape.moveTo(-0.058, 0);
      bladeShape.lineTo(-0.048, 1.15);
      bladeShape.lineTo(0, 1.35);
      bladeShape.lineTo(0.048, 1.15);
      bladeShape.lineTo(0.058, 0);
      bladeShape.closePath();

      const extrudeSettings = { depth: 0.024, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: 0.01, bevelThickness: 0.01 };
      const swordGeo = new THREE.ExtrudeGeometry(bladeShape, extrudeSettings);
      const blade = new THREE.Mesh(swordGeo, bladeMat);
      blade.position.set(0, 0.14, -0.012);
      weapon.add(blade);

      // Crossguard
      const guardGeo = new THREE.BoxGeometry(0.38, 0.055, 0.065);
      const guard = new THREE.Mesh(guardGeo, goldMat);
      guard.position.y = 0.14;
      weapon.add(guard);

      // Two-handed hilt
      const hiltGeo = new THREE.CylinderGeometry(0.024, 0.024, 0.24, 8);
      const hilt = new THREE.Mesh(hiltGeo, darkMat);
      hilt.position.y = 0.0;
      weapon.add(hilt);

      // Crown pommel with glowing gem
      const pommelGeo = new THREE.SphereGeometry(0.052, 12, 12);
      const pommel = new THREE.Mesh(pommelGeo, gemMat);
      pommel.position.y = -0.13;
      weapon.add(pommel);

      if (isUltra) {
        const fullerGeo = new THREE.BoxGeometry(0.018, 0.88, 0.028);
        const fuller = new THREE.Mesh(fullerGeo, goldMat);
        fuller.position.set(0, 0.62, 0);
        weapon.add(fuller);
        weapon.position.set(0, -0.2, 0.07);
      } else {
        weapon.position.set(0.25, 0.2, 0.16);
      }
    }

    return weapon;
  }

  /**
   * Builds a lifelike 3D Humanoid Character for 'ultra' mode:
   * Complete with articulated legs, boots, torso armor/robes, cape,
   * sculpted human face (skin, eyes, eyebrows, nose, mouth, hair/beard),
   * class-specific crown/helmet, and articulated left & right arms.
   */
  private buildHumanoidCharacter(
    pieceType: PieceSymbol,
    color: Color,
    group: THREE.Group,
    bodyGroup: THREE.Group
  ): {
    headGroup: THREE.Group;
    leftArmGroup: THREE.Group;
    rightArmGroup: THREE.Group;
    leftLegGroup: THREE.Group;
    rightLegGroup: THREE.Group;
    weaponGroup: THREE.Group;
  } {
    const isWhite = color === 'w';
    const armorMat = isWhite ? this.materials.ultraWhitePieceMat : this.materials.ultraBlackPieceMat;
    const goldMat = this.materials.royalGoldMat;
    const darkSteelMat = this.materials.darkSteelMat;
    const skinMat = isWhite ? this.materials.humanSkinWhiteSideMat : this.materials.humanSkinBlackSideMat;
    const tunicMat = isWhite ? this.materials.tunicWhiteMat : this.materials.tunicBlackMat;
    const capeMat = isWhite ? this.materials.capeWhiteSideMat : this.materials.capeBlackSideMat;
    const leatherMat = this.materials.leatherMat;
    const gemMat = isWhite ? this.materials.gemBlueMat : this.materials.gemRedMat;
    const eyeIrisMat = isWhite ? this.materials.eyeIrisBlueMat : this.materials.eyeIrisAmberMat;

    // Hair color per piece character
    const hairMat =
      pieceType === 'k' || pieceType === 'b'
        ? this.materials.hairSilverMat
        : isWhite
        ? this.materials.hairBlondeMat
        : this.materials.hairDarkMat;

    // Scale factor per class so King/Queen/Rook are taller than Pawn
    const heightScale =
      pieceType === 'k'
        ? 1.14
        : pieceType === 'q'
        ? 1.08
        : pieceType === 'r'
        ? 1.1
        : pieceType === 'b' || pieceType === 'n'
        ? 1.04
        : 0.94;
    const widthScale = pieceType === 'r' ? 1.18 : pieceType === 'q' ? 0.92 : 1.0;

    // 1. Subtle Hero Pedestal Plinth (thin so the human character stands prominently)
    const plinthGeo = new THREE.CylinderGeometry(0.36, 0.4, 0.08, 24);
    const plinth = new THREE.Mesh(plinthGeo, armorMat);
    plinth.position.y = 0.04;
    plinth.castShadow = true;
    plinth.receiveShadow = true;
    group.add(plinth);

    const plinthRing = new THREE.Mesh(new THREE.TorusGeometry(0.37, 0.018, 8, 24), goldMat);
    plinthRing.rotation.x = Math.PI / 2;
    plinthRing.position.y = 0.08;
    group.add(plinthRing);

    // Apply class proportions to bodyGroup
    bodyGroup.scale.set(widthScale, heightScale, widthScale);

    // For Knight ('n'), the human warrior rides on the back of an Armored Warhorse (軍馬)!
    // For other pieces, riderRoot is directly at bodyGroup origin.
    const riderRoot = new THREE.Group();
    bodyGroup.add(riderRoot);

    const leftLegGroup = new THREE.Group();
    const rightLegGroup = new THREE.Group();

    if (pieceType === 'n') {
      // =======================================================================
      // MOUNTED CAVALRY KNIGHT: 3D ARMORED WARHORSE (軍馬) + STRADDLING RIDER
      // =======================================================================
      const horseCoatMat = isWhite ? this.materials.ultraWhitePieceMat : this.materials.ultraBlackPieceMat;
      const horseManeMat = isWhite ? this.materials.hairSilverMat : this.materials.hairDarkMat;
      const hoofMat = isWhite ? goldMat : darkSteelMat;

      const horseGroup = new THREE.Group();
      horseGroup.name = `warhorse_${color}`;
      bodyGroup.add(horseGroup);

      // A. Horse Barrel / Torso (oriented along Z axis facing +Z)
      const barrel = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.25, 10, 16), horseCoatMat);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(0, 0.39, -0.01);
      barrel.castShadow = true;
      barrel.receiveShadow = true;
      horseGroup.add(barrel);

      // Muscular Chest & Hindquarters (Croup)
      const horseChest = new THREE.Mesh(new THREE.SphereGeometry(0.138, 14, 14), horseCoatMat);
      horseChest.scale.set(1.0, 1.05, 1.1);
      horseChest.position.set(0, 0.41, 0.14);
      horseChest.castShadow = true;
      horseGroup.add(horseChest);

      const horseCroup = new THREE.Mesh(new THREE.SphereGeometry(0.134, 14, 14), horseCoatMat);
      horseCroup.scale.set(1.0, 1.04, 1.08);
      horseCroup.position.set(0, 0.40, -0.15);
      horseCroup.castShadow = true;
      horseGroup.add(horseCroup);

      // Royal Barding Armor: Chest Peytral & Medallion
      const peytral = new THREE.Mesh(
        new THREE.CylinderGeometry(0.146, 0.152, 0.11, 16, 1, false, -Math.PI * 0.48, Math.PI * 0.96),
        goldMat
      );
      peytral.rotation.y = Math.PI / 2;
      peytral.position.set(0, 0.41, 0.15);
      horseGroup.add(peytral);

      const chestGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.036, 0), gemMat);
      chestGem.position.set(0, 0.41, 0.295);
      horseGroup.add(chestGem);

      // Caparison / Royal Saddle Blanket & Armored Crupper
      const saddleCloth = new THREE.Mesh(
        new THREE.CylinderGeometry(0.142, 0.165, 0.26, 16, 1, false, 0.25, Math.PI * 2 - 0.5),
        capeMat
      );
      saddleCloth.rotation.z = Math.PI / 2;
      saddleCloth.rotation.x = Math.PI / 2;
      saddleCloth.position.set(0, 0.38, -0.02);
      horseGroup.add(saddleCloth);

      // War Saddle (Pommel + Seat + High Cantle)
      const saddleSeat = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.055, 0.22), leatherMat);
      saddleSeat.position.set(0, 0.51, -0.03);
      horseGroup.add(saddleSeat);

      const saddleCantle = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.12, 0.07, 12, 1, false, 0, Math.PI), goldMat);
      saddleCantle.rotation.y = Math.PI / 2;
      saddleCantle.position.set(0, 0.55, -0.11);
      horseGroup.add(saddleCantle);

      const saddlePommel = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 10), goldMat);
      saddlePommel.position.set(0, 0.55, 0.06);
      horseGroup.add(saddlePommel);

      // B. 4 Articulated Warhorse Legs (Front legs bound to leftLegGroup & rightLegGroup for galloping/pawing)
      leftLegGroup.position.set(-0.095, 0.36, 0.155);
      rightLegGroup.position.set(0.095, 0.36, 0.155);
      horseGroup.add(leftLegGroup, rightLegGroup);

      const buildHorseLeg = (targetLegGroup: THREE.Group, isFront: boolean) => {
        // Upper muscular gaskin / forearm
        const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.042, 0.11, 6, 10), horseCoatMat);
        upper.position.set(0, -0.07, isFront ? 0 : -0.01);
        upper.rotation.x = isFront ? 0.05 : -0.12;
        upper.castShadow = true;
        targetLegGroup.add(upper);

        // Knee / Hock joint
        const joint = new THREE.Mesh(new THREE.SphereGeometry(0.038, 8, 8), horseCoatMat);
        joint.position.set(0, -0.15, isFront ? 0.01 : -0.02);
        targetLegGroup.add(joint);

        // Lower cannon bone
        const cannon = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.026, 0.12, 10), horseCoatMat);
        cannon.position.set(0, -0.21, isFront ? 0.005 : -0.005);
        cannon.castShadow = true;
        targetLegGroup.add(cannon);

        // Armored golden greave cuff & Hoof
        const fetlock = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.008, 6, 12), goldMat);
        fetlock.rotation.x = Math.PI / 2;
        fetlock.position.set(0, -0.25, 0.005);
        targetLegGroup.add(fetlock);

        const hoof = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.042, 0.045, 12), hoofMat);
        hoof.position.set(0, -0.27, 0.012);
        hoof.castShadow = true;
        targetLegGroup.add(hoof);
      };

      // Front Left & Front Right legs
      buildHorseLeg(leftLegGroup, true);
      buildHorseLeg(rightLegGroup, true);

      // Hind Left & Hind Right legs planted firmly on plinth
      for (const side of [-1, 1]) {
        const hindLeg = new THREE.Group();
        hindLeg.position.set(side * 0.098, 0.36, -0.165);
        buildHorseLeg(hindLeg, false);
        horseGroup.add(hindLeg);
      }

      // C. Muscular Arched Horse Neck, Head, Chanfron (馬面鎧), Mane, Ears & Reins
      const horseNeckGroup = new THREE.Group();
      horseNeckGroup.position.set(0, 0.45, 0.17);
      horseNeckGroup.rotation.x = 0.34; // angled heroically forward and up
      horseGroup.add(horseNeckGroup);

      const neckMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.108, 0.26, 14), horseCoatMat);
      neckMesh.position.set(0, 0.11, 0);
      neckMesh.castShadow = true;
      horseNeckGroup.add(neckMesh);

      // Flowing Horse Mane locks along back of neck
      for (let m = 0; m < 5; m++) {
        const maneLock = new THREE.Mesh(new THREE.ConeGeometry(0.032, 0.09, 6), horseManeMat);
        maneLock.position.set(0, 0.03 + m * 0.048, -0.085);
        maneLock.rotation.x = -Math.PI * 0.62;
        horseNeckGroup.add(maneLock);
      }

      // Sculpted Horse Head at top of neck
      const horseHead = new THREE.Group();
      horseHead.position.set(0, 0.24, 0.02);
      horseHead.rotation.x = -0.34; // restore level world orientation
      horseNeckGroup.add(horseHead);

      const horseSkull = new THREE.Mesh(new THREE.SphereGeometry(0.078, 14, 14), horseCoatMat);
      horseSkull.scale.set(0.88, 1.0, 1.15);
      horseSkull.castShadow = true;
      horseHead.add(horseSkull);

      // Tapered Horse Muzzle & Nostrils pointing forward (+Z)
      const horseMuzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.068, 0.17, 12), horseCoatMat);
      horseMuzzle.rotation.x = Math.PI * 0.38;
      horseMuzzle.position.set(0, -0.035, 0.095);
      horseMuzzle.castShadow = true;
      horseHead.add(horseMuzzle);

      // Armored Golden Chanfron (馬面鎧 - Warhorse Faceplate + Spike)
      const chanfron = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.022, 0.18), goldMat);
      chanfron.rotation.x = Math.PI * 0.38 - Math.PI * 0.5;
      chanfron.position.set(0, 0.008, 0.095);
      horseHead.add(chanfron);

      const chanfronSpike = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.075, 6), goldMat);
      chanfronSpike.rotation.x = Math.PI * 0.35;
      chanfronSpike.position.set(0, 0.045, 0.085);
      horseHead.add(chanfronSpike);

      // Horse Eyes & Alert Pointed Ears
      for (const side of [-1, 1]) {
        const hEye = new THREE.Mesh(new THREE.SphereGeometry(0.015, 8, 8), eyeIrisMat);
        hEye.position.set(side * 0.064, 0.015, 0.03);
        horseHead.add(hEye);

        const hEar = new THREE.Mesh(new THREE.ConeGeometry(0.024, 0.085, 8), horseCoatMat);
        hEar.position.set(side * 0.048, 0.095, -0.02);
        hEar.rotation.z = side * -0.22;
        hEar.rotation.x = 0.18;
        horseHead.add(hEar);

        // Golden Bridle Bit & Leather Reins (手綱) leading back to rider
        const bitRing = new THREE.Mesh(new THREE.TorusGeometry(0.018, 0.005, 6, 12), goldMat);
        bitRing.rotation.y = Math.PI / 2;
        bitRing.position.set(side * 0.048, -0.06, 0.145);
        horseHead.add(bitRing);

        const rein = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.32, 6), leatherMat);
        rein.rotation.x = Math.PI * 0.46;
        rein.rotation.z = side * -0.12;
        rein.position.set(side * 0.075, -0.04, -0.01);
        horseHead.add(rein);
      }

      // Flowing Horse Tail at the rear (-Z)
      const tailGroup = new THREE.Group();
      tailGroup.position.set(0, 0.42, -0.25);
      tailGroup.rotation.x = -0.35;
      const tailMesh = new THREE.Mesh(new THREE.ConeGeometry(0.052, 0.28, 10), horseManeMat);
      tailMesh.rotation.x = Math.PI;
      tailMesh.position.set(0, -0.12, -0.02);
      tailGroup.add(tailMesh);
      horseGroup.add(tailGroup);

      // D. Position the Human Paladin Rider in the Saddle & Build Straddling Rider Legs in Stirrups!
      riderRoot.position.set(0, 0.16, -0.04);
      riderRoot.scale.set(0.84, 0.84, 0.84);

      for (const side of [-1, 1]) {
        const riderLeg = new THREE.Group();
        riderLeg.position.set(side * 0.12, 0.48, 0.0);
        riderRoot.add(riderLeg);

        // Thigh angled outward & forward hugging the horse barrel
        const rThigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.056, 0.13, 6, 10), tunicMat);
        rThigh.rotation.z = side * 0.48;
        rThigh.rotation.x = -0.58;
        rThigh.position.set(side * 0.045, -0.04, 0.055);
        rThigh.castShadow = true;
        riderLeg.add(rThigh);

        // Knee Poleyn armor
        const rKnee = new THREE.Mesh(new THREE.SphereGeometry(0.052, 10, 10), goldMat);
        rKnee.position.set(side * 0.075, -0.09, 0.115);
        riderLeg.add(rKnee);

        // Lower Shin Greave hanging along flank
        const rShin = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.04, 0.16, 10), armorMat);
        rShin.rotation.x = 0.22;
        rShin.position.set(side * 0.078, -0.18, 0.09);
        rShin.castShadow = true;
        riderLeg.add(rShin);

        // Armored Boot in Golden Stirrup (鐙)
        const rBoot = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.06, 0.14), leatherMat);
        rBoot.position.set(side * 0.08, -0.26, 0.105);
        riderLeg.add(rBoot);

        const stirrup = new THREE.Mesh(new THREE.TorusGeometry(0.048, 0.009, 6, 12), goldMat);
        stirrup.position.set(side * 0.08, -0.25, 0.115);
        riderLeg.add(stirrup);
      }
    } else {
      // 2. Articulated Standing Human Legs (Left & Right) for non-mounted pieces
      leftLegGroup.position.set(-0.095, 0.46, 0);
      rightLegGroup.position.set(0.095, 0.46, 0);
      riderRoot.add(leftLegGroup, rightLegGroup);

      const buildLeg = (legGroup: THREE.Group, isLeft: boolean) => {
        // Upper thigh (tunic/cuisse)
        const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.058, 0.14, 6, 12), tunicMat);
        thigh.position.y = -0.09;
        thigh.castShadow = true;
        legGroup.add(thigh);

        // Knee poleyn armor plate
        const knee = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 10), goldMat);
        knee.position.set(0, -0.18, 0.03);
        legGroup.add(knee);

        // Shin greave armor
        const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.044, 0.18, 12), armorMat);
        shin.position.y = -0.27;
        shin.castShadow = true;
        legGroup.add(shin);

        // Armored boot / sabaton
        const boot = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.07, 0.16), leatherMat);
        boot.position.set(isLeft ? -0.005 : 0.005, -0.35, 0.03);
        boot.castShadow = true;
        legGroup.add(boot);

        // Gold boot trim
        const bootTrim = new THREE.Mesh(new THREE.BoxGeometry(0.098, 0.02, 0.12), goldMat);
        bootTrim.position.set(isLeft ? -0.005 : 0.005, -0.31, 0.02);
        legGroup.add(bootTrim);
      };

      buildLeg(leftLegGroup, true);
      buildLeg(rightLegGroup, false);
    }

    // 3. Pelvis, Belt & Tassets / Royal Gown Skirt
    const pelvis = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.13, 0.12, 16), tunicMat);
    pelvis.position.y = 0.48;
    riderRoot.add(pelvis);

    // Leather & Gold Hero Belt
    const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.152, 0.152, 0.05, 18), leatherMat);
    belt.position.y = 0.52;
    riderRoot.add(belt);

    const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.06, 0.03), goldMat);
    buckle.position.set(0, 0.52, 0.145);
    riderRoot.add(buckle);

    if (pieceType === 'q' || pieceType === 'b' || pieceType === 'k') {
      // Flowing royal lower robe / battle skirt with front split
      const skirtGeo = new THREE.CylinderGeometry(0.145, 0.24, 0.36, 20, 1, false, 0.35, Math.PI * 2 - 0.7);
      const skirt = new THREE.Mesh(skirtGeo, pieceType === 'q' ? capeMat : tunicMat);
      skirt.position.y = 0.32;
      skirt.rotation.y = Math.PI / 2;
      skirt.castShadow = true;
      riderRoot.add(skirt);

      // Gold embroidered hem
      const hemRing = new THREE.Mesh(new THREE.TorusGeometry(0.235, 0.012, 6, 20), goldMat);
      hemRing.rotation.x = Math.PI / 2;
      hemRing.position.y = 0.15;
      riderRoot.add(hemRing);
    } else {
      // Armored hip tassets (left & right faulds)
      for (const side of [-1, 1]) {
        const tasset = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.14, 0.14), armorMat);
        tasset.position.set(side * 0.13, 0.43, 0.01);
        tasset.rotation.z = side * -0.18;
        riderRoot.add(tasset);
      }
    }

    // 4. Human Torso / Chest Cuirass & Cape
    const torsoWidthTop = pieceType === 'q' ? 0.155 : pieceType === 'r' ? 0.21 : 0.18;
    const torsoWidthBot = pieceType === 'q' ? 0.115 : 0.14;
    const torso = new THREE.Mesh(
      new THREE.CylinderGeometry(torsoWidthTop, torsoWidthBot, 0.3, 18),
      armorMat
    );
    torso.position.y = 0.67;
    torso.castShadow = true;
    riderRoot.add(torso);

    // Sculpted pectoral / chest emblem
    if (pieceType === 'q') {
      // Valkyrie royal corset & chest jewel
      const bodice = new THREE.Mesh(new THREE.SphereGeometry(0.135, 14, 12), armorMat);
      bodice.scale.set(1.05, 0.75, 0.85);
      bodice.position.set(0, 0.7, 0.055);
      riderRoot.add(bodice);

      const brooch = new THREE.Mesh(new THREE.OctahedronGeometry(0.038, 0), gemMat);
      brooch.position.set(0, 0.76, 0.16);
      riderRoot.add(brooch);
    } else {
      // Heroic Cuirass Breastplate & Gold Crest
      const chestPlate = new THREE.Mesh(
        new THREE.CylinderGeometry(torsoWidthTop + 0.01, torsoWidthBot + 0.01, 0.24, 16, 1, false, -Math.PI * 0.45, Math.PI * 0.9),
        armorMat
      );
      chestPlate.rotation.y = Math.PI / 2;
      chestPlate.position.y = 0.68;
      riderRoot.add(chestPlate);

      const chestCrest = new THREE.Mesh(new THREE.OctahedronGeometry(0.042, 0), goldMat);
      chestCrest.scale.set(1.2, 1.6, 0.5);
      chestCrest.position.set(0, 0.7, torsoWidthTop + 0.005);
      riderRoot.add(chestCrest);
    }

    // Heroic Cape / Mantle draping down the back
    if (pieceType !== 'p') {
      const capeHeight = pieceType === 'k' || pieceType === 'q' ? 0.64 : pieceType === 'n' ? 0.44 : 0.52;
      const capeGeo = new THREE.PlaneGeometry(0.34, capeHeight, 6, 8);
      // Slight billow curve
      const posAttr = capeGeo.attributes.position;
      for (let i = 0; i < posAttr.count; i++) {
        const y = posAttr.getY(i);
        const x = posAttr.getX(i);
        const normY = (capeHeight / 2 - y) / capeHeight; // 0 at top, 1 at bottom
        posAttr.setZ(i, -Math.sin(normY * Math.PI * 0.65) * 0.09 - Math.abs(x) * 0.08);
      }
      capeGeo.computeVertexNormals();
      const cape = new THREE.Mesh(capeGeo, capeMat);
      cape.position.set(0, 0.8 - capeHeight / 2, -0.14);
      if (pieceType === 'n') {
        // Angle cape slightly back over the horse's croup
        cape.rotation.x = 0.24;
      }
      cape.castShadow = true;
      riderRoot.add(cape);
    }

    // Neck & Collar Gorget
    const gorget = new THREE.Mesh(new THREE.TorusGeometry(0.095, 0.022, 8, 18), goldMat);
    gorget.rotation.x = Math.PI / 2;
    gorget.position.y = 0.82;
    riderRoot.add(gorget);

    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.065, 0.09, 14), skinMat);
    neck.position.y = 0.86;
    riderRoot.add(neck);

    // 5. Sculpted Human Head Group (Face, Eyes, Nose, Lips, Hair, Beard & Class Headgear)
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.96, 0);
    riderRoot.add(headGroup);

    // Human skull & jaw cranium
    const cranium = new THREE.Mesh(new THREE.SphereGeometry(0.115, 20, 20), skinMat);
    cranium.scale.set(0.92, 1.08, 0.98);
    cranium.castShadow = true;
    headGroup.add(cranium);

    // Sculpted jaw/chin
    const chin = new THREE.Mesh(new THREE.SphereGeometry(0.078, 14, 14), skinMat);
    chin.scale.set(0.95, 0.9, 0.95);
    chin.position.set(0, -0.045, 0.025);
    headGroup.add(chin);

    // Human Nose
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.048, 8), skinMat);
    nose.rotation.x = Math.PI * 0.38;
    nose.position.set(0, -0.005, 0.115);
    headGroup.add(nose);

    // Human Ears
    for (const side of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.024, 8, 8), skinMat);
      ear.scale.set(0.45, 1.1, 0.7);
      ear.position.set(side * 0.105, -0.005, 0);
      headGroup.add(ear);
    }

    // Expressive Human Eyes (Sclera + Colored Iris + Eyebrows)
    for (const side of [-1, 1]) {
      const sclera = new THREE.Mesh(new THREE.SphereGeometry(0.018, 10, 10), this.materials.eyeScleraMat);
      sclera.scale.set(1.2, 0.85, 0.6);
      sclera.position.set(side * 0.042, 0.018, 0.098);
      headGroup.add(sclera);

      const iris = new THREE.Mesh(new THREE.SphereGeometry(0.01, 8, 8), eyeIrisMat);
      iris.scale.set(1.0, 1.0, 0.5);
      iris.position.set(side * 0.042, 0.018, 0.106);
      headGroup.add(iris);

      // Eyebrow
      const brow = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.009, 0.012), hairMat);
      brow.position.set(side * 0.043, 0.038, 0.102);
      brow.rotation.z = side * (pieceType === 'r' || pieceType === 'n' ? 0.16 : 0.05);
      headGroup.add(brow);
    }

    // Mouth / Lips
    const lips = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.01, 0.014), this.materials.lipMat);
    lips.position.set(0, -0.046, 0.102);
    headGroup.add(lips);

    // Back & Side Hair
    const hairBack = new THREE.Mesh(
      new THREE.SphereGeometry(0.122, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.65),
      hairMat
    );
    hairBack.rotation.x = -Math.PI * 0.35;
    hairBack.position.set(0, 0.01, -0.01);
    headGroup.add(hairBack);

    // Class-specific Headgear, Hair & Facial Hair
    if (pieceType === 'p') {
      // Pawn: Human Foot-Soldier with Open-Face Kettle/Sallet Infantry Helmet
      const helmDome = new THREE.Mesh(
        new THREE.SphereGeometry(0.128, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.52),
        armorMat
      );
      helmDome.position.y = 0.02;
      headGroup.add(helmDome);

      const helmBrim = new THREE.Mesh(new THREE.CylinderGeometry(0.135, 0.165, 0.03, 20), armorMat);
      helmBrim.position.set(0, 0.035, -0.01);
      helmBrim.rotation.x = -0.12;
      headGroup.add(helmBrim);

      const goldBand = new THREE.Mesh(new THREE.TorusGeometry(0.126, 0.01, 6, 20), goldMat);
      goldBand.rotation.x = Math.PI / 2 - 0.12;
      goldBand.position.y = 0.04;
      headGroup.add(goldBand);

    } else if (pieceType === 'n') {
      // Knight: Paladin Dragoon with Open-Visor Winged Helm & Flowing Plume
      const helmBase = new THREE.Mesh(
        new THREE.SphereGeometry(0.13, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.58),
        armorMat
      );
      helmBase.position.y = 0.02;
      headGroup.add(helmBase);

      // Cheek guards framing the human face
      for (const side of [-1, 1]) {
        const cheek = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.1, 0.08), armorMat);
        cheek.position.set(side * 0.105, -0.02, 0.03);
        cheek.rotation.z = side * 0.15;
        headGroup.add(cheek);

        // Valkyrie / Paladin Helmet Wings
        const wing = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.18, 5), goldMat);
        wing.position.set(side * 0.135, 0.08, -0.01);
        wing.rotation.z = side * -0.45;
        wing.rotation.x = -0.25;
        headGroup.add(wing);
      }

      // Raised Golden Visor on forehead
      const visor = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.018, 6, 16, Math.PI), goldMat);
      visor.position.set(0, 0.065, 0.02);
      visor.rotation.x = -Math.PI * 0.3;
      headGroup.add(visor);

      // Sweeping Horsehair Plume Crest
      const plume = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.24, 10), capeMat);
      plume.position.set(0, 0.19, -0.04);
      plume.rotation.x = -Math.PI * 0.35;
      headGroup.add(plume);

    } else if (pieceType === 'b') {
      // Bishop: High Prelate Cleric with Wise Beard, Mitre Hat & Sacred Halo
      const beard = new THREE.Mesh(new THREE.ConeGeometry(0.068, 0.14, 12), hairMat);
      beard.rotation.x = Math.PI;
      beard.position.set(0, -0.095, 0.055);
      headGroup.add(beard);

      // Tall Ecclesiastical Mitre Hat
      const mitreBase = new THREE.Mesh(new THREE.CylinderGeometry(0.125, 0.115, 0.06, 18), goldMat);
      mitreBase.position.y = 0.075;
      headGroup.add(mitreBase);

      const mitrePeak = new THREE.Mesh(new THREE.ConeGeometry(0.125, 0.22, 16), armorMat);
      mitrePeak.scale.set(1, 1, 0.78);
      mitrePeak.position.y = 0.21;
      headGroup.add(mitrePeak);

      // Gold Cross on Mitre front
      const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.14, 0.015), goldMat);
      crossV.position.set(0, 0.19, 0.085);
      const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.02, 0.015), goldMat);
      crossH.position.set(0, 0.21, 0.085);
      headGroup.add(crossV, crossH);

      // Floating Golden Halo Ring behind head
      const halo = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.01, 8, 24), goldMat);
      halo.position.set(0, 0.06, -0.09);
      headGroup.add(halo);

    } else if (pieceType === 'r') {
      // Rook: Fortress Juggernaut Warrior with Braided Beard & Crenellated War-Helm
      const beard = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.12, 0.08), hairMat);
      beard.position.set(0, -0.08, 0.055);
      headGroup.add(beard);

      // Crenellated Crown War-Helm (open face)
      const helmRing = new THREE.Mesh(new THREE.CylinderGeometry(0.132, 0.124, 0.09, 16), armorMat);
      helmRing.position.y = 0.075;
      headGroup.add(helmRing);

      // Nose guard bar
      const nasal = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.08, 0.02), goldMat);
      nasal.position.set(0, 0.03, 0.122);
      headGroup.add(nasal);

      // 6 Fortress Battlements around crown
      for (let i = 0; i < 6; i++) {
        const ang = (i * Math.PI) / 3;
        const merlon = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.065, 0.045), goldMat);
        merlon.position.set(Math.cos(ang) * 0.115, 0.14, Math.sin(ang) * 0.115);
        headGroup.add(merlon);
      }

    } else if (pieceType === 'q') {
      // Queen: Valkyrie Empress with Long Flowing Hair & Jeweled Diadem Crown
      // Long cascading hair down back & shoulders
      const longHair = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.34, 14), hairMat);
      longHair.rotation.x = Math.PI;
      longHair.position.set(0, -0.1, -0.055);
      headGroup.add(longHair);

      for (const side of [-1, 1]) {
        const hairLock = new THREE.Mesh(new THREE.CapsuleGeometry(0.026, 0.16, 6, 8), hairMat);
        hairLock.position.set(side * 0.095, -0.06, 0.03);
        headGroup.add(hairLock);
      }

      // Royal Golden Diadem Circlet
      const circlet = new THREE.Mesh(new THREE.CylinderGeometry(0.122, 0.115, 0.055, 20), goldMat);
      circlet.position.y = 0.075;
      headGroup.add(circlet);

      // 8 Crown Spikes + Jewels
      for (let i = 0; i < 8; i++) {
        const ang = (i * Math.PI) / 4;
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.08, 6), goldMat);
        spike.position.set(Math.cos(ang) * 0.115, 0.135, Math.sin(ang) * 0.115);
        headGroup.add(spike);

        if (i % 2 === 0) {
          const gem = new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 8), gemMat);
          gem.position.set(Math.cos(ang) * 0.115, 0.18, Math.sin(ang) * 0.115);
          headGroup.add(gem);
        }
      }

    } else if (pieceType === 'k') {
      // King: Supreme Sovereign Monarch with Royal Beard & Imperial Arched Crown
      const beard = new THREE.Mesh(new THREE.SphereGeometry(0.085, 14, 14), hairMat);
      beard.scale.set(1.05, 1.25, 0.9);
      beard.position.set(0, -0.065, 0.042);
      headGroup.add(beard);

      const mustache = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.022, 0.03), hairMat);
      mustache.position.set(0, -0.032, 0.105);
      headGroup.add(mustache);

      // Imperial Gold Crown Base
      const crownBase = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.118, 0.07, 20), goldMat);
      crownBase.position.y = 0.08;
      headGroup.add(crownBase);

      // Velvet Crown Cap & Gold Arches
      const velvetCap = new THREE.Mesh(new THREE.SphereGeometry(0.112, 16, 12), capeMat);
      velvetCap.position.y = 0.11;
      headGroup.add(velvetCap);

      for (let i = 0; i < 4; i++) {
        const ang = (i * Math.PI) / 2;
        const arch = new THREE.Mesh(new THREE.TorusGeometry(0.115, 0.012, 6, 16, Math.PI), goldMat);
        arch.position.y = 0.11;
        arch.rotation.y = ang;
        headGroup.add(arch);
      }

      // Sovereign Cross & Center Gem atop Crown
      const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.12, 0.03), goldMat);
      crossV.position.y = 0.27;
      const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.03, 0.03), goldMat);
      crossH.position.y = 0.28;
      const crownGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.032, 0), gemMat);
      crownGem.position.y = 0.275;
      headGroup.add(crossV, crossH, crownGem);
    }

    // 6. Articulated Left & Right Human Arms (Pauldron, Upper Arm, Forearm Gauntlet, Hand)
    const leftArmGroup = new THREE.Group();
    leftArmGroup.position.set(-(torsoWidthTop + 0.045), 0.78, 0);
    const rightArmGroup = new THREE.Group();
    rightArmGroup.position.set(torsoWidthTop + 0.045, 0.78, 0);
    riderRoot.add(leftArmGroup, rightArmGroup);

    const buildArm = (armGroup: THREE.Group, isLeft: boolean) => {
      // Ornate Shoulder Pauldron
      const pauldronSize = pieceType === 'r' ? 0.095 : pieceType === 'q' ? 0.068 : 0.082;
      const pauldron = new THREE.Mesh(
        new THREE.SphereGeometry(pauldronSize, 12, 12, 0, Math.PI * 2, 0, Math.PI * 0.6),
        armorMat
      );
      pauldron.rotation.z = isLeft ? 0.35 : -0.35;
      pauldron.castShadow = true;
      armGroup.add(pauldron);

      const pauldronTrim = new THREE.Mesh(new THREE.TorusGeometry(pauldronSize * 0.95, 0.01, 6, 14), goldMat);
      pauldronTrim.rotation.x = Math.PI / 2;
      pauldronTrim.rotation.y = isLeft ? -0.35 : 0.35;
      armGroup.add(pauldronTrim);

      // Upper arm
      const upperArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.042, 0.13, 6, 10), tunicMat);
      upperArm.position.y = -0.1;
      upperArm.castShadow = true;
      armGroup.add(upperArm);

      // Forearm gauntlet (angled slightly forward like a natural human arm)
      const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.044, 0.036, 0.16, 10), armorMat);
      forearm.position.set(0, -0.22, 0.045);
      forearm.rotation.x = Math.PI * 0.18;
      forearm.castShadow = true;
      armGroup.add(forearm);

      // Human Hand
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 10), skinMat);
      hand.position.set(0, -0.28, 0.095);
      armGroup.add(hand);
    };

    buildArm(leftArmGroup, true);
    buildArm(rightArmGroup, false);

    // 7. Attach Off-Hand Equipment to Left Arm (Shield / Holy Tome / Royal Orb)
    if (pieceType === 'p' || pieceType === 'n' || pieceType === 'r') {
      // Warrior Shield on Left Forearm
      const shieldGroup = new THREE.Group();
      shieldGroup.position.set(-0.05, -0.22, 0.12);
      shieldGroup.rotation.y = -0.35;

      if (pieceType === 'p') {
        // Round Infantry Buckler with Lion Boss
        const buckler = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.025, 18), goldMat);
        buckler.rotation.x = Math.PI / 2;
        const boss = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 10), armorMat);
        boss.position.z = 0.02;
        shieldGroup.add(buckler, boss);
      } else {
        // Knight / Rook Heater Kite Shield with Royal Gem Crest
        const kiteGeo = new THREE.CylinderGeometry(0.16, 0.08, 0.32, 4);
        kiteGeo.scale(1, 1, 0.25);
        const kite = new THREE.Mesh(kiteGeo, armorMat);
        const kiteTrim = new THREE.Mesh(new THREE.OctahedronGeometry(0.055, 0), goldMat);
        kiteTrim.position.z = 0.04;
        shieldGroup.add(kite, kiteTrim);
      }
      leftArmGroup.add(shieldGroup);

    } else if (pieceType === 'b') {
      // Bishop holds an Arcane Illuminated Scripture Tome in Left Hand
      const tome = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.14, 0.035), capeMat);
      tome.position.set(0, -0.27, 0.14);
      tome.rotation.x = -0.6;
      const tomeCross = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.09, 0.04), goldMat);
      tomeCross.position.copy(tome.position);
      tomeCross.rotation.copy(tome.rotation);
      leftArmGroup.add(tome, tomeCross);

    } else if (pieceType === 'q' || pieceType === 'k') {
      // Queen / King holds the Sovereign Globus Cruciger (Royal Orb) in Left Hand
      const orb = new THREE.Mesh(new THREE.SphereGeometry(0.052, 12, 12), goldMat);
      orb.position.set(0, -0.26, 0.14);
      const orbGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.03, 0), gemMat);
      orbGem.position.set(0, -0.2, 0.14);
      leftArmGroup.add(orb, orbGem);
    }

    // 8. Attach Signature Weapon to the Human's Right Hand!
    const weaponGroup = this.createWeapon(pieceType, color, 'ultra');
    rightArmGroup.add(weaponGroup);

    return {
      headGroup,
      leftArmGroup,
      rightArmGroup,
      leftLegGroup,
      rightLegGroup,
      weaponGroup,
    };
  }

  /**
   * Creates either an Ultra-Realistic Humanoid Warrior ('ultra')
   * or a Classic Carved Marble Chess Piece ('classic')
   */
  public createPieceMesh(
    pieceType: PieceSymbol,
    color: Color,
    square: Square,
    graphicStyle: GraphicStyle = 'ultra'
  ): THREE.Group {
    const group = new THREE.Group();
    const isWhite = color === 'w';
    const isUltra = graphicStyle === 'ultra';

    const bodyGroup = new THREE.Group();
    bodyGroup.name = `body_${pieceType}_${color}`;
    group.add(bodyGroup);

    let weaponGroup: THREE.Group;
    let headGroup: THREE.Group | undefined;
    let leftArmGroup: THREE.Group | undefined;
    let rightArmGroup: THREE.Group | undefined;
    let leftLegGroup: THREE.Group | undefined;
    let rightLegGroup: THREE.Group | undefined;

    if (isUltra) {
      // Build full humanoid warrior character!
      const humanParts = this.buildHumanoidCharacter(pieceType, color, group, bodyGroup);
      weaponGroup = humanParts.weaponGroup;
      headGroup = humanParts.headGroup;
      leftArmGroup = humanParts.leftArmGroup;
      rightArmGroup = humanParts.rightArmGroup;
      leftLegGroup = humanParts.leftLegGroup;
      rightLegGroup = humanParts.rightLegGroup;
    } else {
      // Classic Staunton Carved Statue Mode
      const mainMat = isWhite ? this.materials.whitePieceMat : this.materials.blackPieceMat;
      const trimMat = this.materials.goldAccentMat;

      // 1. Classic Plinth Base
      const base1Geo = new THREE.CylinderGeometry(0.38, 0.42, 0.12, 24);
      const base1 = new THREE.Mesh(base1Geo, mainMat);
      base1.position.y = 0.062;
      base1.castShadow = true;
      base1.receiveShadow = true;
      group.add(base1);

      const goldRingGeo = new THREE.TorusGeometry(0.385, 0.022, 10, 24);
      const goldRing = new THREE.Mesh(goldRingGeo, trimMat);
      goldRing.rotation.x = Math.PI / 2;
      goldRing.position.y = 0.122;
      group.add(goldRing);

      const base2Geo = new THREE.CylinderGeometry(0.32, 0.365, 0.11, 24);
      const base2 = new THREE.Mesh(base2Geo, mainMat);
      base2.position.y = 0.16;
      base2.castShadow = true;
      group.add(base2);

      if (pieceType === 'p') {
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.3, 0.45, 20), mainMat);
        body.position.y = 0.44;
        body.castShadow = true;
        const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.18, 0.06, 20), trimMat);
        collar.position.y = 0.68;
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 20, 20), mainMat);
        head.position.y = 0.86;
        head.castShadow = true;
        bodyGroup.add(body, collar, head);
      } else if (pieceType === 'r') {
        const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.3, 0.6, 20), mainMat);
        tower.position.y = 0.52;
        tower.castShadow = true;
        const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.25, 0.12, 20), trimMat);
        rim.position.y = 0.85;
        bodyGroup.add(tower, rim);
        for (let i = 0; i < 4; i++) {
          const angle = (i * Math.PI) / 2;
          const battlement = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.14, 0.12), mainMat);
          battlement.position.set(Math.cos(angle) * 0.25, 0.96, Math.sin(angle) * 0.25);
          battlement.castShadow = true;
          bodyGroup.add(battlement);
        }
      } else if (pieceType === 'n') {
        const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.28, 0.45, 16), mainMat);
        neck.position.set(0, 0.45, -0.05);
        neck.rotation.x = -0.25;
        neck.castShadow = true;
        const muzzle = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.22, 0.32), mainMat);
        muzzle.position.set(0, 0.72, 0.1);
        muzzle.rotation.x = 0.3;
        muzzle.castShadow = true;
        const ear1 = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.14, 6), trimMat);
        ear1.position.set(-0.08, 0.92, 0.02);
        ear1.rotation.z = -0.15;
        const ear2 = ear1.clone();
        ear2.position.x = 0.08;
        ear2.rotation.z = 0.15;
        const mane = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.35, 0.15), trimMat);
        mane.position.set(0, 0.65, -0.16);
        bodyGroup.add(neck, muzzle, ear1, ear2, mane);
      } else if (pieceType === 'b') {
        const waist = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.28, 0.6, 20), mainMat);
        waist.position.y = 0.52;
        waist.castShadow = true;
        const goldCollar = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.02, 8, 20), trimMat);
        goldCollar.rotation.x = Math.PI / 2;
        goldCollar.position.y = 0.82;
        const mitreGeo = new THREE.SphereGeometry(0.22, 20, 20);
        mitreGeo.scale(1, 1.4, 1);
        const mitre = new THREE.Mesh(mitreGeo, mainMat);
        mitre.position.y = 1.05;
        mitre.castShadow = true;
        const topBall = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 12), trimMat);
        topBall.position.y = 1.38;
        bodyGroup.add(waist, goldCollar, mitre, topBall);
      } else if (pieceType === 'q') {
        const dress = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.3, 0.7, 24), mainMat);
        dress.position.y = 0.56;
        dress.castShadow = true;
        const crownBase = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.18, 0.12, 24), trimMat);
        crownBase.position.y = 0.96;
        const headBall = new THREE.Mesh(new THREE.SphereGeometry(0.16, 20, 20), mainMat);
        headBall.position.y = 1.1;
        headBall.castShadow = true;
        bodyGroup.add(dress, crownBase, headBall);
        for (let i = 0; i < 8; i++) {
          const ang = (i * Math.PI) / 4;
          const spike = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.1, 6), trimMat);
          spike.position.set(Math.cos(ang) * 0.18, 1.22, Math.sin(ang) * 0.18);
          bodyGroup.add(spike);
        }
        const royalOrb = new THREE.Mesh(new THREE.SphereGeometry(0.065, 12, 12), trimMat);
        royalOrb.position.y = 1.28;
        bodyGroup.add(royalOrb);
      } else if (pieceType === 'k') {
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.32, 0.75, 24), mainMat);
        body.position.y = 0.58;
        body.castShadow = true;
        const crownCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.2, 0.14, 24), trimMat);
        crownCollar.position.y = 1.02;
        const kingCap = new THREE.Mesh(new THREE.SphereGeometry(0.18, 20, 20), mainMat);
        kingCap.scale.set(1.1, 1, 1.1);
        kingCap.position.y = 1.18;
        kingCap.castShadow = true;
        const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.2, 0.045), trimMat);
        crossV.position.y = 1.44;
        const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.045, 0.045), trimMat);
        crossH.position.y = 1.46;
        bodyGroup.add(body, crownCollar, kingCap, crossV, crossH);
      }

      weaponGroup = this.createWeapon(pieceType, color, 'classic');
      bodyGroup.add(weaponGroup);
    }

    // Initial stance: 'none'
    weaponGroup.visible = false;

    // Calculate position on the board
    const col = square.charCodeAt(0) - 'a'.charCodeAt(0);
    const row = parseInt(square[1], 10) - 1;
    const posX = (col - 3.5) * 1.0;
    const posZ = (3.5 - row) * 1.0;

    group.position.set(posX, 0, posZ);

    if (color === 'w') {
      // White starts at +Z (rank 1-2), so rotate Math.PI to face -Z (toward Black)
      group.rotation.y = Math.PI;
    } else {
      // Black starts at -Z (rank 7-8), so rotate 0 to face +Z (toward White)
      group.rotation.y = 0;
    }

    const userData: Piece3DUserData = {
      square,
      pieceType,
      color,
      originalPos: new THREE.Vector3(posX, 0, posZ),
      targetPos: new THREE.Vector3(posX, 0, posZ),
      weaponGroup,
      bodyGroup,
      headGroup,
      leftArmGroup,
      rightArmGroup,
      leftLegGroup,
      rightLegGroup,
      weaponStance: 'none',
      isTrembling: false,
      baseY: 0,
      seed: Math.random() * 100,
      graphicStyle,
    };

    group.userData = userData;
    return group;
  }

  /**
   * Applies the weapon stance animation & posture:
   * - 'attack': raised forward in strike position (武器を構える)
   * - 'defense': held upright or across chest (武器を携える)
   * - 'none': stowed/hidden (何も持たない)
   */
  public updateWeaponStance(pieceMesh: THREE.Group, stance: WeaponStance) {
    const data = pieceMesh.userData as Piece3DUserData;
    if (!data || !data.weaponGroup) return;

    data.weaponStance = stance;

    if (stance === 'none') {
      data.weaponGroup.visible = false;
      if (data.rightArmGroup) {
        data.rightArmGroup.rotation.set(0, 0, 0);
      }
      if (data.leftArmGroup) {
        data.leftArmGroup.rotation.set(0, 0, 0);
      }
    } else if (stance === 'attack') {
      data.weaponGroup.visible = true;
      if (data.rightArmGroup) {
        // Human right arm raises forward (-X) while wrist tilts weapon tip forward (+X) toward enemy (+Z)
        data.rightArmGroup.rotation.set(-0.75, -0.12, -0.1);
        data.weaponGroup.rotation.set(1.35, 0, 0);
      } else {
        data.weaponGroup.rotation.set(Math.PI / 3.2, 0.2, -0.15);
      }
      if (data.leftArmGroup) {
        // Left arm braces shield/orb forward
        data.leftArmGroup.rotation.set(-0.45, 0.25, 0.1);
      }
    } else if (stance === 'defense') {
      data.weaponGroup.visible = true;
      if (data.rightArmGroup) {
        // Human right arm holds weapon upright across chest in defensive guard
        data.rightArmGroup.rotation.set(-0.32, 0.25, 0.15);
        data.weaponGroup.rotation.set(0.35, 0, -0.15);
      } else {
        data.weaponGroup.rotation.set(0, -0.1, -0.1);
      }
      if (data.leftArmGroup) {
        // Left arm raises shield squarely across torso
        data.leftArmGroup.rotation.set(-0.55, 0.45, 0.2);
      }
    }
  }
}
