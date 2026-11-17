import * as THREE from 'three';

export const CELL_SIZE = 3.2;
export const WALL_HEIGHT = 3.6;

// Legend:
// '#' = Reinforced Bunker Wall
// 'R' = Reactor Hazard Wall (red warning stripe)
// 'D' = Locked Blast Door (requires Red Keycard)
// 'E' = Extraction Exit Beacon Wall / Portal Pad
// 'T' = Toxic Coolant Trench (low glowing acid floor hazard)
// '.' = Walkable Metal Grate Floor
export const SECTOR_09_GRID: string[] = [
  '####################',
  '#....#........#....#',
  '#..R.#..TTTT..#..E.#',
  '#....#..TTTT..D....#',
  '#.##.#........#....#',
  '#....#####.####.##.#',
  '#.................##',
  '###.####...####...##',
  '#......#...#.......#',
  '#..RR..#...#..RR...#',
  '#......#...#.......#',
  '#......#...#.......#',
  '###.####...####.####',
  '#..................#',
  '#....#........#....#',
  '#....#..TTTT..#....#',
  '#....#........#....#',
  '#....###....###....#',
  '#..................#',
  '####################',
];

export type WeaponId = 'shotgun' | 'plasma' | 'chaingun';

export interface WeaponSpec {
  id: WeaponId;
  name: string;
  damage: number;
  cooldownSec: number;
  spreadRad: number;
  pellets: number;
  ammoCost: number;
  ammoPool: 'shells' | 'cells' | 'bullets';
  range: number;
  description: string;
}

export const WEAPON_SPECS: Record<WeaponId, WeaponSpec> = {
  shotgun: {
    id: 'shotgun',
    name: 'M890 Combat Shotgun',
    damage: 18,
    cooldownSec: 0.62,
    spreadRad: 0.075,
    pellets: 6,
    ammoCost: 1,
    ammoPool: 'shells',
    range: 26,
    description: '6-pellet buckshot spread. Devastating at close corridor range.',
  },
  plasma: {
    id: 'plasma',
    name: 'Mk-IV Plasma Rifle',
    damage: 34,
    cooldownSec: 0.22,
    spreadRad: 0.015,
    pellets: 1,
    ammoCost: 1,
    ammoPool: 'cells',
    range: 46,
    description: 'High-velocity superheated plasma bolts for armored targets.',
  },
  chaingun: {
    id: 'chaingun',
    name: 'Vulcan Rotary Chaingun',
    damage: 13,
    cooldownSec: 0.1,
    spreadRad: 0.035,
    pellets: 1,
    ammoCost: 1,
    ammoPool: 'bullets',
    range: 42,
    description: 'Rapid rotary suppressor for clearing swarming Imp packs.',
  },
};

export type EnemyArchetype = 'imp' | 'trooper' | 'baron';

export interface EnemySpawn {
  id: string;
  archetype: EnemyArchetype;
  gx: number;
  gz: number;
  hp: number;
  speed: number;
  damage: number;
  attackRange: number;
  scoreValue: number;
}

export interface PickupSpawn {
  id: string;
  kind: 'medkit' | 'armor' | 'shells' | 'cells' | 'keycard';
  gx: number;
  gz: number;
  amount: number;
  label: string;
}

export interface BarrelSpawn {
  id: string;
  gx: number;
  gz: number;
}

export interface ZoneSpec {
  name: string;
  coords: string;
  role: string;
}

export const LEVEL_SPEC = {
  codeName: 'E1M9 // Phobos Reactor Sector 09',
  gridSize: `${SECTOR_09_GRID[0].length} x ${SECTOR_09_GRID.length} sectors (${CELL_SIZE}m scale)`,
  playerStart: { gx: 2.5, gz: 18.2, yaw: 0 },
  exitCell: { gx: 17.5, gz: 2.5 },
  doorCell: { gx: 14, gz: 3 },
  zones: [
    { name: 'Drop Bay Entry', coords: 'Sector (2, 18)', role: 'Spawn perimeter with cover pillars & initial shotgun ammo' },
    { name: 'Toxic Coolant Canal', coords: 'Sector (8..11, 15)', role: 'Bio-acid trench hazard — sprint or flank around outer walkways' },
    { name: 'Armory & Substation', coords: 'Sector (2, 2..9)', role: 'West wing containing Red Security Keycard & Plasma cells' },
    { name: 'Reactor Core Atrium', coords: 'Sector (9, 8..11)', role: 'Central dual-corridor hub guarded by Cyber-Troopers & Barrels' },
    { name: 'Locked Blast Airlock', coords: 'Sector (14, 3)', role: 'Security door unlocked by Red Keycard (Press USE or walk near)' },
    { name: 'Extraction Portal', coords: 'Sector (17, 2)', role: 'Hell Baron Boss arena & sector extraction pad' },
  ] as ZoneSpec[],
};

