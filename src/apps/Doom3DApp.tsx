import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  Crosshair,
  Gamepad2,
  Map as MapIcon,
  RotateCcw,
  Shield,
  Smartphone,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { doomAudio } from '../games/doomAudio';
import {
  buildBarrelMesh,
  buildDemonMesh,
  CELL_SIZE,
  createBunkerTexture,
  EnemyArchetype,
  gridToWorld,
  INITIAL_BARRELS,
  INITIAL_ENEMIES,
  INITIAL_PICKUPS,
  isToxicCell,
  isWallCell,
  LEVEL_SPEC,
  SECTOR_09_GRID,
  WALL_HEIGHT,
  WEAPON_SPECS,
  WeaponId,
  worldToGrid,
} from '../games/doomLevel';

interface EnemyEntity {
  id: string;
  archetype: EnemyArchetype;
  mesh: THREE.Group;
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  attackRange: number;
  scoreValue: number;
  attackCooldown: number;
  hitFlash: number;
  alive: boolean;
}

interface PickupEntity {
  id: string;
  kind: 'medkit' | 'armor' | 'shells' | 'cells' | 'keycard';
  mesh: THREE.Group;
  amount: number;
  label: string;
  collected: boolean;
}

interface BarrelEntity {
  id: string;
  mesh: THREE.Group;
  hp: number;
  exploded: boolean;
}

interface ProjectileEntity {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  damage: number;
  fromPlayer: boolean;
  life: number;
}

interface HudSnapshot {
  health: number;
  armor: number;
  weapon: WeaponId;
  shells: number;
  cells: number;
  bullets: number;
  hasRedKey: boolean;
  doorOpen: boolean;
  kills: number;
  totalEnemies: number;
  score: number;
  status: 'playing' | 'dead' | 'victory';
  banner: string;
}

const _vecA = new THREE.Vector3();
const _vecB = new THREE.Vector3();
const _rayDir = new THREE.Vector3();

function detectSoftwareWebGL(): boolean {
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return false;
  }
}

