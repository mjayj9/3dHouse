// 사막 지하 방공호 3D 모형 (단위: m, 1칸 = 실제 1m)
// x: 가로 16m (왼쪽 → 오른쪽), z: 세로 11m (안쪽 → 앞쪽), y: 높이
// buildBunker(THREE) 는 모형 전체를 만들어 돌려준다.

export const ROOM_H = 2.6;      // 방 높이
export const LID_T = 0.3;       // 지면 판 두께

// 같은 무늬가 매번 나오도록 고정된 난수
function makeRng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildBunker(THREE) {
  const rng = makeRng(20261125);
  const H = ROOM_H;

  // ---------- 질감 ----------
  function noiseTex(base, dots, n, strata = false) {
    const size = 512;
    const c = document.createElement('canvas'); c.width = c.height = size;
    const g = c.getContext('2d');
    g.fillStyle = base; g.fillRect(0, 0, size, size);
    if (strata) {
      for (let y = 0; y < size; y += 26 + rng() * 30) {
        g.fillStyle = 'rgba(120,85,40,0.13)';
        g.fillRect(0, y, size, 6 + rng() * 8);
      }
    }
    for (let i = 0; i < n; i++) {
      g.fillStyle = dots[Math.floor(rng() * dots.length)];
      g.fillRect(rng() * size, rng() * size, 1.6, 1.6);
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }
  const sandTex = noiseTex('#e3c48e', ['#cfa86a', '#f1dcae', '#c39a5b', '#ecd3a0'], 26000);
  sandTex.repeat.set(3, 2);
  const soilTex = noiseTex('#d2ac72', ['#b98f55', '#e0c08c', '#a87e45'], 14000, true);
  soilTex.repeat.set(2, 1);
  const kraftTex = noiseTex('#b99467', ['#a9845a', '#c6a275', '#9e7a50'], 9000);
  kraftTex.repeat.set(2, 2);

  const M = {
    board: new THREE.MeshStandardMaterial({ name: '벽', color: 0xf7f5ef, roughness: 0.92 }),
    floor: new THREE.MeshStandardMaterial({ name: '바닥', color: 0xe8dcc4, roughness: 0.95 }),
    furn:  new THREE.MeshStandardMaterial({ name: '가구', color: 0xffffff, roughness: 0.85 }),
    furn2: new THREE.MeshStandardMaterial({ name: '가구2', color: 0xe4e0d6, roughness: 0.85 }),
    sand:  new THREE.MeshStandardMaterial({ name: '모래', map: sandTex, roughness: 1.0 }),
    soil:  new THREE.MeshStandardMaterial({ name: '흙', map: soilTex, roughness: 1.0 }),
    kraft: new THREE.MeshStandardMaterial({ name: '골판지', map: kraftTex, roughness: 1.0 }),
    red:   new THREE.MeshStandardMaterial({ name: '방폭문', color: 0xc8442f, roughness: 0.6 }),
    blue:  new THREE.MeshStandardMaterial({ name: '물', color: 0x9fc3e0, roughness: 0.5 }),
    batt:  new THREE.MeshStandardMaterial({ name: '배터리', color: 0x6f93b8, roughness: 0.6 }),
    leaf:  new THREE.MeshStandardMaterial({ name: '채소', color: 0x86b85a, roughness: 0.8 }),
    panel: new THREE.MeshStandardMaterial({ name: '태양광', color: 0x24406a, roughness: 0.25, metalness: 0.35 }),
    frame: new THREE.MeshStandardMaterial({ name: '금속', color: 0xd9d9d9, roughness: 0.4, metalness: 0.5 }),
    dark:  new THREE.MeshStandardMaterial({ name: '어두운색', color: 0x2f2d2a, roughness: 0.9 }),
    acryl: new THREE.MeshStandardMaterial({ name: '채광관 돔', color: 0xfff6d8, roughness: 0.1, transparent: true, opacity: 0.8 }),
    cactus:new THREE.MeshStandardMaterial({ name: '선인장', color: 0x5f8f45, roughness: 0.8 }),
    person:new THREE.MeshStandardMaterial({ name: '사람', color: 0x9a968c, roughness: 0.9 }),
    glow:  new THREE.MeshBasicMaterial({ name: '빛', color: 0xffd860, transparent: true, opacity: 0.55 }),
    glowC: new THREE.MeshBasicMaterial({ name: '빛 중심', color: 0xf2b134 }),
  };

  const root = new THREE.Group(); root.name = '사막 지하 방공호';
  const base = new THREE.Group(); base.name = '지하층';
  const lid = new THREE.Group(); lid.name = '지면 판';
  const glow = new THREE.Group(); glow.name = '채광관 빛';
  const edges = new THREE.Group(); edges.name = '윤곽선';
  root.add(base, lid, glow, edges);
  const edgeMat = new THREE.LineBasicMaterial({ color: 0x8f8a7f });

  function mesh(geo, mat, parent, name) {
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = true; m.receiveShadow = true;
    if (name) m.name = name;
    parent.add(m);
    return m;
  }
  function box(x0, x1, y0, y1, z0, z1, mat, parent = base, name, withEdge = true) {
    const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0);
    const m = mesh(g, mat, parent, name);
    m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    if (withEdge && parent === base && mat !== M.soil && mat !== M.kraft) {
      const e = new THREE.LineSegments(new THREE.EdgesGeometry(g), edgeMat);
      e.position.copy(m.position); edges.add(e);
    }
    return m;
  }
  function cyl(x, z, r, y0, h, mat, seg = 32, parent = base, name) {
    const m = mesh(new THREE.CylinderGeometry(r, r, h, seg), mat, parent, name);
    m.position.set(x, y0 + h / 2, z);
    return m;
  }

  // ---------- 바닥판(골판지) · 바닥 ----------
  box(-1.6, 17.6, -0.22, 0, -1.6, 12.6, M.kraft, base, '바닥판');
  box(0, 16, 0, 0.08, 0, 11, M.floor, base, '바닥');

  // ---------- 벽 ----------
  const OUT = 0.4, IN = 0.2, SK = 0.06;
  box(0, 16, 0, H, 0, OUT, M.board, base, '바깥 벽');
  box(0, 16, 0, H, 11 - OUT, 11, M.board, base, '바깥 벽');
  box(0, OUT, 0, H, OUT, 11 - OUT, M.board, base, '바깥 벽');
  box(16 - OUT, 16, 0, H, OUT, 11 - OUT, M.board, base, '바깥 벽');
  box(-SK, 16 + SK, 0, H, -SK, 0, M.soil, base, '흙 단면');
  box(-SK, 16 + SK, 0, H, 11, 11 + SK, M.soil, base, '흙 단면');
  box(-SK, 0, 0, H, 0, 11, M.soil, base, '흙 단면');
  box(16, 16 + SK, 0, H, 0, 11, M.soil, base, '흙 단면');

  function wallX(z, xa, xb, gaps = []) {
    let cur = xa;
    for (const [g0, g1] of gaps.slice().sort((a, b) => a[0] - b[0])) {
      if (g0 > cur) box(cur, g0, 0, H, z - IN / 2, z + IN / 2, M.board, base, '안쪽 벽');
      cur = g1;
    }
    if (cur < xb) box(cur, xb, 0, H, z - IN / 2, z + IN / 2, M.board, base, '안쪽 벽');
  }
  function wallZ(x, za, zb, gaps = []) {
    let cur = za;
    for (const [g0, g1] of gaps.slice().sort((a, b) => a[0] - b[0])) {
      if (g0 > cur) box(x - IN / 2, x + IN / 2, 0, H, cur, g0, M.board, base, '안쪽 벽');
      cur = g1;
    }
    if (cur < zb) box(x - IN / 2, x + IN / 2, 0, H, cur, zb, M.board, base, '안쪽 벽');
  }
  wallZ(4, OUT, 6 - IN / 2);
  wallZ(10, OUT, 6 - IN / 2, [[1.8, 2.7]]);
  wallX(3.5, OUT, 4 - IN / 2, [[0.55, 1.55]]);
  wallX(3.5, 10 + IN / 2, 16 - OUT);
  wallX(6, OUT, 16 - OUT, [[2.55, 3.55], [5.0, 7.2], [11.0, 11.9]]);
  wallX(7.5, OUT, 16 - OUT, [[2.95, 3.8], [4.2, 5.0], [7.7, 8.5], [10.4, 11.3], [12.2, 13.0]]);
  wallZ(14.5, 6 + IN / 2, 7.5 - IN / 2, [[6.25, 7.25]]);
  for (const x of [4, 7.5, 10, 12]) wallZ(x, 7.5 + IN / 2, 11 - OUT);

  // 방폭문 3개 (열린 상태)
  box(0.55, 0.62, 0.08, 2.1, 3.6, 4.55, M.red, base, '방폭문');
  box(3.48, 3.55, 0.08, 2.1, 5.05, 5.9, M.red, base, '방폭문');
  box(13.55, 14.4, 0.08, 2.1, 7.18, 7.25, M.red, base, '방폭문');

  // ---------- 계단실 (U자 계단) ----------
  const stepH = H / 15;
  let h = 0;
  for (let i = 0; i < 6; i++) { h += stepH; box(1.6 + i * 0.225, 1.6 + (i + 1) * 0.225, 0, h, 2.0, 3.4, M.furn, base, '계단'); }
  h += stepH; box(2.95, 3.9, 0, h, 0.4, 3.4, M.furn, base, '계단참');
  for (let i = 0; i < 8; i++) { h += stepH; box(2.95 - (i + 1) * 0.29, 2.95 - i * 0.29, 0, Math.min(h, H), 0.4, 1.8, M.furn, base, '계단'); }
  box(1.6, 2.95, 0, H * 0.55, 1.8, 2.0, M.furn2, base, '계단 칸막이');

  // ---------- 가구 · 설비 ----------
  box(0.5, 1.9, 0.08, 1.6, 5.0, 5.8, M.furn2, base, '공기 필터');
  box(4.6, 7.6, 0.08, 0.95, 0.5, 1.1, M.furn, base, '주방');
  box(5.1, 6.7, 0.7, 0.78, 2.6, 3.6, M.furn, base, '식탁');
  for (const [lx, lz] of [[5.18, 2.68], [6.62, 2.68], [5.18, 3.52], [6.62, 3.52]]) box(lx - 0.05, lx + 0.05, 0.08, 0.7, lz - 0.05, lz + 0.05, M.furn, base, '식탁 다리', false);
  for (const [cx, cz] of [[5.5, 2.35], [6.3, 2.35], [5.5, 3.85], [6.3, 3.85]]) box(cx - 0.2, cx + 0.2, 0.08, 0.48, cz - 0.16, cz + 0.16, M.furn2, base, '의자');
  box(9.15, 9.8, 0.08, 0.48, 2.8, 5.2, M.furn2, base, '소파'); box(9.6, 9.8, 0.08, 0.95, 2.8, 5.2, M.furn2, base, '소파 등받이');
  box(8.0, 8.7, 0.08, 0.42, 3.5, 4.5, M.furn, base, '탁자');
  box(10.4, 12.4, 0.08, 2.0, 0.5, 1.1, M.furn2, base, '옷장');
  box(13.6, 15.4, 0.08, 0.5, 0.55, 2.6, M.furn, base, '안방 침대'); box(13.6, 15.4, 0.08, 1.0, 0.5, 0.62, M.furn2, base, '안방 침대');
  box(10.3, 12.3, 0.08, 0.5, 3.75, 4.65, M.furn, base, '아이 방 침대'); box(10.3, 10.38, 0.08, 0.9, 3.75, 4.65, M.furn2, base, '아이 방 침대');
  box(13.4, 15.4, 0.08, 0.5, 3.75, 4.65, M.furn, base, '아이 방 침대'); box(15.32, 15.4, 0.08, 0.9, 3.75, 4.65, M.furn2, base, '아이 방 침대');
  box(13.8, 15.4, 0.08, 0.78, 5.15, 5.75, M.furn, base, '책상');
  for (let i = 0; i < 4; i++) box(0.55, 1.45, 0.08, 1.25, 7.95 + i * 0.6, 8.45 + i * 0.6, M.batt, base, '배터리');
  cyl(2.05, 9.85, 0.32, 0.08, 0.8, M.blue, 32, base, '우물');
  box(2.65, 3.75, 0.08, 1.8, 9.2, 10.45, M.furn2, base, '환기 장치');
  cyl(5.35, 9.6, 0.9, 0.08, 2.2, M.blue, 48, base, '물탱크');
  box(6.65, 7.3, 0.08, 1.4, 8.75, 10.45, M.furn2, base, '정화 장치');
  box(7.75, 8.75, 0.08, 0.16, 9.5, 10.45, M.furn2, base, '샤워');
  box(9.15, 9.55, 0.08, 0.45, 9.85, 10.4, M.furn, base, '변기');
  box(9.25, 9.75, 0.08, 0.85, 7.75, 8.35, M.furn, base, '세면대');
  box(10.15, 10.42, 0.08, 2.0, 8.4, 10.45, M.furn2, base, '선반');
  box(11.58, 11.85, 0.08, 2.0, 8.4, 10.45, M.furn2, base, '선반');
  for (let i = 0; i < 3; i++) {
    const z0 = 8.55 + i * 0.68;
    box(12.35, 14.55, 0.08, 0.85, z0, z0 + 0.38, M.furn, base, '수경재배 선반');
    for (let j = 0; j < 6; j++) {
      const s = mesh(new THREE.SphereGeometry(0.16, 16, 12), M.leaf, base, '채소');
      s.position.set(12.55 + j * 0.37, 1.0, z0 + 0.19);
    }
  }
  for (const lx of [14.85, 15.35]) box(lx - 0.03, lx + 0.03, 0.08, H, 7.3, 7.36, M.dark, base, '사다리', false);
  for (let i = 0; i < 9; i++) box(14.85, 15.35, 0.3 + i * 0.27, 0.33 + i * 0.27, 7.3, 7.36, M.dark, base, '사다리', false);

  function person(x, z, hgt = 1.65) {
    cyl(x, z, 0.16, 0.08, hgt - 0.3, M.person, 16, base, '사람');
    const head = mesh(new THREE.SphereGeometry(0.13, 16, 12), M.person, base, '사람');
    head.position.set(x, 0.08 + hgt - 0.15, z);
  }
  person(6.9, 4.4); person(8.4, 4.9, 1.3); person(15.0, 10.2); person(1.6, 6.75, 1.2);

  // ---------- 채광관 (빛이 떨어지는 자리) ----------
  const tubes = [[5.6, 1.9], [8.3, 1.9], [7.4, 4.7], [12.9, 2.1], [12.85, 4.2], [9.5, 6.75], [15.05, 8.95], [15.05, 9.95]];
  for (const [x, z] of tubes) {
    const d = new THREE.Mesh(new THREE.CircleGeometry(0.55, 40), M.glow);
    d.name = '채광관 빛'; d.rotation.x = -Math.PI / 2; d.position.set(x, 0.095, z); glow.add(d);
    const c = new THREE.Mesh(new THREE.CircleGeometry(0.22, 32), M.glowC);
    c.name = '채광관 빛'; c.rotation.x = -Math.PI / 2; c.position.set(x, 0.1, z); glow.add(c);
  }

  // ---------- 지면 판 ----------
  const LT = LID_T;
  function lbox(x0, x1, y0, y1, z0, z1, mat, name) {
    const m = mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), mat, lid, name);
    m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    return m;
  }
  lbox(-SK, 16 + SK, 0, LT, -SK, 11 + SK, M.sand, '모래 지면');
  for (const [dx, dz, sx, sz] of [[2.2, 8.6, 2.6, 1.6], [7.6, 6.9, 2.2, 0.9], [3.2, 4.9, 1.6, 1.1], [15.2, 5.6, 1.0, 1.2]]) {
    const d = mesh(new THREE.SphereGeometry(1, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), M.sand, lid, '모래 언덕');
    d.scale.set(sx, 0.28, sz); d.position.set(dx, LT, dz);
  }
  lbox(0.3, 3.0, LT, LT + 1.05, 0.3, 2.3, M.board, '지상 출입구');
  lbox(0.2, 3.1, LT + 1.05, LT + 1.2, 0.2, 2.4, M.board, '지상 출입구 지붕');
  lbox(1.0, 2.3, LT, LT + 0.9, 2.3, 2.32, M.dark, '출입구 문');
  lbox(14.75, 15.75, LT, LT + 0.35, 6.3, 7.2, M.furn2, '비상구');
  lbox(14.8, 15.7, LT + 0.35, LT + 0.42, 6.35, 7.15, M.red, '비상구 뚜껑');
  {
    const p = mesh(new THREE.CylinderGeometry(0.13, 0.13, 1.3, 20), M.frame, lid, '환기구');
    p.position.set(1.2, LT + 0.65, 9.2);
    const cap = mesh(new THREE.SphereGeometry(0.32, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), M.frame, lid, '환기구 갓');
    cap.position.set(1.2, LT + 1.3, 9.2);
  }
  for (const [x, z] of tubes) {
    const d = mesh(new THREE.SphereGeometry(0.36, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), M.acryl, lid, '채광관 돔');
    d.position.set(x, LT, z);
    const ring = mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.06, 32), M.frame, lid, '채광관 테');
    ring.position.set(x, LT + 0.03, z);
    const rod = mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.9, 20), M.acryl, lid, '채광관');
    rod.position.set(x, -0.45, z);
  }
  function panelRow(x0, n, z, pw = 1.05) {
    for (let i = 0; i < n; i++) {
      const g = new THREE.Group(); g.name = '태양광 패널';
      const p = mesh(new THREE.BoxGeometry(pw - 0.08, 0.05, 0.85), M.panel, g, '패널');
      p.rotation.x = 0.45; p.position.set(0, 0.56, 0);
      const fr = mesh(new THREE.BoxGeometry(pw - 0.04, 0.03, 0.89), M.frame, g, '패널 틀');
      fr.rotation.x = 0.45; fr.position.set(0, 0.53, 0);
      for (const [lx, lz, lh] of [[-0.4, 0.3, 0.38], [0.4, 0.3, 0.38], [-0.4, -0.3, 0.72], [0.4, -0.3, 0.72]]) {
        const leg = mesh(new THREE.CylinderGeometry(0.025, 0.025, lh, 8), M.frame, g, '다리');
        leg.position.set(lx, lh / 2, lz);
      }
      g.position.set(x0 + i * pw + pw / 2, LT, z);
      lid.add(g);
    }
  }
  panelRow(10.3, 2, 1.0); panelRow(13.5, 2, 1.0);
  panelRow(10.3, 5, 3.0, 1.06);
  panelRow(4.3, 9, 8.6, 1.06);
  panelRow(4.3, 9, 10.0, 1.06);
  function cactus(x, z, s = 1) {
    const c = mesh(new THREE.CylinderGeometry(0.12 * s, 0.14 * s, 0.9 * s, 14), M.cactus, lid, '선인장');
    c.position.set(x, LT + 0.45 * s, z);
    const a = mesh(new THREE.CylinderGeometry(0.07 * s, 0.07 * s, 0.38 * s, 10), M.cactus, lid, '선인장');
    a.position.set(x + 0.2 * s, LT + 0.62 * s, z);
  }
  cactus(4.4, 5.9, 1.0); cactus(9.0, 0.9, 0.8); cactus(0.9, 6.8, 0.9);
  lid.position.set(0, H, 0);

  // ---------- 라벨 위치 ----------
  const labelsClosed = [
    ['지상 출입구', 1.65, H + LT + 1.6, 1.3], ['채광관', 8.3, H + LT + 0.9, 1.9], ['태양광 패널', 8.6, H + LT + 1.4, 9.3],
    ['비상구', 15.25, H + LT + 1.0, 6.75], ['환기구', 1.2, H + LT + 2.0, 9.2],
  ];
  const labelsOpen = [
    ['계단실', 2.2, 2.2, 1.7], ['전실', 2.6, 1.0, 4.4], ['거실 · 주방', 7.2, 0.6, 1.8], ['안방', 12.1, 0.6, 2.0],
    ['아이 방', 12.2, 0.6, 5.3], ['복도', 6.2, 0.2, 6.75], ['기계실', 2.1, 1.9, 8.2], ['물탱크', 5.35, 2.4, 9.6],
    ['화장실', 8.7, 0.6, 8.8], ['식량 창고', 11.0, 2.2, 9.4], ['실내 텃밭', 13.4, 1.4, 8.1], ['비상구', 15.1, 2.9, 6.75],
  ];

  return { root, base, lid, glow, edges, labelsClosed, labelsOpen, center: new THREE.Vector3(8, 1.3, 5.5) };
}