export const INITIAL_ENEMIES: EnemySpawn[] = [
  { id: 'imp-1', archetype: 'imp', gx: 5.5, gz: 13.5, hp: 60, speed: 3.1, damage: 10, attackRange: 2.2, scoreValue: 150 },
  { id: 'imp-2', archetype: 'imp', gx: 14.5, gz: 13.5, hp: 60, speed: 3.2, damage: 10, attackRange: 2.2, scoreValue: 150 },
  { id: 'trooper-1', archetype: 'trooper', gx: 9.5, gz: 10.5, hp: 90, speed: 2.4, damage: 12, attackRange: 14, scoreValue: 250 },
  { id: 'imp-3', archetype: 'imp', gx: 3.0, gz: 9.5, hp: 65, speed: 3.2, damage: 10, attackRange: 2.2, scoreValue: 150 },
  { id: 'trooper-2', archetype: 'trooper', gx: 2.5, gz: 3.5, hp: 95, speed: 2.5, damage: 12, attackRange: 14, scoreValue: 250 },
  { id: 'imp-4', archetype: 'imp', gx: 11.5, gz: 4.5, hp: 65, speed: 3.3, damage: 10, attackRange: 2.2, scoreValue: 150 },
  { id: 'trooper-3', archetype: 'trooper', gx: 16.5, gz: 9.5, hp: 95, speed: 2.6, damage: 12, attackRange: 14, scoreValue: 250 },
  { id: 'baron-boss', archetype: 'baron', gx: 16.5, gz: 3.0, hp: 320, speed: 2.2, damage: 22, attackRange: 16, scoreValue: 1000 },
];

export const INITIAL_PICKUPS: PickupSpawn[] = [
  { id: 'pk-shells-1', kind: 'shells', gx: 1.8, gz: 16.2, amount: 8, label: '+8 Shells' },
  { id: 'pk-med-1', kind: 'medkit', gx: 17.5, gz: 16.5, amount: 25, label: '+25 Health' },
  { id: 'pk-armor-1', kind: 'armor', gx: 9.5, gz: 6.5, amount: 30, label: '+30 Armor' },
  { id: 'pk-cells-1', kind: 'cells', gx: 1.8, gz: 6.5, amount: 24, label: '+24 Plasma Cells' },
  { id: 'pk-key-red', kind: 'keycard', gx: 2.5, gz: 2.2, amount: 1, label: 'Red Security Keycard' },
  { id: 'pk-med-2', kind: 'medkit', gx: 17.2, gz: 8.5, amount: 25, label: '+25 Health' },
  { id: 'pk-cells-2', kind: 'cells', gx: 12.2, gz: 1.5, amount: 20, label: '+20 Plasma Cells' },
];

export const INITIAL_BARRELS: BarrelSpawn[] = [
  { id: 'brl-1', gx: 6.8, gz: 13.5 },
  { id: 'brl-2', gx: 9.5, gz: 8.5 },
  { id: 'brl-3', gx: 4.2, gz: 3.5 },
  { id: 'brl-4', gx: 15.5, gz: 4.2 },
];

export function gridToWorld(gx: number, gz: number): { x: number; z: number } {
  return {
    x: gx * CELL_SIZE,
    z: gz * CELL_SIZE,
  };
}

export function worldToGrid(x: number, z: number): { gx: number; gz: number } {
  return {
    gx: x / CELL_SIZE,
    gz: z / CELL_SIZE,
  };
}

