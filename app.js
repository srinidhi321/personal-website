(() => {
  "use strict";

  const SITE = window.SITE;
  const FACES = SITE.faces;
  const FRONT = [0, 0, -1]; // the page you read: the wall in front of you
  const V3 = THREE.Vector3;
  const Quat = THREE.Quaternion;

  // ------------------------------------------------------------------
  // Cube model, in the cube's own (local) coordinates.
  //
  // There is one model and two renderings of it: the small cube in the
  // middle, and six wall panels around you, which are the same cube blown up
  // and seen from the inside. Each sticker of the small cube is a tile on a
  // panel. Turning the cube turns the panels; twisting a layer twists the
  // matching band of tiles.
  //
  // World: x right, y up, z toward the viewer. The page you are reading is
  // the panel in front of you, parallel to the cube face pointing away (-z).
  // ------------------------------------------------------------------

  const BASIS = {
    F: { n: [0, 0, 1], up: [0, 1, 0] },
    B: { n: [0, 0, -1], up: [0, 1, 0] },
    U: { n: [0, 1, 0], up: [0, 0, -1] },
    D: { n: [0, -1, 0], up: [0, 0, 1] },
    R: { n: [1, 0, 0], up: [0, 1, 0] },
    L: { n: [-1, 0, 0], up: [0, 1, 0] },
  };
  const FACE_KEYS = ["U", "L", "F", "R", "B", "D"];

  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const eq = (a, b) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
  const comb = (...terms) => terms.reduce((acc, [k, v]) => acc.map((x, i) => x + k * v[i]), [0, 0, 0]);
  function V(a) { return new V3(a[0], a[1], a[2]); }

  // Rotate an integer vector by q quarter turns about a local axis (right-hand rule).
  function rot(v, axis, q) {
    let [x, y, z] = v;
    for (let i = 0; i < ((q % 4) + 4) % 4; i++) {
      if (axis === 0) [y, z] = [-z, y];
      else if (axis === 1) [z, x] = [-x, z];
      else [x, y] = [-y, x];
    }
    return [x, y, z];
  }

  let stickers = [];
  let cubies = [];

  function resetModel() {
    stickers = [];
    for (const key of FACE_KEYS) {
      const { n, up } = BASIS[key];
      const rightOut = cross(up, n); // "right" seen from outside the cube
      const rightIn = cross(n, up);  // "right" seen from inside, facing the panel
      for (let i = 0; i < 9; i++) {
        const r = Math.floor(i / 3), c = i % 3;
        const pos = comb([1, n], [c - 1, rightOut], [1 - r, up]);
        // Content cell = reading order on the panel, seen from inside.
        const cell = (1 - dot(pos, up)) * 3 + dot(pos, rightIn) + 1;
        stickers.push({ id: key + i, home: key, cell, pos, n: [...n], up: [...up], pos0: pos, n0: n, up0: up });
      }
    }
    cubies = [];
    for (let x = -1; x <= 1; x++)
      for (let y = -1; y <= 1; y++)
        for (let z = -1; z <= 1; z++)
          if (x || y || z) cubies.push({ pos: [x, y, z] });
  }

  const inLayer = (op, pos) => pos[op.axis] === op.layer;
  function applyOp(op) {
    for (const s of stickers) {
      if (!inLayer(op, s.pos)) continue;
      s.pos = rot(s.pos, op.axis, op.q);
      s.n = rot(s.n, op.axis, op.q);
      s.up = rot(s.up, op.axis, op.q);
    }
    for (const c of cubies) if (inLayer(op, c.pos)) c.pos = rot(c.pos, op.axis, op.q);
  }

  const isCenter = (s) => s.cell === 4;
  const centerOf = (home) => stickers.find((s) => s.home === home && isCenter(s));
  const centerOnFace = (n) => stickers.find((s) => isCenter(s) && eq(s.n, n));

  // ------------------------------------------------------------------
  // Orientation (a quaternion, local -> world), shared by cube and panels
  // ------------------------------------------------------------------

  const AXES = [new V3(1, 0, 0), new V3(0, 1, 0), new V3(0, 0, 1)];
  const quarter = (axis, q) => new Quat().setFromAxisAngle(AXES[axis], (q * Math.PI) / 2);
  const applyQ = (q, v) => {
    const w = V(v).applyQuaternion(q);
    return [Math.round(w.x) || 0, Math.round(w.y) || 0, Math.round(w.z) || 0];
  };
  const ORIENTS = (() => {
    const out = [new Quat()];
    for (let i = 0; i < out.length; i++) {
      for (const g of [quarter(0, 1), quarter(1, 1), quarter(2, 1)]) {
        const c = g.clone().multiply(out[i]);
        if (!out.some((o) => Math.abs(o.dot(c)) > 0.999)) out.push(c);
      }
    }
    return out;
  })();
  // Tiles not in their home spot, position and rotation both, allowing for the
  // cube as a whole being held any way round. Zero means truly solved: every
  // page whole and every tile reading the right way up.
  function misplacedCount() {
    let best = stickers.length;
    for (const o of ORIENTS) {
      let bad = 0;
      for (const s of stickers) {
        if (!eq(applyQ(o, s.pos0), s.pos) || !eq(applyQ(o, s.n0), s.n) || !eq(applyQ(o, s.up0), s.up)) bad++;
        if (bad >= best) break;
      }
      best = Math.min(best, bad);
    }
    return best;
  }
  const nearestOrient = (q) => ORIENTS.reduce((a, o) => (Math.abs(o.dot(q)) > Math.abs(a.dot(q)) ? o : a));

  // The orientation that puts a page in front of you, reading upright.
  function uprightFor(home) {
    const c = centerOf(home);
    return ORIENTS.find((o) => eq(applyQ(o, c.n), FRONT) && eq(applyQ(o, c.up), [0, 1, 0])).clone();
  }
  // Which page sits in a world direction under orientation q (works mid-drag).
  function pageToward(q, worldDir) {
    let best = null, bestD = -Infinity;
    for (const s of stickers) {
      if (!isCenter(s)) continue;
      const w = V(s.n).applyQuaternion(q);
      const d = w.x * worldDir[0] + w.y * worldDir[1] + w.z * worldDir[2];
      if (d > bestD) { bestD = d; best = s.home; }
    }
    return best;
  }

  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let qView = new Quat();   // current orientation (animated, or mid-drag)
  let qTarget = new Quat(); // where it is heading
  let turnAnim = null;

  function turnTo(target, dur = 520) {
    qTarget = target;
    turnAnim = { from: qView.clone(), to: target.clone(), t0: performance.now(), dur: reduceMotion ? 1 : dur };
  }
  const DIRS = { up: [0, 1, 0], down: [0, -1, 0], left: [-1, 0, 0], right: [1, 0, 0], flip: FRONT.map((v) => -v || 0) };
  function navigate(where) {
    turnTo(uprightFor(pageToward(qTarget, DIRS[where])), where === "flip" ? 800 : 600);
  }
  const goToPage = (home) => turnTo(uprightFor(home), 700);

  // Once the cube is solved, settle so the page in front reads upright again
  // (twists can leave the page you are facing turned on its side).
  function settleIfSolved() {
    if (misplacedCount() !== 0 || drag) return;
    const target = uprightFor(pageToward(qTarget, FRONT));
    if (Math.abs(target.dot(qTarget)) < 0.999) turnTo(target, 700);
  }

  // ------------------------------------------------------------------
  // Twists
  // ------------------------------------------------------------------

  let chain = Promise.resolve();
  let history = [];
  function twist(op, { record = true, dur = 340 } = {}) {
    if (record) history.push(op);
    chain = chain.then(async () => {
      await animateLayer(op, reduceMotion ? 1 : dur);
      applyOp(op);
      sync3d();
      refreshChrome();
      settleIfSolved();
    });
  }
  // Twist the layer that currently faces a world direction, clockwise as seen from there.
  function twistToward(worldDir, dir) {
    const d = applyQ(qTarget.clone().invert(), worldDir);
    const axis = d.findIndex((v) => v !== 0);
    twist({ axis, layer: d[axis], q: -dir * d[axis] });
  }
  function undo() {
    const op = history.pop();
    if (op) twist({ ...op, q: -op.q }, { record: false });
  }
  function solve() {
    const ops = history.reverse();
    history = [];
    for (const op of ops) twist({ ...op, q: -op.q }, { record: false, dur: 120 });
  }
  function scramble(n = 20) {
    let prev = "";
    for (let i = 0; i < n; i++) {
      let op;
      do op = { axis: Math.floor(Math.random() * 3), layer: Math.random() < 0.5 ? 1 : -1, q: Math.random() < 0.5 ? 1 : -1 };
      while (op.axis + "," + op.layer === prev);
      prev = op.axis + "," + op.layer;
      twist(op, { dur: 120 });
    }
  }

  // ------------------------------------------------------------------
  // Scene
  //
  // Six floating panels (the big inside-out cube) around a small cube, all
  // inside an endless coordinate lattice. Panels are thin slabs that never
  // touch: each sits at distance D from the center but is only 2W wide.
  // ------------------------------------------------------------------

  const D = 6;               // distance from the center to each panel
  const W = 3.4;             // panel half-size (W < D, so panels don't meet)
  const U = (2 * W) / 3;     // tile size on a panel
  const SLAB = 0.06;         // panel thickness
  const GAP = 0.03;          // hairline gap between tiles
  const RIM = 0.03;          // slab border around the tiles

  const P = {
    bg: "#f5f4ef",
    slab: "#e7e4db",
    tile: "#fcfbf8",
    line: "rgba(20,20,19,0.10)",
    ink: "#141413",
    muted: "#5e5d59",
    faint: "#8f8d86",
    grid: 0x141413,
  };
  // Mix two #rrggbb colours: t = 0 gives a, t = 1 gives b.
  function mix(a, b, t) {
    const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
    const ch = (sh) => Math.round(((pa >> sh) & 255) * (1 - t) + ((pb >> sh) & 255) * t);
    return "#" + ((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1);
  }
  const TINT = 0.13;        // how strongly a tile takes its page's colour
  const CENTER_TINT = 0.45; // the page-title tile in the middle, stronger

  const canvas = document.getElementById("room");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setClearColor(P.bg);
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(P.bg, 15, 62);
  const camera = new THREE.PerspectiveCamera(50, 1, 0.05, 300);
  scene.add(new THREE.AmbientLight(0xffffff, 0.75));
  const sun = new THREE.DirectionalLight(0xffffff, 0.5);
  sun.position.set(3, 6, 8);
  scene.add(sun);

  const room = new THREE.Group();
  const cubeGroup = new THREE.Group();
  scene.add(room, cubeGroup);
  let TEX = 512;   // texture pixels per tile side

  // An endless coordinate lattice: axis-parallel lines and points every
  // STEP units, fading into the fog. It belongs to the cube, so it turns with it.
  (function buildLattice() {
    const R = 56, STEP = 4, INNER = 7.5;
    const vals = [];
    for (let v = -R; v <= R; v += STEP) vals.push(v);
    const lines = [], points = [];
    for (let axis = 0; axis < 3; axis++) {
      const [i, j] = [0, 1, 2].filter((k) => k !== axis);
      for (const a of vals) for (const b of vals) {
        if (Math.abs(a) < INNER && Math.abs(b) < INNER) continue; // keep the middle clear
        const p = [0, 0, 0], q = [0, 0, 0];
        p[i] = q[i] = a;
        p[j] = q[j] = b;
        p[axis] = -R;
        q[axis] = R;
        lines.push(...p, ...q);
      }
    }
    for (const x of vals) for (const y of vals) for (const z of vals)
      if (Math.max(Math.abs(x), Math.abs(y), Math.abs(z)) >= INNER) points.push(x, y, z);

    const lg = new THREE.BufferGeometry();
    lg.setAttribute("position", new THREE.Float32BufferAttribute(lines, 3));
    room.add(new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: P.grid, transparent: true, opacity: 0.07 })));
    const pg = new THREE.BufferGeometry();
    pg.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
    room.add(new THREE.Points(pg, new THREE.PointsMaterial({ color: P.grid, size: 0.045, transparent: true, opacity: 0.35 })));

    // The cube's own three axes, slightly brighter, running off to infinity
    // from just behind each panel.
    const ax = [];
    const start = D + 0.2;
    for (const n of Object.values(BASIS).map((b) => b.n)) ax.push(...n.map((v) => v * start), ...n.map((v) => v * R * 2));
    const ag = new THREE.BufferGeometry();
    ag.setAttribute("position", new THREE.Float32BufferAttribute(ax, 3));
    room.add(new THREE.LineSegments(ag, new THREE.LineBasicMaterial({ color: P.grid, transparent: true, opacity: 0.16 })));
  })();

  // One slab per face direction. Slabs stay put; tiles move between them.
  const slabGeo = new THREE.BoxGeometry(2 * (W + RIM), 2 * (W + RIM), SLAB);
  const slabs = FACE_KEYS.map((k) => {
    const n = BASIS[k].n;
    const m = new THREE.Mesh(slabGeo, new THREE.MeshBasicMaterial({ color: P.slab, transparent: true }));
    m.position.copy(V(n).multiplyScalar(D + SLAB / 2));
    m.lookAt(V(n).multiplyScalar(2 * D)); // thin axis along the normal
    m.userData.n = n;
    return m;
  });
  // A hairline frame around each slab.
  const frameGeo = new THREE.EdgesGeometry(new THREE.PlaneGeometry(2 * (W + RIM), 2 * (W + RIM)));
  for (const sl of slabs) {
    const f = new THREE.LineSegments(frameGeo, new THREE.LineBasicMaterial({ color: P.grid, transparent: true, opacity: 0.18 }));
    f.position.z = -SLAB / 2 - 0.002;
    sl.add(f);
    sl.userData.frame = f;
  }

  // Layout. On wide screens the square panel takes nearly the full height and
  // the controls live in the bands either side of it. On narrow screens the
  // square takes the full width, with the controls above and below.
  // The page's CSS reads the square's size and position from custom properties.
  const RAIL_MIN = 230;
  function layout() {
    const vw = innerWidth, vh = innerHeight;
    const rails = vw - Math.min(vh - 40, vw) >= 2 * RAIL_MIN && vw >= 900;
    let size, top;
    if (rails) {
      size = Math.min(vh - 40, vw - 2 * RAIL_MIN);
      top = (vh - size) / 2;
    } else {
      const head = 92, foot = 150;
      size = Math.min(vw - 20, vh - head - foot);
      top = head + (vh - head - foot - size) / 2;
    }
    document.body.classList.toggle("rails", rails);
    const root = document.documentElement.style;
    root.setProperty("--sq", size + "px");
    root.setProperty("--sq-top", top + "px");
    root.setProperty("--sq-left", (vw - size) / 2 + "px");
    return { vw, vh, size, top };
  }

  // The camera floats between you and the cube, a little above and to the
  // right, but looks straight ahead (a shift lens, as in architectural
  // photography): the panel stays a true square, while the small cube on the
  // sight line still shows a sliver of its top and side.
  function placeCamera() {
    const { vw, vh, size, top } = layout();
    const aspect = vw / vh;
    const camZ = aspect < 1 ? 0.9 * D : 0.65 * D;
    const cam = new V3(0.14 * D, 0.11 * D, camZ);
    const wall = new V3(0, 0, -D);
    const dist = camZ + D;
    camera.position.copy(cam);
    camera.rotation.set(0, 0, 0);
    const t = camZ / dist;
    cubeGroup.position.copy(cam.clone().lerp(wall, t));
    cubeGroup.scale.setScalar((0.2 * U * t) / 3); // a fifth of a tile

    // Fit the panel (with its rim) to the square's pixel size.
    const tanV = ((W + RIM) / dist) * (vh / size);
    camera.fov = (2 * Math.atan(tanV) * 180) / Math.PI;
    camera.aspect = aspect;
    // Shift the lens so the panel's centre lands on the square's centre.
    const nx = -cam.x / (dist * tanV * aspect), ny = -cam.y / (dist * tanV);
    const centerShift = top + size / 2 - vh / 2;
    camera.setViewOffset(vw, vh, (nx * vw) / 2, (-ny * vh) / 2 - centerShift, vw, vh);
    camera.updateProjectionMatrix();
    renderer.setSize(vw, vh, false);

    // Texture resolution: about one texel per screen pixel on a tile.
    const tilePx = (size / 3) * Math.min(devicePixelRatio, 2);
    TEX = Math.min(768, Math.max(256, Math.round(tilePx / 64) * 64));
  }
  let resizeTimer = 0;
  addEventListener("resize", () => {
    const before = TEX;
    placeCamera();
    clearTimeout(resizeTimer);
    if (before !== TEX) resizeTimer = setTimeout(paintTiles, 150);
  });

  // ---------- textures ----------

  const SERIF = "'Source Serif 4', Georgia, serif";
  const SANS = "Inter, system-ui, sans-serif";
  const MONO = "'JetBrains Mono', ui-monospace, monospace";

  function tileContent(s) {
    const f = FACES[s.home];
    if (isCenter(s)) return { t: f.name, b: f.tagline };
    return f.tiles[s.cell < 4 ? s.cell : s.cell - 1];
  }
  const tileNumber = (s) => String(s.cell < 4 ? s.cell + 1 : s.cell).padStart(2, "0");

  function wrap(g, text, maxW, maxLines) {
    const lines = [];
    let line = "";
    for (const w of String(text).split(/\s+/)) {
      const next = line ? line + " " + w : w;
      if (g.measureText(next).width <= maxW || !line) line = next;
      else { lines.push(line); line = w; }
    }
    if (line) lines.push(line);
    if (lines.length > maxLines) {
      lines.length = maxLines;
      lines[maxLines - 1] = lines[maxLines - 1].replace(/\s*\S*$/, "") + "…";
    }
    return lines;
  }
  function spaced(g, px) { if ("letterSpacing" in g) g.letterSpacing = px + "px"; }

  // Draw a tile, in a 512 x 512 coordinate space.
  function wallTexture(s) {
    const w = 512, h = 512;
    const k = TEX / 512;
    const cv = document.createElement("canvas");
    cv.width = cv.height = TEX;
    const g = cv.getContext("2d");
    g.scale(k, k);
    const f = FACES[s.home];
    // Each tile carries a light wash of its own page's colour, so a solved
    // page reads as one colour and a scrambled one as a patchwork. The
    // page-title tile in the middle takes a stronger wash.
    g.fillStyle = mix(P.tile, f.cube, isCenter(s) ? CENTER_TINT : TINT);
    g.fillRect(0, 0, w, h);
    g.strokeStyle = P.line;
    g.lineWidth = 2;
    g.strokeRect(1, 1, w - 2, h - 2);

    // Label row: colour swatch, page name, tile number.
    g.fillStyle = f.cube;
    g.fillRect(40, 44, 12, 12);
    g.font = `500 19px ${MONO}`;
    spaced(g, 2);
    g.fillStyle = P.faint;
    g.textBaseline = "middle";
    const label = isCenter(s) ? f.name.toUpperCase() : `${f.name.toUpperCase()} / ${tileNumber(s)}`;
    g.fillText(label, 64, 51);
    spaced(g, 0);
    g.textBaseline = "alphabetic";

    if (isCenter(s)) {
      // The page title. The small cube floats in front of the middle of this tile.
      const ty = h * 0.3;
      g.fillStyle = P.ink;
      g.textAlign = "center";
      g.font = `400 76px ${SERIF}`;
      g.fillText(f.name, w / 2, ty);
      g.fillRect(w / 2 - 24, ty + 28, 48, 2);
      g.fillStyle = P.ink;
      g.globalAlpha = 0.7;
      g.font = `400 21px ${MONO}`;
      spaced(g, 1);
      g.fillText(f.tagline.toUpperCase(), w / 2, h - 52);
      g.globalAlpha = 1;
      spaced(g, 0);
    } else {
      const c = tileContent(s);
      const maxW = w - 80;
      // The first tile of each page leads, in larger type.
      const lead = s.cell === 0;
      g.fillStyle = P.ink;
      g.font = `400 ${lead ? 66 : 54}px ${SERIF}`;
      let y = lead ? 160 : 150;
      for (const line of wrap(g, c.t, maxW, 2)) { g.fillText(line, 40, y); y += lead ? 72 : 62; }
      y += 12;
      g.fillStyle = P.muted;
      g.font = `400 31px ${SANS}`;
      const space = (h - (c.href ? 84 : 40)) - y;
      for (const line of wrap(g, c.b, maxW, Math.max(1, Math.floor(space / 44) + 1))) { g.fillText(line, 40, y); y += 44; }
      if (c.href) {
        const text = (c.link || "open").toUpperCase() + " ↗";
        g.font = `500 18px ${MONO}`;
        spaced(g, 2);
        g.fillStyle = P.ink;
        g.fillText(text, 40, h - 46);
        g.fillStyle = f.cube;
        g.fillRect(40, h - 36, g.measureText(text).width, 2);
        spaced(g, 0);
      }
    }
    const tex = new THREE.CanvasTexture(cv);
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    tex.generateMipmaps = false;
    tex.minFilter = THREE.LinearFilter;
    return tex;
  }
  function stickerTexture(s) {
    const cv = document.createElement("canvas");
    cv.width = cv.height = 64;
    const g = cv.getContext("2d");
    g.fillStyle = FACES[s.home].cube;
    g.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(cv);
  }

  // ---------- meshes ----------

  const cubieGeo = new THREE.BoxGeometry(0.96, 0.96, 0.96);
  const cubieMat = new THREE.MeshLambertMaterial({ color: 0x1f1e1c });
  const stickerGeo = new THREE.PlaneGeometry(0.82, 0.82);
  const tileGeo = new THREE.PlaneGeometry(U - GAP, U - GAP);
  let cubieMeshes = [], stickerMeshes = [], tileMeshes = [];

  function build3d() {
    tileMeshes = stickers.map(() => new THREE.Mesh(tileGeo, new THREE.MeshBasicMaterial({ transparent: true })));
    cubieMeshes = cubies.map(() => new THREE.Mesh(cubieGeo, cubieMat));
    stickerMeshes = stickers.map(() => new THREE.Mesh(stickerGeo, new THREE.MeshLambertMaterial()));
    cubeGroup.add(...cubieMeshes, ...stickerMeshes);
    room.add(...slabs, ...tileMeshes);
    paint();
    sync3d();
  }
  function setMap(mesh, tex) {
    if (mesh.material.map) mesh.material.map.dispose();
    mesh.material.map = tex;
    mesh.material.needsUpdate = true;
  }
  function paintTiles() {
    stickers.forEach((s, i) => setMap(tileMeshes[i], wallTexture(s)));
  }
  function paint() {
    stickers.forEach((s, i) => setMap(stickerMeshes[i], stickerTexture(s)));
    paintTiles();
  }

  const basisM = new THREE.Matrix4();
  function sync3d() {
    stickers.forEach((s, i) => {
      const tm = tileMeshes[i], sm = stickerMeshes[i];
      sm.userData.sticker = tm.userData.sticker = s;
      // Small cube: the sticker faces outward.
      sm.position.copy(V(comb([1, s.pos], [0.49, s.n])));
      basisM.makeBasis(V(cross(s.up, s.n)), V(s.up), V(s.n));
      sm.quaternion.setFromRotationMatrix(basisM);
      // Panels: the same sticker, scaled up, pushed out to its panel, facing inward.
      tm.position.copy(V(comb([U, s.pos], [D - U - 0.01, s.n])));
      basisM.makeBasis(V(cross(s.n, s.up)), V(s.up), V(s.n.map((v) => -v)));
      tm.quaternion.setFromRotationMatrix(basisM);
    });
    cubies.forEach((c, i) => cubieMeshes[i].position.copy(V(c.pos)));
    // Each panel's rim takes a wash of the page it shows.
    for (const sl of slabs) sl.material.color.set(mix(P.slab, FACES[centerOnFace(sl.userData.n).home].cube, 0.35));
  }

  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  function animateLayer(op, dur) {
    return new Promise((resolve) => {
      // The same layer turns in two places: the small cube and the panels.
      const pivots = [new THREE.Group(), new THREE.Group()];
      cubeGroup.add(pivots[0]);
      room.add(pivots[1]);
      stickers.forEach((s, i) => {
        if (!inLayer(op, s.pos)) return;
        pivots[0].add(stickerMeshes[i]);
        pivots[1].add(tileMeshes[i]);
      });
      cubies.forEach((c, i) => inLayer(op, c.pos) && pivots[0].add(cubieMeshes[i]));
      const prop = "xyz"[op.axis];
      const target = (op.q * Math.PI) / 2;
      const t0 = performance.now();
      (function step(now) {
        const k = Math.min(1, (now - t0) / dur);
        for (const p of pivots) p.rotation[prop] = target * ease(k);
        if (k < 1) return requestAnimationFrame(step);
        for (const [p, parent] of [[pivots[0], cubeGroup], [pivots[1], room]]) {
          while (p.children.length) parent.add(p.children[0]);
          parent.remove(p);
        }
        resolve();
      })(t0);
    });
  }

  function toCanvasPx(local) {
    const w = cubeGroup.localToWorld(local.clone()).project(camera);
    return [((w.x + 1) / 2) * canvas.clientWidth, ((1 - w.y) / 2) * canvas.clientHeight];
  }

  // ------------------------------------------------------------------
  // Pointer: drag turns everything, drag a cube sticker twists, click reads a tile
  // ------------------------------------------------------------------

  const ray = new THREE.Raycaster();
  let drag = null;
  function pick(e, meshes) {
    const r = canvas.getBoundingClientRect();
    ray.setFromCamera({ x: ((e.clientX - r.left) / r.width) * 2 - 1, y: -((e.clientY - r.top) / r.height) * 2 + 1 }, camera);
    const hit = ray.intersectObjects(meshes)[0];
    return hit && hit.object;
  }
  const cubeMeshes = () => [...stickerMeshes, ...cubieMeshes];

  canvas.addEventListener("pointerdown", (e) => {
    const hit = pick(e, cubeMeshes());
    const sticker = hit && hit.userData.sticker;
    drag = { x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, sticker, moved: 0 };
    drag.mode = sticker ? "pending" : "turn";
    try { canvas.setPointerCapture(e.pointerId); } catch (_) { /* synthetic pointer */ }
    canvas.classList.add("dragging");
  });

  canvas.addEventListener("pointermove", (e) => {
    if (!drag) {
      const overCube = !!pick(e, cubeMeshes());
      canvas.classList.toggle("over-cube", overCube);
      canvas.classList.toggle("over-tile", !overCube && !!pick(e, tileMeshes));
      return;
    }
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    drag.x = e.clientX;
    drag.y = e.clientY;
    drag.moved = Math.max(drag.moved, Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0));
    if (drag.mode === "turn" && drag.moved > 4) {
      const k = 0.006;
      const r = new Quat().setFromAxisAngle(AXES[1], dx * k).multiply(new Quat().setFromAxisAngle(AXES[0], dy * k));
      turnAnim = null;
      qView = r.multiply(qView).normalize();
    } else if (drag.mode === "pending" && drag.moved > 8) {
      const op = twistFromDrag(drag.sticker, e.clientX - drag.x0, e.clientY - drag.y0);
      if (op) twist(op);
      drag.mode = "done";
    }
  });

  function endDrag(e) {
    if (!drag) return;
    const d = drag;
    drag = null;
    canvas.classList.remove("dragging");
    if (d.mode !== "turn") return;
    if (d.moved <= 4) {
      const hit = pick(e, tileMeshes);
      if (hit) select(hit.userData.sticker);
    } else {
      turnTo(uprightFor(pageToward(qView, FRONT)), 460);
    }
  }
  canvas.addEventListener("pointerup", endDrag);
  canvas.addEventListener("pointercancel", endDrag);

  // Of the two layers through this sticker, pick the one whose motion on
  // screen best matches the drag.
  function twistFromDrag(s, dx, dy) {
    const Pt = V(s.pos).addScaledVector(V(s.n), 0.5);
    const p0 = toCanvasPx(Pt);
    const len = Math.hypot(dx, dy);
    let best = null;
    for (let axis = 0; axis < 3; axis++) {
      if (s.n[axis] !== 0) continue;
      const v = AXES[axis].clone().cross(Pt); // velocity of Pt under a +90° turn
      const p1 = toCanvasPx(Pt.clone().addScaledVector(v, 0.25));
      const sx = p1[0] - p0[0], sy = p1[1] - p0[1];
      const score = (sx * dx + sy * dy) / (Math.hypot(sx, sy) * len || 1);
      if (!best || Math.abs(score) > Math.abs(best.score)) best = { axis, score };
    }
    if (!best || Math.abs(best.score) < 0.3) return null;
    return { axis: best.axis, layer: s.pos[best.axis], q: best.score > 0 ? 1 : -1 };
  }

  // ------------------------------------------------------------------
  // Frame loop
  // ------------------------------------------------------------------

  // Panels fade out as they turn edge-on, so you only ever see the page in
  // front of you; the others fade in while the cube is turning.
  const facingOpacity = (f) => {
    const t = Math.min(1, Math.max(0, (f - 0.3) / 0.45));
    return t * t * (3 - 2 * t);
  };
  let lastPage = null;
  const tmp = new V3();
  function loop(now) {
    if (turnAnim) {
      const k = Math.min(1, (now - turnAnim.t0) / turnAnim.dur);
      qView.copy(turnAnim.from).slerp(turnAnim.to, ease(k));
      if (k >= 1) {
        turnAnim = null;
        refreshChrome();
      }
    }
    room.quaternion.copy(qView);
    cubeGroup.quaternion.copy(qView);
    room.updateMatrixWorld();
    cubeGroup.updateMatrixWorld();

    for (const sl of slabs) {
      const o = facingOpacity(-tmp.copy(V(sl.userData.n)).applyQuaternion(qView).z);
      sl.material.opacity = o;
      sl.userData.frame.material.opacity = 0.18 * o;
    }
    for (const tm of tileMeshes) tm.material.opacity = facingOpacity(tm.getWorldDirection(tmp).z);

    renderer.render(scene, camera);

    const page = pageToward(qView, FRONT);
    if (page !== lastPage) {
      lastPage = page;
      refreshChrome();
    }
    requestAnimationFrame(loop);
  }

  // ------------------------------------------------------------------
  // DOM chrome
  // ------------------------------------------------------------------

  const $ = (id) => document.getElementById(id);
  const sheetEl = $("sheet"), statusEl = $("status");
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  let selectedId = null;

  function refreshChrome() {
    const page = FACES[pageToward(qView, FRONT)];
    const off = misplacedCount();
    statusEl.innerHTML = `<span class="sw" style="--c:${page.cube}"></span>${esc(page.name)}` +
      `<span class="sep">/</span>` + (off === 0 ? "solved" : `${off} of 54 tiles out of place`);
    document.title = `${page.name} · ${SITE.name}`;

    const arrow = { up: "↑", down: "↓", left: "←", right: "→", flip: "↻" };
    // Only touch the DOM when a label actually changes: replacing a button's
    // contents between press and release can swallow the click.
    document.querySelectorAll("[data-nav]").forEach((b) => {
      const where = b.dataset.nav;
      const f = FACES[pageToward(qTarget, DIRS[where])];
      const html = `<span class="lbl">${esc(f.name)}</span>` +
        (where === "flip" ? `<span class="behind">behind</span>` : "") +
        `<span class="sw" style="--c:${f.cube}"></span><span class="ar">${arrow[where]}</span>`;
      if (b.dataset.html !== html) {
        b.innerHTML = html;
        b.dataset.html = html;
        b.setAttribute("aria-label", `Turn the cube to face ${f.name}`);
      }
    });

    // Page index: the one in front is marked.
    const facing = pageToward(qTarget, FRONT);
    for (const li of $("pageList").children) {
      if (li.dataset.page === facing) li.setAttribute("aria-current", "page");
      else li.removeAttribute("aria-current");
    }

    // Screen-reader text for the panel in front of you.
    const qn = nearestOrient(qView);
    const front = stickers.filter((s) => eq(applyQ(qn, s.n), FRONT)).map(tileContent);
    $("srPage").textContent = `${page.name}: ` + front.map((c) => `${c.t}. ${c.b}`).join(" ");

    if (selectedId) renderSheet(stickers.find((s) => s.id === selectedId));
  }

  function select(s) {
    selectedId = s.id;
    renderSheet(s);
  }
  function renderSheet(s) {
    const c = tileContent(s);
    const home = FACES[s.home];
    const wallHome = centerOnFace(s.n).home;
    const foreign = s.home !== wallHome;
    const facingHome = pageToward(qTarget, FRONT) === s.home;
    sheetEl.hidden = false;
    sheetEl.style.setProperty("--c", home.cube);
    sheetEl.innerHTML = `
      <button type="button" class="close" aria-label="Close">×</button>
      <div class="eyebrow"><span class="sw"></span>${esc(home.name)}${isCenter(s) ? "" : ` / ${tileNumber(s)}`}</div>
      <h3>${esc(c.t)}</h3>
      ${c.b ? `<p>${esc(c.b)}</p>` : ""}
      <div class="row">
        ${c.href ? `<a class="go" href="${esc(c.href)}" target="_blank" rel="noopener">${esc(c.link || "open")} ↗</a>` : ""}
        ${foreign ? `<span class="note">On the ${esc(FACES[wallHome].name)} wall; a twist carried it there.</span>` : ""}
        ${!facingHome ? `<button type="button" class="text-btn" data-goto="${s.home}">Face ${esc(home.name)} →</button>` : ""}
      </div>`;
  }
  function closeSheet() {
    selectedId = null;
    sheetEl.hidden = true;
  }

  // ------------------------------------------------------------------
  // Events
  // ------------------------------------------------------------------

  const WORLD = { U: [0, 1, 0], D: [0, -1, 0], R: [1, 0, 0], L: [-1, 0, 0], F: [0, 0, 1], B: [0, 0, -1] };
  document.querySelectorAll("[data-nav]").forEach((b) => b.addEventListener("click", () => navigate(b.dataset.nav)));
  document.querySelectorAll("[data-twist]").forEach((b) =>
    b.addEventListener("click", (e) => twistToward(WORLD[b.dataset.twist], e.shiftKey ? -1 : 1)));
  $("scrambleBtn").addEventListener("click", () => scramble());
  $("undoBtn").addEventListener("click", undo);
  $("solveBtn").addEventListener("click", solve);
  sheetEl.addEventListener("click", (e) => {
    const go = e.target.closest("[data-goto]");
    if (go) {
      closeSheet();
      goToPage(go.dataset.goto);
    }
    if (e.target.closest(".close")) closeSheet();
  });

  document.addEventListener("keydown", (e) => {
    if (e.target.closest && e.target.closest("input[type=text], textarea, dialog")) return;
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
      e.preventDefault();
      return undo();
    }
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const arrows = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right" };
    if (arrows[e.key]) {
      e.preventDefault();
      return navigate(arrows[e.key]);
    }
    if (e.key === "Escape") return closeSheet();
    const k = e.key.toUpperCase();
    if (WORLD[k]) twistToward(WORLD[k], e.shiftKey ? -1 : 1);
  });

  const PAGE_ORDER = ["B", "U", "R", "L", "D", "F"];
  $("intro").textContent = SITE.intro || "";
  $("pageList").innerHTML = PAGE_ORDER.map((k, i) => `
    <li data-page="${k}" role="link" tabindex="0">
      <span class="num">${String(i + 1).padStart(2, "0")}</span>
      <span class="sw" style="--c:${FACES[k].cube}"></span>
      <span class="name">${esc(FACES[k].name)}</span>
      <span class="here">←</span>
    </li>`).join("");
  $("pageList").addEventListener("click", (e) => {
    const li = e.target.closest("[data-page]");
    if (li) goToPage(li.dataset.page);
  });
  $("pageList").addEventListener("keydown", (e) => {
    const li = e.target.closest("[data-page]");
    if (li && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      goToPage(li.dataset.page);
    }
  });

  // Fade the rails after a few idle seconds; any activity brings them back.
  let idleTimer = 0;
  function wake() {
    document.body.classList.remove("idle");
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      if (sheetEl.hidden && !$("plain").open) document.body.classList.add("idle");
    }, 2600);
  }
  for (const ev of ["pointermove", "pointerdown", "keydown", "wheel", "touchstart"]) addEventListener(ev, wake, { passive: true });
  wake();

  const plain = $("plain");
  $("plainBtn").addEventListener("click", () => {
    $("plainBody").innerHTML = `<p class="plain-intro">${esc(SITE.intro || "")}</p>` + PAGE_ORDER.map((k) => {
      const f = FACES[k];
      return `<section class="plain-sec">
        <h3><span class="sw" style="--c:${f.cube}"></span>${esc(f.name)}</h3>
        <ul>${f.tiles.map((t) => `<li><strong>${esc(t.t)}</strong> ${esc(t.b)}${t.href ? ` <a href="${esc(t.href)}" target="_blank" rel="noopener">${esc(t.link || "open")} ↗</a>` : ""}</li>`).join("")}</ul>
      </section>`;
    }).join("");
    plain.showModal();
  });
  $("plainClose").addEventListener("click", () => plain.close());

  // ------------------------------------------------------------------
  resetModel();
  qView = uprightFor("B");
  qTarget = qView.clone();
  placeCamera();
  build3d();
  requestAnimationFrame(loop);
  // Textures are drawn on canvas, so repaint once the web fonts have loaded.
  if (document.fonts) {
    Promise.all([
      `400 54px 'Source Serif 4'`, `400 31px Inter`, `500 18px 'JetBrains Mono'`, `400 21px 'JetBrains Mono'`,
    ].map((f) => document.fonts.load(f))).then(() => (chain = chain.then(paint)));
  }

  window.cube = {
    view: () => {
      const front = pageToward(qView, FRONT);
      return { front, upright: eq(applyQ(nearestOrient(qView), centerOf(front).up), [0, 1, 0]), solved: misplacedCount() === 0 };
    },
    stickers: () => stickers, history: () => history, twist, navigate, solve, scramble, misplacedCount, goToPage,
  };
})();
