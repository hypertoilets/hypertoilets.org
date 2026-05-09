// hypertoilets — 3D bathroom scene
// 흰 타일로 가득한 네모 공간, 가운데 새하얀 변기 하나.

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

/* ── 연도 자동 갱신 ─────────────────────────────────────────── */
const yr = document.getElementById('yr');
if (yr) yr.textContent = new Date().getFullYear();

/* ── 3D 씬 ─────────────────────────────────────────────────── */
const canvas = document.getElementById('scene');
if (canvas && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  initScene(canvas);
} else if (canvas) {
  initScene(canvas, { still: true });
}

function initScene(canvas, opts = {}) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xfbfaf6);

  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
  camera.position.set(3.4, 2.6, 4.0);
  camera.lookAt(0, 1.05, 0);

  /* ── 라이팅 ──────────────────────────────────────────────── */
  scene.add(new THREE.AmbientLight(0xffffff, 0.55));

  const hemi = new THREE.HemisphereLight(0xffffff, 0xeeece5, 0.45);
  scene.add(hemi);

  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(4.5, 6.5, 4.0);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -3;
  key.shadow.camera.right = 3;
  key.shadow.camera.top = 3;
  key.shadow.camera.bottom = -3;
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 18;
  key.shadow.bias = -0.0005;
  key.shadow.normalBias = 0.02;
  key.shadow.radius = 6;
  scene.add(key);

  const fill = new THREE.DirectionalLight(0xffeed8, 0.45);
  fill.position.set(-4, 3, -2);
  scene.add(fill);

  const rim = new THREE.DirectionalLight(0xe6f0ff, 0.35);
  rim.position.set(-2, 4, -5);
  scene.add(rim);

  /* ── 타일 룸 ─────────────────────────────────────────────── */
  const ROOM = { w: 11, h: 7.5, d: 11 };
  const TILE = 1.0;
  const TILE_SIZE = 0.94;     // 그라우트 갭
  const TILE_DEPTH = 0.22;    // 볼록한 두께
  const TILE_RADIUS = 0.18;   // 모서리 반경 (볼록함)

  const tileGeom = new RoundedBoxGeometry(TILE_SIZE, TILE_SIZE, TILE_DEPTH, 5, TILE_RADIUS);
  const tileMat = new THREE.MeshStandardMaterial({
    color: 0xfbfaf6,
    roughness: 0.42,
    metalness: 0.0,
  });

  // 그라우트 (배경 회색면) — 타일 사이 어두운 라인 효과
  const groutMat = new THREE.MeshStandardMaterial({
    color: 0xe2e0d9,
    roughness: 0.95,
    metalness: 0.0,
  });

  function buildWall(rows, cols, place) {
    // 그라우트 평면
    const grout = new THREE.Mesh(
      new THREE.PlaneGeometry(cols * TILE, rows * TILE),
      groutMat
    );
    grout.receiveShadow = true;
    place(grout, /*isWall=*/true);
    scene.add(grout);

    // 타일 인스턴스
    const mesh = new THREE.InstancedMesh(tileGeom, tileMat, rows * cols);
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    const dummy = new THREE.Object3D();
    let i = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        dummy.position.set(
          (c - (cols - 1) / 2) * TILE,
          (r - (rows - 1) / 2) * TILE,
          TILE_DEPTH * 0.5,                  // 그라우트 면 위로 살짝 튀어나옴
        );
        dummy.updateMatrix();
        mesh.setMatrixAt(i++, dummy.matrix);
      }
    }
    place(mesh, /*isWall=*/false);
    scene.add(mesh);
  }

  // 바닥
  buildWall(ROOM.d, ROOM.w, (m) => {
    m.rotation.x = -Math.PI / 2;
    m.position.y = 0;
  });
  // 천장
  buildWall(ROOM.d, ROOM.w, (m) => {
    m.rotation.x = Math.PI / 2;
    m.position.y = ROOM.h;
  });
  // 뒤쪽 벽 (-Z)
  buildWall(ROOM.h, ROOM.w, (m) => {
    m.position.set(0, ROOM.h / 2, -ROOM.d / 2);
  });
  // 앞쪽 벽 (+Z) — 카메라 뒤편이지만 가림
  buildWall(ROOM.h, ROOM.w, (m) => {
    m.position.set(0, ROOM.h / 2, ROOM.d / 2);
    m.rotation.y = Math.PI;
  });
  // 왼쪽 벽 (-X)
  buildWall(ROOM.h, ROOM.d, (m) => {
    m.position.set(-ROOM.w / 2, ROOM.h / 2, 0);
    m.rotation.y = Math.PI / 2;
  });
  // 오른쪽 벽 (+X)
  buildWall(ROOM.h, ROOM.d, (m) => {
    m.position.set(ROOM.w / 2, ROOM.h / 2, 0);
    m.rotation.y = -Math.PI / 2;
  });

  /* ── 변기 ────────────────────────────────────────────────── */
  const ceramic = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.22,
    metalness: 0.0,
  });
  const ceramicInside = ceramic.clone();
  ceramicInside.side = THREE.DoubleSide;

  const toilet = new THREE.Group();

  // 1. 베이스 (받침)
  const baseGeom = new THREE.CylinderGeometry(0.55, 0.72, 0.6, 36);
  const base = new THREE.Mesh(baseGeom, ceramic);
  base.position.set(0, 0.3, 0.05);
  base.scale.set(1.0, 1.0, 1.18);
  base.castShadow = true;
  base.receiveShadow = true;
  toilet.add(base);

  // 2. 보울 (상단이 잘린 구체 = 그릇 모양)
  const bowlGeom = new THREE.SphereGeometry(
    0.66, 56, 36,
    0, Math.PI * 2,
    Math.PI * 0.42, Math.PI * 0.58
  );
  const bowl = new THREE.Mesh(bowlGeom, ceramicInside);
  bowl.scale.set(1.0, 0.95, 1.28);
  bowl.position.set(0, 1.05, 0.05);
  bowl.castShadow = true;
  bowl.receiveShadow = true;
  toilet.add(bowl);

  // 3. 시트 (타원 링) — 늘린 토러스
  const seatGeom = new THREE.TorusGeometry(0.6, 0.075, 18, 80);
  const seat = new THREE.Mesh(seatGeom, ceramic);
  seat.rotation.x = Math.PI / 2;
  seat.scale.set(1.0, 1.28, 1.0);  // 회전 전 local Y → 회전 후 world Z 늘어남
  seat.position.set(0, 1.36, 0.05);
  seat.castShadow = true;
  toilet.add(seat);

  // 4. 보울 안 물 (납작한 타원 디스크)
  const waterMat = new THREE.MeshStandardMaterial({
    color: 0xe8eef2,
    roughness: 0.12,
    metalness: 0.05,
  });
  const waterGeom = new THREE.CircleGeometry(0.45, 64);
  const water = new THREE.Mesh(waterGeom, waterMat);
  water.rotation.x = -Math.PI / 2;
  water.scale.set(1.0, 1.0, 1.25);
  water.position.set(0, 1.30, 0.05);
  toilet.add(water);

  // 5. 물탱크 (뒤)
  const tankGeom = new RoundedBoxGeometry(1.45, 1.4, 0.55, 6, 0.08);
  const tank = new THREE.Mesh(tankGeom, ceramic);
  tank.position.set(0, 1.7, -0.6);
  tank.castShadow = true;
  tank.receiveShadow = true;
  toilet.add(tank);

  // 6. 탱크 뚜껑
  const lidGeom = new RoundedBoxGeometry(1.55, 0.1, 0.62, 4, 0.045);
  const lid = new THREE.Mesh(lidGeom, ceramic);
  lid.position.set(0, 2.45, -0.6);
  lid.castShadow = true;
  toilet.add(lid);

  // 7. 푸시 버튼
  const btnMat = new THREE.MeshStandardMaterial({
    color: 0xeeece5, roughness: 0.45, metalness: 0.0,
  });
  const btnGeom = new RoundedBoxGeometry(0.36, 0.04, 0.16, 3, 0.02);
  const btn = new THREE.Mesh(btnGeom, btnMat);
  btn.position.set(0, 2.52, -0.6);
  toilet.add(btn);

  scene.add(toilet);

  /* ── 사이즈 / 리사이즈 ───────────────────────────────────── */
  function resize() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (w === 0 || h === 0) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  /* ── 애니메이션 (조용한 카메라 sway) ─────────────────────── */
  const clock = new THREE.Clock();
  const baseAngle = Math.PI * 0.20; // 정면-약간 우측 (~36°)
  const radius = 4.4;

  function tick() {
    const t = clock.getElapsedTime();
    const angle = baseAngle + Math.sin(t * 0.10) * 0.10;
    camera.position.x = Math.sin(angle) * radius;
    camera.position.z = Math.cos(angle) * radius;
    camera.position.y = 2.5 + Math.sin(t * 0.18) * 0.12;
    camera.lookAt(0, 1.05, 0);
    renderer.render(scene, camera);
    if (!opts.still) requestAnimationFrame(tick);
  }

  if (opts.still) {
    // 모션 줄이기 모드: 한 번만 그림
    renderer.render(scene, camera);
  } else {
    requestAnimationFrame(tick);
  }
}
