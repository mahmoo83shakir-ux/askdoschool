// مختبر المصطلحات — drag (or tap) an English-term cube onto the platform of its Arabic definition.
// One level = 3 terms (4 when the unit's count leaves a remainder). Reads terms only from the unit data.
const TermLab = (() => {
  const LETTERS = ["أ", "ب", "ج", "د"];
  const PAD_COLORS = ["#ff8a5c", "#38c6b6", "#6fa8ff", "#e6c94a"];
  const INK = "#0e1c2b";
  const IVORY = "#f3ead8";
  const BRASS = new THREE.Color("#f2aa3c");
  const CUBE_Y = 0.65;

  let ctx = null; // {renderer, scene, camera, ...} built once, reused across levels
  let run = null; // current level state

  function levelsOf(terms) {
    const out = [];
    for (let i = 0; i < terms.length; i += 3) out.push(terms.slice(i, i + 3));
    if (out.length > 1 && out[out.length - 1].length === 1) out[out.length - 2].push(out.pop()[0]);
    return out;
  }

  function shuffle(a) {
    const b = a.slice();
    for (let i = b.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [b[i], b[j]] = [b[j], b[i]];
    }
    return b;
  }

  // ---------- textures ----------
  function wrapLines(g, text, maxW) {
    const words = text.split(" ");
    const lines = [];
    let line = "";
    for (const w of words) {
      const t = line ? line + " " + w : w;
      if (g.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t;
    }
    lines.push(line);
    return lines;
  }

  function termTexture(text) {
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const g = c.getContext("2d");
    g.fillStyle = IVORY;
    g.fillRect(0, 0, 256, 256);
    g.strokeStyle = "rgba(14,28,43,.18)";
    g.lineWidth = 10;
    g.strokeRect(5, 5, 246, 246);
    g.fillStyle = INK;
    g.textAlign = "center";
    g.textBaseline = "middle";
    let size = 64, lines;
    do {
      g.font = `800 ${size}px Tajawal, system-ui, sans-serif`;
      lines = wrapLines(g, text, 216);
      size -= 4;
    } while ((lines.some((l) => g.measureText(l).width > 216) || lines.length * size * 1.15 > 200) && size > 26);
    const lh = (size + 4) * 1.1;
    lines.forEach((l, i) => g.fillText(l, 128, 128 + (i - (lines.length - 1) / 2) * lh));
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  }

  function padTexture(letter, color) {
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const g = c.getContext("2d");
    g.fillStyle = color;
    g.beginPath(); g.arc(128, 128, 128, 0, Math.PI * 2); g.fill();
    g.strokeStyle = "rgba(255,255,255,.55)";
    g.lineWidth = 8;
    g.beginPath(); g.arc(128, 128, 104, 0, Math.PI * 2); g.stroke();
    g.fillStyle = INK;
    g.font = "120px Lalezar, Tajawal, sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.direction = "rtl";
    g.fillText(letter, 128, 140);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  function benchTexture() {
    const c = document.createElement("canvas");
    c.width = c.height = 512;
    const g = c.getContext("2d");
    g.fillStyle = "#15283b";
    g.fillRect(0, 0, 512, 512);
    g.strokeStyle = "#1f3852";
    g.lineWidth = 4;
    for (let i = 0; i <= 512; i += 128) {
      g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 512); g.stroke();
      g.beginPath(); g.moveTo(0, i); g.lineTo(512, i); g.stroke();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(6, 6);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  // ---------- scene ----------
  function build(canvas) {
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "low-power" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor("#0e1c2b");

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog("#0e1c2b", 14, 26);
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 60);

    scene.add(new THREE.HemisphereLight("#dfe9f3", "#0e1c2b", 1.4));
    const sun = new THREE.DirectionalLight("#fff3e0", 1.6);
    sun.position.set(-3, 8, 5);
    scene.add(sun);

    const bench = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 40),
      new THREE.MeshStandardMaterial({ map: benchTexture(), roughness: 0.9 })
    );
    bench.rotation.x = -Math.PI / 2;
    scene.add(bench);

    // a few glass flasks at the back of the bench, purely for atmosphere
    const glass = new THREE.MeshStandardMaterial({ color: "#9fd8ff", transparent: true, opacity: 0.35, roughness: 0.1 });
    const liquid = [
      new THREE.MeshStandardMaterial({ color: "#38c6b6", emissive: "#0b3b36", roughness: 0.4 }),
      new THREE.MeshStandardMaterial({ color: "#ff8a5c", emissive: "#3b1606", roughness: 0.4 }),
      new THREE.MeshStandardMaterial({ color: "#6fa8ff", emissive: "#0c2246", roughness: 0.4 }),
    ];
    [[-5.2, -5.5, 0], [-3.9, -6.2, 1], [4.6, -5.8, 2], [5.8, -4.6, 0]].forEach(([x, z, k], i) => {
      const flask = new THREE.Group();
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.7, 20, 14), glass);
      body.position.y = 0.7;
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.9, 14, 1, true), glass);
      neck.position.y = 1.7;
      const fill = new THREE.Mesh(new THREE.SphereGeometry(0.55, 18, 12, 0, Math.PI * 2, Math.PI * 0.45, Math.PI * 0.55), liquid[k]);
      fill.position.y = 0.7;
      flask.add(fill, body, neck);
      flask.position.set(x, 0, z);
      flask.scale.setScalar(i % 2 ? 0.8 : 1);
      scene.add(flask);
    });

    const shadowTex = (() => {
      const c = document.createElement("canvas");
      c.width = c.height = 64;
      const g = c.getContext("2d");
      const gr = g.createRadialGradient(32, 32, 2, 32, 32, 32);
      gr.addColorStop(0, "rgba(0,0,0,.55)");
      gr.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = gr;
      g.fillRect(0, 0, 64, 64);
      return new THREE.CanvasTexture(c);
    })();

    const levelGroup = new THREE.Group();
    scene.add(levelGroup);

    ctx = {
      renderer, scene, camera, levelGroup, shadowTex,
      raycaster: new THREE.Raycaster(),
      dragPlane: new THREE.Plane(new THREE.Vector3(0, 1, 0), -CUBE_Y - 0.6),
      pointer: new THREE.Vector2(),
      tweens: [],
      clock: new THREE.Clock(),
      raf: 0,
    };
    bindPointer(canvas);
    window.addEventListener("resize", resize);
  }

  // Fit the bench (pads + cubes) into the part of the screen the definitions tray leaves free:
  // binary-search the camera distance on the projected bounding box, then shift with a view offset.
  function resize() {
    if (!ctx) return;
    const { renderer, camera } = ctx;
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    const tray = document.querySelector(".tray");
    const r = tray ? tray.getBoundingClientRect() : null;
    const free = { l: 8, r: w - 8, t: 64, b: h - 44 };
    if (r && r.width < w * 0.7) free.r = r.left - 12; // tray on the side
    else if (r) free.t = r.bottom + 8;                // tray on top
    const L = run ? run.layout : { half: 3.8, back: -3, front: 2.4, tall: false };
    const box = [];
    for (const x of [-L.half, L.half]) for (const z of [L.back, L.front]) for (const y of [0, 1.4]) box.push(new THREE.Vector3(x, y, z));
    const [cy, cz] = L.tall ? [0.88, 0.48] : [0.8, 0.6];
    camera.aspect = w / h;
    camera.clearViewOffset();
    const v = new THREE.Vector3();
    const project = (d) => {
      camera.position.set(0, d * cy, d * cz);
      camera.lookAt(0, 0, 0.2);
      camera.updateMatrixWorld();
      camera.updateProjectionMatrix();
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
      for (const p of box) {
        v.copy(p).project(camera);
        const sx = (v.x + 1) / 2 * w, sy = (1 - v.y) / 2 * h;
        x0 = Math.min(x0, sx); x1 = Math.max(x1, sx); y0 = Math.min(y0, sy); y1 = Math.max(y1, sy);
      }
      return { x0, x1, y0, y1 };
    };
    let lo = 4, hi = 60;
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2, bb = project(mid);
      if (bb.x1 - bb.x0 <= free.r - free.l && bb.y1 - bb.y0 <= free.b - free.t) hi = mid; else lo = mid;
    }
    const bb = project(hi);
    ctx.scene.fog.near = hi * 1.1;
    ctx.scene.fog.far = hi * 2.4;
    const dx = (free.l + free.r) / 2 - (bb.x0 + bb.x1) / 2;
    const dy = (free.t + free.b) / 2 - (bb.y0 + bb.y1) / 2;
    camera.setViewOffset(w, h, -dx, -dy, w, h);
    camera.updateProjectionMatrix();
  }

  // ---------- level ----------
  function clearLevel() {
    const g = ctx.levelGroup;
    while (g.children.length) {
      const o = g.children.pop();
      o.traverse((m) => {
        if (m.geometry) m.geometry.dispose();
        if (m.material) [].concat(m.material).forEach((mat) => { if (mat.map && mat.map !== ctx.shadowTex) mat.map.dispose(); mat.dispose(); });
      });
    }
    ctx.tweens.length = 0;
  }

  function makeCube(term, size) {
    const tex = termTexture(term.en);
    const side = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55 });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(size, size, size), side);
    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(size * 1.6, size * 1.6),
      new THREE.MeshBasicMaterial({ map: ctx.shadowTex, transparent: true, depthWrite: false })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.01;
    return { mesh, shadow, term };
  }

  function makePad(i, size) {
    const color = PAD_COLORS[i];
    const grp = new THREE.Group();
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(size * 0.78, size * 0.86, 0.22, 36),
      new THREE.MeshStandardMaterial({ color, roughness: 0.5 })
    );
    base.position.y = 0.11;
    const top = new THREE.Mesh(
      new THREE.CircleGeometry(size * 0.72, 36),
      new THREE.MeshStandardMaterial({ map: padTexture(LETTERS[i], color), roughness: 0.6 })
    );
    top.rotation.x = -Math.PI / 2;
    top.position.y = 0.225;
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(size * 0.9, size * 1.02, 40),
      new THREE.MeshBasicMaterial({ color: "#f2aa3c", transparent: true, opacity: 0, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.02;
    grp.add(base, top, ring);
    return { group: grp, ring, base, top };
  }

  function startLevel(unit, levelIndex, ui, onExit) {
    clearLevel();
    const levels = levelsOf(unit.terms);
    const items = levels[levelIndex];
    const n = items.length;
    // portrait phones get a narrower, deeper bench so the cubes stay large
    const tall = window.innerHeight > window.innerWidth;
    const size = n > 3 ? (tall ? 1.05 : 1.15) : 1.3;
    const gap = n > 3 ? (tall ? 1.45 : 2.15) : (tall ? 1.8 : 2.5);
    const padZ = tall ? -2.3 : -1.7, cubeZ = tall ? 2.0 : 1.5;
    const xs = items.map((_, i) => (i - (n - 1) / 2) * gap);
    const layout = { half: ((n - 1) / 2) * gap + size * 0.75, back: padZ - size, front: cubeZ + size * 0.7, tall };

    run = {
      unit, levels, levelIndex, items, ui, onExit, layout,
      pads: [], cubes: [], selected: null, drag: null,
      mistakes: 0, matched: 0, score: 0,
    };

    // pads keep the tray order (أ ب ج); the tray is RTL, so أ sits on the right of the bench too
    items.forEach((term, i) => {
      const pad = makePad(i, Math.min(size, (gap * 0.46) / 0.86));
      pad.group.position.set(-xs[i], 0, padZ);
      pad.term = term;
      pad.index = i;
      pad.base.userData.pad = pad;
      pad.top.userData.pad = pad;
      ctx.levelGroup.add(pad.group);
      run.pads.push(pad);
    });

    shuffle(items).forEach((term, i) => {
      const cube = makeCube(term, size);
      cube.home = new THREE.Vector3(xs[i], CUBE_Y, cubeZ);
      cube.mesh.position.copy(cube.home);
      cube.mesh.position.y = CUBE_Y + 3;
      cube.mesh.rotation.y = (Math.random() - 0.5) * 0.5;
      cube.phase = Math.random() * Math.PI * 2;
      cube.mesh.userData.cube = cube;
      cube.shadow.position.x = xs[i];
      cube.shadow.position.z = cubeZ;
      ctx.levelGroup.add(cube.mesh, cube.shadow);
      run.cubes.push(cube);
      tween(cube.mesh.position, { y: CUBE_Y }, 0.5 + i * 0.12);
    });

    ui.renderTray(items, LETTERS, PAD_COLORS, (i) => tapPad(run.pads[i]));
    ui.setLevel(levelIndex, levels.length);
    ui.setScore(0);
    resize();
  }

  // ---------- interaction ----------
  function pick(e, objects) {
    const rect = ctx.renderer.domElement.getBoundingClientRect();
    ctx.pointer.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    ctx.raycaster.setFromCamera(ctx.pointer, ctx.camera);
    return ctx.raycaster.intersectObjects(objects, false)[0] || null;
  }

  function planePoint(e) {
    pick(e, []);
    const p = new THREE.Vector3();
    return ctx.raycaster.ray.intersectPlane(ctx.dragPlane, p) ? p : null;
  }

  function freeCubes() { return run.cubes.filter((c) => !c.locked).map((c) => c.mesh); }

  function bindPointer(canvas) {
    canvas.addEventListener("pointerdown", (e) => {
      if (!run) return;
      const hit = pick(e, freeCubes());
      if (hit) {
        const cube = hit.object.userData.cube;
        canvas.setPointerCapture(e.pointerId);
        run.drag = { cube, x: e.clientX, y: e.clientY, moved: false, id: e.pointerId };
        return;
      }
      const padHit = pick(e, run.pads.flatMap((p) => [p.base, p.top]));
      if (padHit) tapPad(padHit.object.userData.pad);
      else select(null);
    });
    canvas.addEventListener("pointermove", (e) => {
      const d = run && run.drag;
      if (!d || d.id !== e.pointerId) {
        if (run && !run.drag && e.pointerType === "mouse") canvas.style.cursor = pick(e, freeCubes()) ? "grab" : "default";
        return;
      }
      if (!d.moved && Math.hypot(e.clientX - d.x, e.clientY - d.y) < 8) return;
      if (!d.moved) { d.moved = true; select(d.cube); canvas.style.cursor = "grabbing"; }
      const p = planePoint(e);
      if (!p) return;
      d.cube.mesh.position.set(THREE.MathUtils.clamp(p.x, -5, 5), CUBE_Y + 0.6, THREE.MathUtils.clamp(p.z, -3, 3));
      d.cube.shadow.position.set(d.cube.mesh.position.x, 0.01, d.cube.mesh.position.z);
      highlightPad(nearestPad(d.cube.mesh.position));
    });
    const end = (e) => {
      const d = run && run.drag;
      if (!d || d.id !== e.pointerId) return;
      run.drag = null;
      canvas.style.cursor = "default";
      highlightPad(null);
      if (!d.moved) { select(run.selected === d.cube ? null : d.cube); return; }
      const pad = nearestPad(d.cube.mesh.position);
      if (pad) attempt(d.cube, pad);
      else { sendHome(d.cube); select(null); }
    };
    canvas.addEventListener("pointerup", end);
    canvas.addEventListener("pointercancel", end);
  }

  function nearestPad(pos) {
    let best = null, bd = 1.45;
    for (const p of run.pads) {
      if (p.done) continue;
      const dd = Math.hypot(pos.x - p.group.position.x, pos.z - p.group.position.z);
      if (dd < bd) { bd = dd; best = p; }
    }
    return best;
  }

  function highlightPad(pad) {
    run.pads.forEach((p) => { p.ring.material.opacity = p === pad ? 0.9 : 0; });
    run.ui.markTarget(pad ? pad.index : -1);
  }

  function select(cube) {
    run.cubes.forEach((c) => {
      c.mesh.material.emissive = c === cube ? BRASS : new THREE.Color(0x000000);
      c.mesh.material.emissiveIntensity = c === cube ? 0.35 : 0;
    });
    run.selected = cube;
    run.ui.hint(cube ? `اختر منصة تعريف «${cube.term.en}»` : null);
  }

  function tapPad(pad) {
    if (!run || pad.done) return;
    if (!run.selected) { run.ui.toast("اختر مكعباً أولاً", ""); return; }
    attempt(run.selected, pad);
  }

  function attempt(cube, pad) {
    select(null);
    if (cube.term.id === pad.term.id) {
      cube.locked = true;
      pad.done = true;
      run.matched++;
      run.score += 10;
      const to = pad.group.position;
      tween(cube.mesh.position, { x: to.x, y: 0.225 + cube.mesh.geometry.parameters.height * 0.41, z: to.z }, 0.35);
      tween(cube.mesh.rotation, { y: 0 }, 0.35);
      tween(cube.shadow.position, { x: to.x, z: to.z }, 0.35);
      tween(cube.mesh.scale, { x: 0.82, y: 0.82, z: 0.82 }, 0.35);
      run.ui.markDone(pad.index, cube.term);
      run.ui.toast(`${cube.term.en} = ${cube.term.ar}`, "ok");
      run.ui.setScore(run.score);
      if (run.matched === run.items.length) setTimeout(finishLevel, 700);
    } else {
      run.mistakes++;
      sendHome(cube);
      run.ui.shake(pad.index);
      run.ui.toast("ليس هذا تعريفه، حاول مرة أخرى", "bad");
    }
  }

  function sendHome(cube) {
    tween(cube.mesh.position, { x: cube.home.x, y: CUBE_Y, z: cube.home.z }, 0.35);
    tween(cube.shadow.position, { x: cube.home.x, z: cube.home.z }, 0.35);
  }

  function finishLevel() {
    const stars = run.mistakes === 0 ? 3 : run.mistakes <= 2 ? 2 : 1;
    run.score += stars * 5;
    run.ui.setScore(run.score);
    run.ui.levelDone({
      stars,
      score: run.score,
      mistakes: run.mistakes,
      items: run.items,
      levelIndex: run.levelIndex,
      levelCount: run.levels.length,
    });
  }

  // ---------- loop ----------
  function tween(obj, to, dur) {
    const from = {};
    for (const k in to) from[k] = obj[k];
    ctx.tweens = ctx.tweens.filter((t) => t.obj !== obj);
    ctx.tweens.push({ obj, from, to, dur, t: 0 });
  }

  function frame() {
    ctx.raf = requestAnimationFrame(frame);
    const dt = Math.min(ctx.clock.getDelta(), 0.05);
    const time = ctx.clock.elapsedTime;
    ctx.tweens = ctx.tweens.filter((tw) => {
      tw.t = Math.min(tw.t + dt / tw.dur, 1);
      const e = 1 - Math.pow(1 - tw.t, 3);
      for (const k in tw.to) tw.obj[k] = tw.from[k] + (tw.to[k] - tw.from[k]) * e;
      return tw.t < 1;
    });
    if (run) {
      const busy = new Set(ctx.tweens.map((t) => t.obj));
      for (const c of run.cubes) {
        if (c.locked || (run.drag && run.drag.cube === c) || busy.has(c.mesh.position)) continue;
        const lift = run.selected === c ? 0.35 : 0;
        c.mesh.position.y = CUBE_Y + lift + Math.sin(time * 1.6 + c.phase) * 0.06;
        c.mesh.rotation.y += dt * (run.selected === c ? 0.9 : 0.12);
      }
    }
    ctx.renderer.render(ctx.scene, ctx.camera);
  }

  return {
    id: "term-lab",
    levelsOf,
    start(unit, levelIndex, ui, onExit) {
      const canvas = document.getElementById("scene");
      if (!ctx) build(canvas);
      startLevel(unit, levelIndex, ui, onExit);
      cancelAnimationFrame(ctx.raf);
      ctx.clock.getDelta();
      frame();
    },
    stop() {
      if (ctx) cancelAnimationFrame(ctx.raf);
      run = null;
    },
    resize,
    // screen positions of the free cubes and open pads, for the automated browser test
    peek() {
      if (!run) return null;
      const at = (o) => {
        const v = o.getWorldPosition(new THREE.Vector3()).project(ctx.camera);
        return { x: (v.x + 1) / 2 * window.innerWidth, y: (1 - v.y) / 2 * window.innerHeight };
      };
      return {
        cubes: run.cubes.filter((c) => !c.locked).map((c) => ({ id: c.term.id, ...at(c.mesh) })),
        pads: run.pads.filter((p) => !p.done).map((p) => ({ id: p.term.id, index: p.index, ...at(p.group) })),
      };
    },
  };
})();