export function Doom3DApp() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const minimapRef = useRef<HTMLCanvasElement | null>(null);

  const [hud, setHud] = useState<HudSnapshot>({
    health: 100,
    armor: 50,
    weapon: 'shotgun',
    shells: 24,
    cells: 40,
    bullets: 120,
    hasRedKey: false,
    doorOpen: false,
    kills: 0,
    totalEnemies: INITIAL_ENEMIES.length,
    score: 0,
    status: 'playing',
    banner: 'Locate the Red Keycard in the West Armory, breach the Airlock, and reach Extraction.',
  });

  const [mobileControls, setMobileControls] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth < 900 || 'ontouchstart' in window : true
  );
  const [specsOpen, setSpecsOpen] = useState(false);
  const [muted, setMuted] = useState(false);
  const [damageFlash, setDamageFlash] = useState(false);
  const [webglLost, setWebglLost] = useState(false);
  const [joystickUi, setJoystickUi] = useState<{ dx: number; dy: number }>({ dx: 0, dy: 0 });
  const [resetNonce, setResetNonce] = useState(0);

  // Live input refs read inside animation loop (zero React rerenders per frame)
  const keysRef = useRef<Record<string, boolean>>({});
  const joyInputRef = useRef<{ moveX: number; moveY: number; sprint: boolean }>({
    moveX: 0,
    moveY: 0,
    sprint: false,
  });
  const lookDeltaRef = useRef<{ yaw: number; pitch: number }>({ yaw: 0, pitch: 0 });
  const fireRequestedRef = useRef<boolean>(false);
  const useRequestedRef = useRef<boolean>(false);
  const weaponSwapRef = useRef<WeaponId | null>(null);
  const joyTouchIdRef = useRef<number | null>(null);
  const lookTouchIdRef = useRef<{ id: number; x: number; y: number } | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareWebGL();
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x090b10);
    scene.fog = new THREE.FogExp2(0x090b10, 0.032);

    const width = Math.max(320, container.clientWidth);
    const height = Math.max(220, container.clientHeight);

    const camera = new THREE.PerspectiveCamera(76, width / height, 0.1, 110);
    const startPos = gridToWorld(LEVEL_SPEC.playerStart.gx, LEVEL_SPEC.playerStart.gz);
    camera.position.set(startPos.x, 1.65, startPos.z);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
      });
    } catch {
      setWebglLost(true);
      return;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setSize(width, height);

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const onContextLost = (e: Event) => {
      e.preventDefault();
      setWebglLost(true);
    };
    const onContextRestored = () => {
      setWebglLost(false);
    };
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', onContextRestored);

    // Studio Environment reflections for metallic bunker ribs & demon armor
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    pmrem.dispose();

    // Lighting Rig
    const hemiLight = new THREE.HemisphereLight(0x94a3b8, 0x3b1212, 0.65);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xffedd5, 1.25);
    keyLight.position.set(22, 34, 18);
    if (!isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(1024, 1024);
      keyLight.shadow.camera.left = -35;
      keyLight.shadow.camera.right = 35;
      keyLight.shadow.camera.top = 35;
      keyLight.shadow.camera.bottom = -35;
      keyLight.shadow.bias = -0.0005;
    }
    scene.add(keyLight);

    const muzzleLight = new THREE.PointLight(0xfbbf24, 0, 12, 2);
    scene.add(muzzleLight);

    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const wallTex = createBunkerTexture('wall', maxAniso);
    const reactorTex = createBunkerTexture('reactor', maxAniso);
    const doorTex = createBunkerTexture('door', maxAniso);
    const floorTex = createBunkerTexture('floor', maxAniso);
    const toxicTex = createBunkerTexture('toxic', maxAniso);

    floorTex.repeat.set(20, 20);
    const floorMat = new THREE.MeshStandardMaterial({
      map: floorTex,
      roughness: 0.72,
      metalness: 0.35,
    });
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(SECTOR_09_GRID[0].length * CELL_SIZE, SECTOR_09_GRID.length * CELL_SIZE),
      floorMat
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(
      (SECTOR_09_GRID[0].length * CELL_SIZE) / 2,
      0,
      (SECTOR_09_GRID.length * CELL_SIZE) / 2
    );
    floor.receiveShadow = !isSoftwareGl;
    scene.add(floor);

    const ceiling = new THREE.Mesh(
      new THREE.PlaneGeometry(SECTOR_09_GRID[0].length * CELL_SIZE, SECTOR_09_GRID.length * CELL_SIZE),
      new THREE.MeshStandardMaterial({ color: 0x0b0f17, roughness: 0.9, metalness: 0.2 })
    );
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(floor.position.x, WALL_HEIGHT, floor.position.z);
    scene.add(ceiling);

    // Build Walls, Doors, Toxic Coolant & Extraction Beacon
    const wallMat = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.55, metalness: 0.55 });
    const reactorMat = new THREE.MeshStandardMaterial({
      map: reactorTex,
      emissive: 0x991b1b,
      emissiveIntensity: 0.4,
      roughness: 0.4,
      metalness: 0.6,
    });
    const doorMat = new THREE.MeshStandardMaterial({
      map: doorTex,
      emissive: 0xef4444,
      emissiveIntensity: 0.35,
      roughness: 0.35,
      metalness: 0.75,
    });
    const toxicMat = new THREE.MeshStandardMaterial({
      map: toxicTex,
      emissive: 0x10b981,
      emissiveIntensity: 0.65,
      roughness: 0.25,
    });

    const wallGeo = new THREE.BoxGeometry(CELL_SIZE, WALL_HEIGHT, CELL_SIZE);
    const doorMeshes: THREE.Mesh[] = [];
    const shootableTargets: THREE.Object3D[] = [];

    SECTOR_09_GRID.forEach((row, gz) => {
      for (let gx = 0; gx < row.length; gx++) {
        const ch = row[gx];
        const pos = gridToWorld(gx + 0.5, gz + 0.5);
        if (ch === '#' || ch === 'R') {
          const m = new THREE.Mesh(wallGeo, ch === 'R' ? reactorMat : wallMat);
          m.position.set(pos.x, WALL_HEIGHT / 2, pos.z);
          m.castShadow = !isSoftwareGl;
          m.receiveShadow = !isSoftwareGl;
          scene.add(m);
          shootableTargets.push(m);
        } else if (ch === 'D') {
          const d = new THREE.Mesh(wallGeo, doorMat);
          d.position.set(pos.x, WALL_HEIGHT / 2, pos.z);
          scene.add(d);
          doorMeshes.push(d);
        } else if (ch === 'T') {
          const t = new THREE.Mesh(new THREE.PlaneGeometry(CELL_SIZE, CELL_SIZE), toxicMat);
          t.rotation.x = -Math.PI / 2;
          t.position.set(pos.x, 0.03, pos.z);
          scene.add(t);
        } else if (ch === 'E') {
          const pad = new THREE.Mesh(
            new THREE.CylinderGeometry(1.15, 1.3, 0.18, 16),
            new THREE.MeshStandardMaterial({
              color: 0x06b6d4,
              emissive: 0x22d3ee,
              emissiveIntensity: 1.4,
              roughness: 0.2,
              metalness: 0.8,
            })
          );
          pad.position.set(pos.x, 0.09, pos.z);
          scene.add(pad);
          const exitLight = new THREE.PointLight(0x22d3ee, 2.4, 12, 1.5);
          exitLight.position.set(pos.x, 2.2, pos.z);
          scene.add(exitLight);
        }
      }
    });

    // Spawn Enemies
    const enemies: EnemyEntity[] = INITIAL_ENEMIES.map((sp) => {
      const mesh = buildDemonMesh(sp.archetype);
      const wpos = gridToWorld(sp.gx, sp.gz);
      mesh.position.set(wpos.x, 0, wpos.z);
      mesh.userData.enemyId = sp.id;
      mesh.traverse((child) => {
        child.userData.enemyId = sp.id;
      });
      scene.add(mesh);
      shootableTargets.push(mesh);
      return {
        id: sp.id,
        archetype: sp.archetype,
        mesh,
        hp: sp.hp,
        maxHp: sp.hp,
        speed: sp.speed,
        damage: sp.damage,
        attackRange: sp.attackRange,
        scoreValue: sp.scoreValue,
        attackCooldown: 0.6,
        hitFlash: 0,
        alive: true,
      };
    });

    // Spawn Pickups
    const pickups: PickupEntity[] = INITIAL_PICKUPS.map((sp) => {
      const g = new THREE.Group();
      const color =
        sp.kind === 'keycard'
          ? 0xef4444
          : sp.kind === 'medkit'
          ? 0x10b981
          : sp.kind === 'armor'
          ? 0x3b82f6
          : sp.kind === 'cells'
          ? 0x06b6d4
          : 0xf59e0b;
      const box = new THREE.Mesh(
        sp.kind === 'keycard'
          ? new THREE.BoxGeometry(0.45, 0.65, 0.1)
          : new THREE.BoxGeometry(0.55, 0.42, 0.55),
        new THREE.MeshStandardMaterial({
          color,
          emissive: color,
          emissiveIntensity: 0.55,
          roughness: 0.28,
          metalness: 0.5,
        })
      );
      g.add(box);
      const wpos = gridToWorld(sp.gx, sp.gz);
      g.position.set(wpos.x, 0.55, wpos.z);
      scene.add(g);
      return {
        id: sp.id,
        kind: sp.kind,
        mesh: g,
        amount: sp.amount,
        label: sp.label,
        collected: false,
      };
    });

    // Spawn Explosive Barrels
    const barrels: BarrelEntity[] = INITIAL_BARRELS.map((sp) => {
      const mesh = buildBarrelMesh();
      const wpos = gridToWorld(sp.gx, sp.gz);
      mesh.position.set(wpos.x, 0, wpos.z);
      mesh.traverse((child) => {
        child.userData.barrelId = sp.id;
      });
      scene.add(mesh);
      shootableTargets.push(mesh);
      return { id: sp.id, mesh, hp: 30, exploded: false };
    });

    // First-person weapon viewmodel attached to camera
    const weaponRig = new THREE.Group();
    const gunBarrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.055, 0.68, 10),
      new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.85, roughness: 0.25 })
    );
    gunBarrel.rotation.x = Math.PI / 2;
    gunBarrel.position.set(0.24, -0.24, -0.48);

    const gunStock = new THREE.Mesh(
      new THREE.BoxGeometry(0.11, 0.14, 0.36),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.5, roughness: 0.55 })
    );
    gunStock.position.set(0.24, -0.3, -0.32);

    const gunGlow = new THREE.Mesh(
      new THREE.BoxGeometry(0.07, 0.04, 0.3),
      new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x38bdf8,
        emissiveIntensity: 1.5,
      })
    );
    gunGlow.position.set(0.24, -0.2, -0.45);

    weaponRig.add(gunBarrel, gunStock, gunGlow);
    camera.add(weaponRig);
    scene.add(camera);

    const projectiles: ProjectileEntity[] = [];
    const raycaster = new THREE.Raycaster();

    // Mutable Game State
    const game = {
      yaw: LEVEL_SPEC.playerStart.yaw,
      pitch: 0,
      health: 100,
      armor: 50,
      weapon: 'shotgun' as WeaponId,
      shells: 24,
      cells: 40,
      bullets: 120,
      hasRedKey: false,
      doorOpen: false,
      doorSlideProgress: 0,
      kills: 0,
      score: 0,
      status: 'playing' as 'playing' | 'dead' | 'victory',
      banner: 'Find the Red Keycard in the West Armory (Sector 2,2) to unlock the East Airlock.',
      weaponCooldown: 0,
      recoil: 0,
      toxicTimer: 0,
      bobPhase: 0,
    };

    const syncHud = () => {
      setHud({
        health: Math.max(0, Math.round(game.health)),
        armor: Math.max(0, Math.round(game.armor)),
        weapon: game.weapon,
        shells: game.shells,
        cells: game.cells,
        bullets: game.bullets,
        hasRedKey: game.hasRedKey,
        doorOpen: game.doorOpen,
        kills: game.kills,
        totalEnemies: enemies.length,
        score: game.score,
        status: game.status,
        banner: game.banner,
      });
    };
    syncHud();

    const applyPlayerDamage = (amount: number, sourceMsg: string) => {
      if (game.status !== 'playing') return;
      const absorbed = Math.min(game.armor, amount * 0.5);
      game.armor -= absorbed;
      game.health -= amount - absorbed;
      game.banner = sourceMsg;
      setDamageFlash(true);
      window.setTimeout(() => setDamageFlash(false), 160);
      if (game.health <= 0) {
        game.health = 0;
        game.status = 'dead';
        game.banner = 'Marine Down in Sector 09. Tap Restart Mission to redeploy.';
      }
      syncHud();
    };

    const explodeBarrel = (barrel: BarrelEntity) => {
      if (barrel.exploded) return;
      barrel.exploded = true;
      barrel.mesh.visible = false;
      doomAudio.playExplosion();
      game.banner = 'Fuel barrel detonated!';

      const bPos = barrel.mesh.position;
      enemies.forEach((en) => {
        if (!en.alive) return;
        const dist = en.mesh.position.distanceTo(bPos);
        if (dist < 6.5) {
          const dmg = Math.round((1 - dist / 6.5) * 140);
          en.hp -= dmg;
          en.hitFlash = 0.25;
          if (en.hp <= 0) {
            en.alive = false;
            en.mesh.visible = false;
            game.kills++;
            game.score += en.scoreValue;
          }
        }
      });

      const playerDist = Math.hypot(camera.position.x - bPos.x, camera.position.z - bPos.z);
      if (playerDist < 5.2) {
        applyPlayerDamage(Math.round((1 - playerDist / 5.2) * 35), 'Caught in fuel barrel blast!');
      }
      syncHud();
    };

    const fireCurrentWeapon = () => {
      if (game.status !== 'playing' || game.weaponCooldown > 0) return;
      const spec = WEAPON_SPECS[game.weapon];
      if (game[spec.ammoPool] < spec.ammoCost) {
        game.banner = `Out of ${spec.ammoPool}! Switch weapons (1/2/3).`;
        syncHud();
        return;
      }

      game[spec.ammoPool] -= spec.ammoCost;
      game.weaponCooldown = spec.cooldownSec;
      game.recoil = 1.0;
      muzzleLight.position.copy(camera.position);
      muzzleLight.intensity = 4.5;
      doomAudio.playWeapon(game.weapon);

      if (game.weapon === 'plasma') {
        // Fast glowing plasma bolt projectile
        const bolt = new THREE.Mesh(
          new THREE.SphereGeometry(0.14, 8, 8),
          new THREE.MeshBasicMaterial({ color: 0x22d3ee })
        );
        bolt.position.copy(camera.position);
        _rayDir.set(0, 0, -1).applyEuler(camera.rotation).normalize();
        bolt.position.addScaledVector(_rayDir, 0.8);
        scene.add(bolt);
        projectiles.push({
          mesh: bolt,
          vel: _rayDir.clone().multiplyScalar(28),
          damage: spec.damage,
          fromPlayer: true,
          life: 1.8,
        });
      } else {
        // Hitscan pellets (Shotgun spread or Chaingun)
        for (let p = 0; p < spec.pellets; p++) {
          const sx = (Math.random() - 0.5) * spec.spreadRad;
          const sy = (Math.random() - 0.5) * spec.spreadRad;
          _rayDir.set(sx, sy, -1).normalize().applyEuler(camera.rotation);
          raycaster.set(camera.position, _rayDir);
          raycaster.far = spec.range;

          const hits = raycaster.intersectObjects(shootableTargets, true);
          if (hits.length > 0) {
            const first = hits[0].object;
            const enemyId = first.userData.enemyId as string | undefined;
            const barrelId = first.userData.barrelId as string | undefined;

            if (enemyId) {
              const en = enemies.find((e) => e.id === enemyId && e.alive);
              if (en) {
                en.hp -= spec.damage;
                en.hitFlash = 0.16;
                if (en.hp <= 0) {
                  en.alive = false;
                  en.mesh.visible = false;
                  game.kills++;
                  game.score += en.scoreValue;
                  doomAudio.playEnemyHit(true);
                  game.banner = `Eliminated ${en.archetype.toUpperCase()} (+${en.scoreValue} pts)`;
                } else {
                  doomAudio.playEnemyHit(false);
                }
              }
            } else if (barrelId) {
              const brl = barrels.find((b) => b.id === barrelId && !b.exploded);
              if (brl) {
                brl.hp -= spec.damage;
                if (brl.hp <= 0) explodeBarrel(brl);
              }
            }
          }
        }
      }
      syncHud();
    };

    const tryUseOrInteract = () => {
      const pGrid = worldToGrid(camera.position.x, camera.position.z);
      const doorDist = Math.hypot(pGrid.gx - (LEVEL_SPEC.doorCell.gx + 0.5), pGrid.gz - (LEVEL_SPEC.doorCell.gz + 0.5));
      if (doorDist < 2.8 && !game.doorOpen) {
        if (game.hasRedKey) {
          game.doorOpen = true;
          doomAudio.playDoorSlide();
          game.banner = 'Red Airlock unlocked! Proceed to Extraction Portal.';
          syncHud();
        } else {
          game.banner = 'Airlock locked: Collect Red Security Keycard in West Armory first!';
          syncHud();
        }
      }
    };

    // Desktop keyboard & mouse drag look
    const onKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.code] = true;
      if (e.code === 'Digit1') weaponSwapRef.current = 'shotgun';
      else if (e.code === 'Digit2') weaponSwapRef.current = 'plasma';
      else if (e.code === 'Digit3') weaponSwapRef.current = 'chaingun';
      else if (e.code === 'KeyE' || e.code === 'KeyF') useRequestedRef.current = true;
      else if (e.code === 'Space') {
        e.preventDefault();
        fireRequestedRef.current = true;
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.code] = false;
    };

    let mouseDragging = false;
    let lastMouseX = 0;
    let lastMouseY = 0;
    const onMouseDown = (e: MouseEvent) => {
      doomAudio.unlock();
      mouseDragging = true;
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
      if (e.button === 0 && !mobileControls) {
        fireRequestedRef.current = true;
      }
    };
    const onMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement === renderer.domElement) {
        lookDeltaRef.current.yaw -= e.movementX * 0.0026;
        lookDeltaRef.current.pitch -= e.movementY * 0.002;
      } else if (mouseDragging) {
        lookDeltaRef.current.yaw -= (e.clientX - lastMouseX) * 0.004;
        lookDeltaRef.current.pitch -= (e.clientY - lastMouseY) * 0.003;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
      }
    };
    const onMouseUp = () => {
      mouseDragging = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    renderer.domElement.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    const onResize = () => {
      if (!container) return;
      const nw = Math.max(320, container.clientWidth);
      const nh = Math.max(220, container.clientHeight);
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(container);

    const clock = new THREE.Clock();
    let frameId = 0;
    let lastMinimapAt = 0;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        const st = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (st === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    const canOccupy = (nx: number, nz: number, radius = 0.65): boolean => {
      const checks = [
        [nx - radius, nz - radius],
        [nx + radius, nz - radius],
        [nx - radius, nz + radius],
        [nx + radius, nz + radius],
      ];
      return checks.every(([px, pz]) => {
        const g = worldToGrid(px, pz);
        return !isWallCell(g.gx, g.gz, game.doorOpen);
      });
    };

    const drawAutomap = () => {
      const mapCanvas = minimapRef.current;
      if (!mapCanvas) return;
      const mctx = mapCanvas.getContext('2d');
      if (!mctx) return;

      const size = mapCanvas.width;
      const cols = SECTOR_09_GRID[0].length;
      const rows = SECTOR_09_GRID.length;
      const cellPx = size / cols;

      mctx.fillStyle = '#030712';
      mctx.fillRect(0, 0, size, size);

      for (let gz = 0; gz < rows; gz++) {
        for (let gx = 0; gx < cols; gx++) {
          const ch = SECTOR_09_GRID[gz][gx];
          if (ch === '#') mctx.fillStyle = '#334155';
          else if (ch === 'R') mctx.fillStyle = '#991b1b';
          else if (ch === 'D') mctx.fillStyle = game.doorOpen ? '#0f172a' : '#ef4444';
          else if (ch === 'T') mctx.fillStyle = '#065f46';
          else if (ch === 'E') mctx.fillStyle = '#06b6d4';
          else mctx.fillStyle = '#0f172a';
          mctx.fillRect(gx * cellPx, gz * cellPx, cellPx - 0.5, cellPx - 0.5);
        }
      }

      // Pickups
      pickups.forEach((pk) => {
        if (pk.collected) return;
        const g = worldToGrid(pk.mesh.position.x, pk.mesh.position.z);
        mctx.fillStyle = pk.kind === 'keycard' ? '#f87171' : '#34d399';
        mctx.fillRect(g.gx * cellPx - 2, g.gz * cellPx - 2, 4, 4);
      });

      // Enemies
      enemies.forEach((en) => {
        if (!en.alive) return;
        const g = worldToGrid(en.mesh.position.x, en.mesh.position.z);
        mctx.fillStyle = en.archetype === 'baron' ? '#f43f5e' : '#fb923c';
        mctx.beginPath();
        mctx.arc(g.gx * cellPx, g.gz * cellPx, en.archetype === 'baron' ? 4.5 : 3, 0, Math.PI * 2);
        mctx.fill();
      });

      // Player triangle
      const pg = worldToGrid(camera.position.x, camera.position.z);
      mctx.save();
      mctx.translate(pg.gx * cellPx, pg.gz * cellPx);
      mctx.rotate(-game.yaw);
      mctx.fillStyle = '#38bdf8';
      mctx.beginPath();
      mctx.moveTo(0, -6);
      mctx.lineTo(-4, 5);
      mctx.lineTo(4, 5);
      mctx.closePath();
      mctx.fill();
      mctx.restore();
    };

    const tick = () => {
      const dt = Math.min(0.05, clock.getDelta());

      if (game.status === 'playing') {
        // Weapon switch
        if (weaponSwapRef.current) {
          game.weapon = weaponSwapRef.current;
          weaponSwapRef.current = null;
          const glowColor =
            game.weapon === 'plasma' ? 0x22d3ee : game.weapon === 'chaingun' ? 0xf59e0b : 0xef4444;
          (gunGlow.material as THREE.MeshStandardMaterial).color.setHex(glowColor);
          (gunGlow.material as THREE.MeshStandardMaterial).emissive.setHex(glowColor);
          syncHud();
        }

        // Look rotation (KB + Touch + Mouse)
        if (keysRef.current['KeyQ'] || keysRef.current['ArrowLeft']) game.yaw += 2.2 * dt;
        if (keysRef.current['KeyE'] === false) {
          /* reserved for Use */
        }
        if (keysRef.current['ArrowRight']) game.yaw -= 2.2 * dt;

        game.yaw += lookDeltaRef.current.yaw;
        game.pitch = THREE.MathUtils.clamp(
          game.pitch + lookDeltaRef.current.pitch,
          -0.45,
          0.45
        );
        lookDeltaRef.current.yaw = 0;
        lookDeltaRef.current.pitch = 0;

        camera.rotation.order = 'YXZ';
        camera.rotation.y = game.yaw;
        camera.rotation.x = game.pitch;

        // Movement vector (WASD + Mobile Virtual Stick)
        let fwd =
          (keysRef.current['KeyW'] || keysRef.current['ArrowUp'] ? 1 : 0) -
          (keysRef.current['KeyS'] || keysRef.current['ArrowDown'] ? 1 : 0);
        let strafe =
          (keysRef.current['KeyD'] ? 1 : 0) - (keysRef.current['KeyA'] ? 1 : 0);

        fwd += -joyInputRef.current.moveY;
        strafe += joyInputRef.current.moveX;

        const moveMag = Math.hypot(fwd, strafe);
        const sprinting = keysRef.current['ShiftLeft'] || joyInputRef.current.sprint;
        const speed = sprinting ? 9.4 : 6.4;

        if (moveMag > 0.05) {
          const nf = fwd / Math.max(1, moveMag);
          const ns = strafe / Math.max(1, moveMag);
          const sinY = Math.sin(game.yaw);
          const cosY = Math.cos(game.yaw);
          const vx = (-sinY * nf + cosY * ns) * speed * dt;
          const vz = (-cosY * nf - sinY * ns) * speed * dt;

          if (canOccupy(camera.position.x + vx, camera.position.z)) {
            camera.position.x += vx;
          }
          if (canOccupy(camera.position.x, camera.position.z + vz)) {
            camera.position.z += vz;
          }
          game.bobPhase += dt * (sprinting ? 14 : 10);
          camera.position.y = 1.65 + Math.sin(game.bobPhase) * 0.055;
        } else {
          camera.position.y = THREE.MathUtils.damp(camera.position.y, 1.65, 10, dt);
        }

        // Weapon recoil & muzzle flash decay
        game.weaponCooldown = Math.max(0, game.weaponCooldown - dt);
        game.recoil = THREE.MathUtils.damp(game.recoil, 0, 14, dt);
        muzzleLight.intensity = THREE.MathUtils.damp(muzzleLight.intensity, 0, 20, dt);
        weaponRig.position.set(
          Math.sin(game.bobPhase * 0.5) * 0.014,
          -Math.abs(Math.cos(game.bobPhase)) * 0.012,
          game.recoil * 0.14
        );
        weaponRig.rotation.x = game.recoil * 0.12;

        if (fireRequestedRef.current) {
          fireCurrentWeapon();
          if (game.weapon !== 'chaingun') {
            fireRequestedRef.current = false;
          }
        }
        if (useRequestedRef.current) {
          useRequestedRef.current = false;
          tryUseOrInteract();
        }

        // Sliding Door animation & auto-open if holding keycard near door
        const pGrid = worldToGrid(camera.position.x, camera.position.z);
        if (
          game.hasRedKey &&
          !game.doorOpen &&
          Math.hypot(pGrid.gx - (LEVEL_SPEC.doorCell.gx + 0.5), pGrid.gz - (LEVEL_SPEC.doorCell.gz + 0.5)) < 2.2
        ) {
          game.doorOpen = true;
          doomAudio.playDoorSlide();
          game.banner = 'Red Keycard accepted — Blast Airlock opening!';
          syncHud();
        }

        if (game.doorOpen && game.doorSlideProgress < 1) {
          game.doorSlideProgress = Math.min(1, game.doorSlideProgress + dt * 1.4);
          doorMeshes.forEach((dm) => {
            dm.position.y = WALL_HEIGHT / 2 + game.doorSlideProgress * (WALL_HEIGHT - 0.15);
          });
        }

        // Toxic Coolant trench damage check
        if (isToxicCell(pGrid.gx, pGrid.gz)) {
          game.toxicTimer += dt;
          if (game.toxicTimer >= 0.75) {
            game.toxicTimer = 0;
            applyPlayerDamage(6, 'Toxic coolant burn! Move back onto steel grating.');
          }
        } else {
          game.toxicTimer = 0;
        }

        // Extraction Pad Victory check
        const exitDist = Math.hypot(pGrid.gx - LEVEL_SPEC.exitCell.gx, pGrid.gz - LEVEL_SPEC.exitCell.gz);
        if (exitDist < 1.35) {
          game.status = 'victory';
          game.score += 1500;
          game.banner = `SECTOR 09 CLEARED! Final Score: ${game.score} (${game.kills}/${enemies.length} kills)`;
          doomAudio.playPickup('key');
          syncHud();
        }

        // Pickups bobbing & collection
        pickups.forEach((pk) => {
          if (pk.collected) return;
          pk.mesh.rotation.y += dt * 2.2;
          const dist = Math.hypot(
            camera.position.x - pk.mesh.position.x,
            camera.position.z - pk.mesh.position.z
          );
          if (dist < 1.45) {
            pk.collected = true;
            pk.mesh.visible = false;
            if (pk.kind === 'medkit') {
              game.health = Math.min(100, game.health + pk.amount);
              doomAudio.playPickup('health');
            } else if (pk.kind === 'armor') {
              game.armor = Math.min(100, game.armor + pk.amount);
              doomAudio.playPickup('armor');
            } else if (pk.kind === 'shells') {
              game.shells += pk.amount;
              doomAudio.playPickup('ammo');
            } else if (pk.kind === 'cells') {
              game.cells += pk.amount;
              doomAudio.playPickup('ammo');
            } else if (pk.kind === 'keycard') {
              game.hasRedKey = true;
              doomAudio.playPickup('key');
            }
            game.score += 75;
            game.banner = `Collected ${pk.label}`;
            syncHud();
          }
        });

        // Projectiles update
        for (let i = projectiles.length - 1; i >= 0; i--) {
          const pr = projectiles[i];
          pr.life -= dt;
          pr.mesh.position.addScaledVector(pr.vel, dt);
          const pg = worldToGrid(pr.mesh.position.x, pr.mesh.position.z);

          let remove = pr.life <= 0 || isWallCell(pg.gx, pg.gz, game.doorOpen);
          if (!remove && pr.fromPlayer) {
            for (const en of enemies) {
              if (!en.alive) continue;
              _vecA.set(en.mesh.position.x, 1.1, en.mesh.position.z);
              if (pr.mesh.position.distanceTo(_vecA) < 1.05) {
                en.hp -= pr.damage;
                en.hitFlash = 0.2;
                if (en.hp <= 0) {
                  en.alive = false;
                  en.mesh.visible = false;
                  game.kills++;
                  game.score += en.scoreValue;
                  doomAudio.playEnemyHit(true);
                  game.banner = `Plasma vaporized ${en.archetype.toUpperCase()} (+${en.scoreValue})`;
                } else {
                  doomAudio.playEnemyHit(false);
                }
                remove = true;
                syncHud();
                break;
              }
            }
            if (!remove) {
              for (const brl of barrels) {
                if (!brl.exploded && pr.mesh.position.distanceTo(brl.mesh.position) < 1.1) {
                  explodeBarrel(brl);
                  remove = true;
                  break;
                }
              }
            }
          } else if (!remove && !pr.fromPlayer) {
            if (pr.mesh.position.distanceTo(camera.position) < 0.9) {
              applyPlayerDamage(pr.damage, 'Hit by demon plasma bolt!');
              remove = true;
            }
          }

          if (remove) {
            scene.remove(pr.mesh);
            pr.mesh.geometry.dispose();
            (pr.mesh.material as THREE.Material).dispose();
            projectiles.splice(i, 1);
          }
        }

        // Enemies AI: wake on sight/range, steer around walls, attack player
        enemies.forEach((en) => {
          if (!en.alive) return;
          _vecA.set(camera.position.x - en.mesh.position.x, 0, camera.position.z - en.mesh.position.z);
          const dist = _vecA.length();
          if (dist < 22) {
            en.mesh.lookAt(camera.position.x, 0, camera.position.z);
            if (dist > (en.archetype === 'imp' ? 1.8 : 7.5)) {
              _vecA.normalize();
              const stepX = _vecA.x * en.speed * dt;
              const stepZ = _vecA.z * en.speed * dt;
              const gX = worldToGrid(en.mesh.position.x + stepX, en.mesh.position.z);
              if (!isWallCell(gX.gx, gX.gz, game.doorOpen)) en.mesh.position.x += stepX;
              const gZ = worldToGrid(en.mesh.position.x, en.mesh.position.z + stepZ);
              if (!isWallCell(gZ.gx, gZ.gz, game.doorOpen)) en.mesh.position.z += stepZ;
            }

            en.attackCooldown -= dt;
            if (dist <= en.attackRange && en.attackCooldown <= 0) {
              // Verify line-of-sight before firing/clawing
              _vecB.set(en.mesh.position.x, 1.35, en.mesh.position.z);
              _rayDir.subVectors(camera.position, _vecB).normalize();
              raycaster.set(_vecB, _rayDir);
              raycaster.far = dist;
              const block = raycaster.intersectObjects(shootableTargets, false);
              if (block.length === 0 || block[0].distance > dist - 0.5) {
                en.attackCooldown = en.archetype === 'baron' ? 1.25 : 1.55;
                if (en.archetype === 'imp') {
                  applyPlayerDamage(en.damage, 'Imp Stalker clawed you!');
                } else {
                  const bolt = new THREE.Mesh(
                    new THREE.SphereGeometry(0.16, 8, 8),
                    new THREE.MeshBasicMaterial({
                      color: en.archetype === 'baron' ? 0xf43f5e : 0xf97316,
                    })
                  );
                  bolt.position.copy(_vecB);
                  scene.add(bolt);
                  projectiles.push({
                    mesh: bolt,
                    vel: _rayDir.clone().multiplyScalar(en.archetype === 'baron' ? 13.5 : 11),
                    damage: en.damage,
                    fromPlayer: false,
                    life: 2.2,
                  });
                }
              }
            }
          }

          if (en.hitFlash > 0) {
            en.hitFlash -= dt;
            en.mesh.scale.y = (en.archetype === 'baron' ? 1.48 : 1.0) * 1.08;
          } else {
            en.mesh.scale.y = en.archetype === 'baron' ? 1.48 : en.archetype === 'trooper' ? 1.08 : 0.96;
          }
        });
      }

      renderer.render(scene, camera);

      const nowMs = performance.now();
      if (nowMs - lastMinimapAt > 90) {
        lastMinimapAt = nowMs;
        drawAutomap();
      }

      if (isSoftwareGl) afterDraw(tick);
      else frameId = requestAnimationFrame(tick);
    };

    tick();

    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      ro.disconnect();
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      renderer.domElement.removeEventListener('mousedown', onMouseDown);
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', onContextRestored);
      envTex.dispose();
      [wallTex, reactorTex, doorTex, floorTex, toxicTex].forEach((t) => t.dispose());
      renderer.dispose();
    };
  }, [resetNonce, mobileControls]);

  // Mobile Virtual Joystick handlers
  const handleJoyStart = (e: React.TouchEvent<HTMLDivElement>) => {
    doomAudio.unlock();
    const touch = e.changedTouches[0];
    joyTouchIdRef.current = touch.identifier;
    updateJoystickFromTouch(touch, e.currentTarget);
  };

  const handleJoyMove = (e: React.TouchEvent<HTMLDivElement>) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (t.identifier === joyTouchIdRef.current) {
        updateJoystickFromTouch(t, e.currentTarget);
      }
    }
  };

  const handleJoyEnd = () => {
    joyTouchIdRef.current = null;
    joyInputRef.current = { moveX: 0, moveY: 0, sprint: false };
    setJoystickUi({ dx: 0, dy: 0 });
  };

  const updateJoystickFromTouch = (touch: React.Touch, el: HTMLDivElement) => {
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const maxR = rect.width * 0.38;
    let dx = touch.clientX - cx;
    let dy = touch.clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > maxR) {
      dx = (dx / dist) * maxR;
      dy = (dy / dist) * maxR;
    }
    const nx = dx / maxR;
    const ny = dy / maxR;
    joyInputRef.current = { moveX: nx, moveY: ny, sprint: dist > maxR * 0.92 };
    setJoystickUi({ dx, dy });
  };

  // Right-side Touch Look Zone handlers
  const handleLookTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    doomAudio.unlock();
    const t = e.changedTouches[0];
    lookTouchIdRef.current = { id: t.identifier, x: t.clientX, y: t.clientY };
  };

  const handleLookTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!lookTouchIdRef.current) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (t.identifier === lookTouchIdRef.current.id) {
        const dx = t.clientX - lookTouchIdRef.current.x;
        const dy = t.clientY - lookTouchIdRef.current.y;
        lookDeltaRef.current.yaw -= dx * 0.0065;
        lookDeltaRef.current.pitch -= dy * 0.004;
        lookTouchIdRef.current = { id: t.identifier, x: t.clientX, y: t.clientY };
      }
    }
  };

  const handleLookTouchEnd = () => {
    lookTouchIdRef.current = null;
  };

  return (
    <div className="h-full w-full relative bg-[#07090e] overflow-hidden select-none text-xs">
      {/* Isolated WebGL Viewport Container */}
      <div ref={mountRef} className="w-full h-full" />

      {/* Damage Flash Scrim */}
      {damageFlash && (
        <div className="absolute inset-0 bg-rose-600/35 pointer-events-none z-10" />
      )}

      {/* WebGL Context Lost Fallback */}
      {webglLost && (
        <div className="absolute inset-0 z-40 bg-slate-950/95 flex flex-col items-center justify-center p-6 text-center gap-3">
          <Gamepad2 className="w-10 h-10 text-amber-400" />
          <div className="font-display text-base font-semibold text-slate-100">
            WebGL Context Unavailable
          </div>
          <p className="text-slate-400 max-w-sm">
            The 3D viewport was paused by the browser GPU driver. Click below to reinitialize Sector 09.
          </p>
          <button
            type="button"
            onClick={() => {
              setWebglLost(false);
              setResetNonce((n) => n + 1);
            }}
            className="px-4 py-2 rounded-lg bg-amber-500/25 border border-amber-400/50 text-amber-100 font-semibold cursor-pointer"
          >
            Reinitialize 3D Engine
          </button>
        </div>
      )}

      {/* Crosshair */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
        <Crosshair className="w-6 h-6 text-cyan-300/80" />
      </div>

      {/* Top Minimal HUD Bar (Zero backdrop-blur over WebGL) */}
      <div className="absolute top-2.5 left-2.5 right-2.5 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        <div className="pointer-events-auto bg-slate-950/85 border border-white/15 rounded-xl px-3 py-1.5 flex items-center gap-3 font-mono-tabular">
          <span className="font-semibold text-slate-100">
            HP <strong className={hud.health > 35 ? 'text-emerald-400' : 'text-rose-400'}>{hud.health}</strong>
          </span>
          <span className="text-slate-600">·</span>
          <span className="text-slate-200">
            ARM <strong className="text-sky-400">{hud.armor}</strong>
          </span>
          <span className="text-slate-600">·</span>
          <span className="text-amber-300">
            {WEAPON_SPECS[hud.weapon].id.toUpperCase()}{' '}
            <strong>{hud[WEAPON_SPECS[hud.weapon].ammoPool]}</strong>
          </span>
          <span className="hidden sm:inline text-slate-600">·</span>
          <span className="hidden sm:inline text-slate-300">
            KILLS {hud.kills}/{hud.totalEnemies}
          </span>
          {hud.hasRedKey && (
            <>
              <span className="text-slate-600">·</span>
              <span className="text-rose-400 font-semibold">RED KEY</span>
            </>
          )}
        </div>

        <div className="pointer-events-auto flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setMobileControls((v) => !v)}
            className={`px-2.5 py-1.5 rounded-lg border font-medium inline-flex items-center gap-1 cursor-pointer ${
              mobileControls
                ? 'bg-emerald-500/25 border-emerald-400/50 text-emerald-100'
                : 'bg-slate-950/85 border-white/15 text-slate-200'
            }`}
            title="Toggle Mobile Touch Controls"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Touch Pad</span>
          </button>

          <button
            type="button"
            onClick={() => setSpecsOpen((v) => !v)}
            className={`px-2.5 py-1.5 rounded-lg border font-medium inline-flex items-center gap-1 cursor-pointer ${
              specsOpen
                ? 'bg-cyan-500/25 border-cyan-400/50 text-cyan-100'
                : 'bg-slate-950/85 border-white/15 text-slate-200'
            }`}
          >
            <MapIcon className="w-3.5 h-3.5" />
            <span>Specs & Map</span>
          </button>

          <button
            type="button"
            onClick={() => {
              const next = !muted;
              setMuted(next);
              doomAudio.setMuted(next);
            }}
            className="p-1.5 rounded-lg bg-slate-950/85 border border-white/15 text-slate-200 cursor-pointer"
            title={muted ? 'Unmute SFX' : 'Mute SFX'}
          >
            {muted ? <VolumeX className="w-4 h-4 text-rose-300" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={() => setResetNonce((n) => n + 1)}
            className="p-1.5 rounded-lg bg-slate-950/85 border border-white/15 text-slate-200 cursor-pointer"
            title="Restart Mission"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Status Mission Banner */}
      <div className="absolute top-13 left-1/2 -translate-x-1/2 z-15 pointer-events-none max-w-[92%]">
        <div className="bg-slate-950/80 border border-white/10 rounded-lg px-3 py-1 text-[11px] text-slate-200 truncate text-center">
          {hud.banner}
        </div>
      </div>

      {/* Collapsible Specs & Live Automap Drawer */}
      {specsOpen && (
        <div className="absolute inset-x-3 top-14 bottom-16 z-30 bg-slate-950/95 border border-white/15 rounded-xl p-4 overflow-y-auto grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="font-display text-sm font-semibold text-slate-100">
                Tactical Automap · {LEVEL_SPEC.codeName}
              </span>
              <button
                type="button"
                onClick={() => setSpecsOpen(false)}
                className="px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 text-slate-100 cursor-pointer"
              >
                Resume Game
              </button>
            </div>
            <canvas
              ref={minimapRef}
              width={240}
              height={240}
              className="w-full max-w-[240px] aspect-square rounded-lg border border-white/15 bg-[#030712] self-center"
            />
            <div className="text-[11px] text-slate-400 space-y-1 font-mono-tabular">
              <div>Grid Scale: {LEVEL_SPEC.gridSize}</div>
              <div>Legend: Cyan = Exit · Red = Airlock/Boss · Green = Toxic/Items</div>
              <div>Desktop: WASD Move · Mouse/Arrows Look · Space/Click Fire · E Use · 1/2/3 Weapons</div>
            </div>
          </div>

          <div className="md:col-span-7 space-y-3">
            <div>
              <h3 className="font-display text-sm font-semibold text-slate-100 mb-1.5">
                Level Design Architecture (6 Sectors)
              </h3>
              <div className="space-y-1.5">
                {LEVEL_SPEC.zones.map((z) => (
                  <div key={z.name} className="rounded-lg bg-white/[0.04] border border-white/10 p-2">
                    <div className="font-semibold text-cyan-300">
                      {z.name} · <span className="font-mono text-slate-400">{z.coords}</span>
                    </div>
                    <div className="text-slate-300 text-[11px] mt-0.5">{z.role}</div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-display text-sm font-semibold text-slate-100 mb-1.5">
                Arsenal Specifications
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {Object.values(WEAPON_SPECS).map((w) => (
                  <div key={w.id} className="rounded-lg bg-white/[0.04] border border-white/10 p-2">
                    <div className="font-semibold text-amber-300">{w.name}</div>
                    <div className="text-[11px] font-mono-tabular text-slate-300 mt-0.5">
                      DMG {w.damage}x{w.pellets} · CD {w.cooldownSec}s
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{w.description}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Win / Loss Modal */}
      {hud.status !== 'playing' && (
        <div className="absolute inset-0 z-30 bg-slate-950/85 flex flex-col items-center justify-center p-6 text-center gap-3">
          <Shield className={`w-10 h-10 ${hud.status === 'victory' ? 'text-emerald-400' : 'text-rose-400'}`} />
          <h3 className="font-display text-lg font-bold text-slate-100">
            {hud.status === 'victory' ? 'Sector 09 Cleared!' : 'Mission Failed'}
          </h3>
          <p className="text-slate-300 max-w-md">{hud.banner}</p>
          <button
            type="button"
            onClick={() => setResetNonce((n) => n + 1)}
            className="px-5 py-2.5 rounded-lg bg-cyan-500/25 hover:bg-cyan-500/35 border border-cyan-400/50 text-cyan-100 font-semibold cursor-pointer"
          >
            Redeploy Sector 09
          </button>
        </div>
      )}

      {/* Mobile Touch Controls Overlay */}
      {mobileControls && hud.status === 'playing' && !specsOpen && (
        <>
          {/* Right-half Touch Look Zone */}
          <div
            onTouchStart={handleLookTouchStart}
            onTouchMove={handleLookTouchMove}
            onTouchEnd={handleLookTouchEnd}
            onTouchCancel={handleLookTouchEnd}
            className="absolute top-14 bottom-32 right-0 w-1/2 z-15 touch-none"
            aria-label="Touch drag to aim camera"
          />

          {/* Left Virtual Analog Move Stick */}
          <div
            onTouchStart={handleJoyStart}
            onTouchMove={handleJoyMove}
            onTouchEnd={handleJoyEnd}
            onTouchCancel={handleJoyEnd}
            className="absolute bottom-4 left-4 z-25 w-28 h-28 rounded-full bg-slate-950/70 border-2 border-white/25 flex items-center justify-center touch-none"
          >
            <div
              style={{
                transform: `translate(${joystickUi.dx}px, ${joystickUi.dy}px)`,
              }}
              className="w-12 h-12 rounded-full bg-cyan-400/60 border border-cyan-200/80 shadow-lg pointer-events-none"
            />
          </div>

          {/* Right Action Cluster: Fire, Use Door, Weapon 1/2/3 */}
          <div className="absolute bottom-4 right-4 z-25 flex flex-col items-end gap-2">
            <div className="flex items-center gap-1.5">
              {(['shotgun', 'plasma', 'chaingun'] as const).map((w, idx) => (
                <button
                  key={w}
                  type="button"
                  onTouchStart={(e) => {
                    e.stopPropagation();
                    doomAudio.unlock();
                    weaponSwapRef.current = w;
                  }}
                  onClick={() => {
                    doomAudio.unlock();
                    weaponSwapRef.current = w;
                  }}
                  className={`min-w-[44px] h-10 px-2.5 rounded-lg border font-mono-tabular font-semibold cursor-pointer ${
                    hud.weapon === w
                      ? 'bg-amber-500/35 border-amber-300 text-amber-100'
                      : 'bg-slate-950/80 border-white/20 text-slate-200'
                  }`}
                >
                  {idx + 1}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onTouchStart={(e) => {
                  e.stopPropagation();
                  doomAudio.unlock();
                  useRequestedRef.current = true;
                }}
                onClick={() => {
                  doomAudio.unlock();
                  useRequestedRef.current = true;
                }}
                className="min-w-[52px] h-12 px-3 rounded-xl bg-slate-950/85 border border-cyan-400/45 text-cyan-100 font-semibold cursor-pointer"
              >
                USE
              </button>

              <button
                type="button"
                onTouchStart={(e) => {
                  e.stopPropagation();
                  doomAudio.unlock();
                  fireRequestedRef.current = true;
                }}
                onTouchEnd={(e) => {
                  e.stopPropagation();
                  fireRequestedRef.current = false;
                }}
                onMouseDown={() => {
                  doomAudio.unlock();
                  fireRequestedRef.current = true;
                }}
                onMouseUp={() => {
                  fireRequestedRef.current = false;
                }}
                className="w-16 h-16 rounded-full bg-rose-600/80 active:bg-rose-500 border-2 border-rose-300 text-white font-display font-bold text-sm shadow-lg cursor-pointer"
              >
                FIRE
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