export function isWallCell(gx: number, gz: number, doorOpen: boolean): boolean {
  const ix = Math.floor(gx);
  const iz = Math.floor(gz);
  if (iz < 0 || iz >= SECTOR_09_GRID.length || ix < 0 || ix >= SECTOR_09_GRID[0].length) {
    return true;
  }
  const ch = SECTOR_09_GRID[iz][ix];
  if (ch === '#' || ch === 'R') return true;
  if (ch === 'D' && !doorOpen) return true;
  return false;
}

export function isToxicCell(gx: number, gz: number): boolean {
  const ix = Math.floor(gx);
  const iz = Math.floor(gz);
  if (iz < 0 || iz >= SECTOR_09_GRID.length || ix < 0 || ix >= SECTOR_09_GRID[0].length) {
    return false;
  }
  return SECTOR_09_GRID[iz][ix] === 'T';
}

// Procedural Canvas Textures (zero external 404 assets)
export function createBunkerTexture(
  kind: 'wall' | 'reactor' | 'door' | 'floor' | 'toxic',
  maxAniso: number
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  if (kind === 'wall') {
    ctx.fillStyle = '#252b36';
    ctx.fillRect(0, 0, 256, 256);
    // Steel ribs & panel seams
    ctx.strokeStyle = '#11161f';
    ctx.lineWidth = 6;
    ctx.strokeRect(4, 4, 248, 248);
    ctx.fillStyle = '#333c4b';
    ctx.fillRect(16, 16, 104, 224);
    ctx.fillRect(136, 16, 104, 224);
    // Hazard trim along base
    for (let x = 0; x < 256; x += 32) {
      ctx.fillStyle = (x / 32) % 2 === 0 ? '#b45309' : '#18181b';
      ctx.fillRect(x, 228, 32, 20);
    }
    // Rivets
    ctx.fillStyle = '#64748b';
    for (const ry of [28, 128, 210]) {
      for (const rx of [26, 110, 146, 230]) {
        ctx.fillRect(rx, ry, 5, 5);
      }
    }
  } else if (kind === 'reactor') {
    ctx.fillStyle = '#291519';
    ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 6;
    ctx.strokeRect(8, 8, 240, 240);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(32, 48, 192, 18);
    ctx.fillRect(32, 118, 192, 24);
    ctx.fillStyle = '#fca5a5';
    ctx.fillRect(48, 124, 160, 10);
  } else if (kind === 'door') {
    ctx.fillStyle = '#3b1518';
    ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 10;
    ctx.strokeRect(10, 10, 236, 236);
    ctx.fillStyle = '#991b1b';
    ctx.fillRect(30, 30, 196, 196);
    ctx.fillStyle = '#f87171';
    ctx.fillRect(108, 72, 40, 112);
  } else if (kind === 'floor') {
    ctx.fillStyle = '#181c24';
    ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = '#272f3d';
    ctx.lineWidth = 4;
    for (let i = 0; i <= 256; i += 64) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 256);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(256, i);
      ctx.stroke();
    }
    ctx.fillStyle = '#0f131a';
    for (let y = 16; y < 256; y += 64) {
      for (let x = 16; x < 256; x += 64) {
        ctx.fillRect(x, y, 32, 32);
      }
    }
  } else {
    // toxic green coolant
    ctx.fillStyle = '#064e3b';
    ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = '#10b981';
    for (let i = 0; i < 24; i++) {
      ctx.beginPath();
      ctx.arc((i * 53) % 256, (i * 89) % 256, 10 + (i % 4) * 6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = Math.min(8, maxAniso || 4);
  return tex;
}

// Composite 3-12 part procedural Demon Enemy Model (bottom-center pivoted at y=0)
export function buildDemonMesh(archetype: EnemyArchetype): THREE.Group {
  const group = new THREE.Group();

  const scale = archetype === 'baron' ? 1.48 : archetype === 'trooper' ? 1.08 : 0.96;
  const bodyColor =
    archetype === 'baron' ? 0x991b1b : archetype === 'trooper' ? 0x334155 : 0x7c2d12;
  const armorColor =
    archetype === 'baron' ? 0x450a0a : archetype === 'trooper' ? 0x1e293b : 0x431407;
  const eyeColor = archetype === 'trooper' ? 0x38bdf8 : 0xfacc15;

  const skinMat = new THREE.MeshStandardMaterial({
    color: bodyColor,
    roughness: 0.65,
    metalness: 0.15,
  });
  const armorMat = new THREE.MeshStandardMaterial({
    color: armorColor,
    roughness: 0.32,
    metalness: 0.72,
  });
  const eyeMat = new THREE.MeshStandardMaterial({
    color: eyeColor,
    emissive: eyeColor,
    emissiveIntensity: 2.2,
    roughness: 0.2,
  });

  // 1. Legs (left/right)
  const legGeo = new THREE.CylinderGeometry(0.14, 0.17, 0.72, 8);
  const legL = new THREE.Mesh(legGeo, armorMat);
  legL.position.set(-0.22, 0.36, 0);
  const legR = new THREE.Mesh(legGeo, armorMat);
  legR.position.set(0.22, 0.36, 0);

  // 2. Armored Torso
  const torsoGeo = new THREE.BoxGeometry(0.76, 0.85, 0.46);
  const torso = new THREE.Mesh(torsoGeo, skinMat);
  torso.position.set(0, 1.12, 0);

  // 3. Chest Plate
  const chestPlate = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.45, 0.52), armorMat);
  chestPlate.position.set(0, 1.2, 0.04);

  // 4. Shoulder Pauldrons
  const pauldronGeo = new THREE.SphereGeometry(0.2, 10, 8);
  const paulL = new THREE.Mesh(pauldronGeo, armorMat);
  paulL.position.set(-0.48, 1.44, 0);
  const paulR = new THREE.Mesh(pauldronGeo, armorMat);
  paulR.position.set(0.48, 1.44, 0);

  // 5. Arms / Claws / Cannon
  const armGeo = new THREE.BoxGeometry(0.18, 0.65, 0.2);
  const armL = new THREE.Mesh(armGeo, skinMat);
  armL.position.set(-0.5, 1.05, 0.16);
  armL.rotation.x = -0.5;
  const armR = new THREE.Mesh(armGeo, archetype === 'trooper' ? armorMat : skinMat);
  armR.position.set(0.5, 1.08, 0.24);
  armR.rotation.x = -1.1;

  // 6. Head & Glowing Eyes
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.4, 0.4), skinMat);
  head.position.set(0, 1.76, 0.04);

  const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.06, 0.06), eyeMat);
  eyeL.position.set(-0.1, 1.8, 0.24);
  const eyeR = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.06, 0.06), eyeMat);
  eyeR.position.set(0.1, 1.8, 0.24);

  group.add(legL, legR, torso, chestPlate, paulL, paulR, armL, armR, head, eyeL, eyeR);

  // 7. Horns for Imp & Baron
  if (archetype !== 'trooper') {
    const hornGeo = new THREE.ConeGeometry(0.08, 0.34, 6);
    const hornMat = new THREE.MeshStandardMaterial({ color: 0xe7e5e4, roughness: 0.4, metalness: 0.1 });
    const hornL = new THREE.Mesh(hornGeo, hornMat);
    hornL.position.set(-0.2, 2.02, 0.02);
    hornL.rotation.z = 0.42;
    const hornR = new THREE.Mesh(hornGeo, hornMat);
    hornR.position.set(0.2, 2.02, 0.02);
    hornR.rotation.z = -0.42;
    group.add(hornL, hornR);
  }

  group.scale.setScalar(scale);
  return group;
}

// Composite 4-part Fuel Barrel
export function buildBarrelMesh(): THREE.Group {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.36, 0.36, 1.08, 12),
    new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.42, metalness: 0.55 })
  );
  body.position.y = 0.54;

  const bandTop = new THREE.Mesh(
    new THREE.CylinderGeometry(0.38, 0.38, 0.1, 12),
    new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.3, metalness: 0.7 })
  );
  bandTop.position.y = 0.88;

  const bandMid = bandTop.clone();
  bandMid.position.y = 0.22;

  const cap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.1, 0.08, 8),
    new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.85, roughness: 0.2 })
  );
  cap.position.set(0.14, 1.1, 0);

  group.add(body, bandTop, bandMid, cap);
  return group;
}
