// سباق الذرات — an atom runs down a lab corridor; each gate has three doors with English terms.
// The Arabic definition is the question: move to the lane of the right term before the gate arrives.
// One run = every term of the unit once, three hearts; gates come a little faster each time.
const AtomRace = (() => {
  const LANES = [-1.8, 0, 1.8];
  const GATE_FROM = -26;        // gates spawn this far ahead and travel toward the atom at z = 0
  const DOOR_COLORS = ["#ff8a5c", "#38c6b6", "#6fa8ff"];
  const IVORY = "#f3ead8", INK = "#0e1c2b";
  const HEARTS = 3;

  let ctx = null;
  let run = null;

  const num = (n) => Number(n).toLocaleString("ar-IQ");
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  function shuffle(a) {
    const b = a.slice();
    for (let i = b.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [b[i], b[j]] = [b[j], b[i]];
    }
    return b;
  }

  // ---------- textures ----------
  function doorTexture(text, color) {
    const c = document.createElement("canvas");
    c.width = 256; c.height = 384;
    const draw = () => {
      const g = c.getContext("2d");
      g.fillStyle = IVORY; g.fillRect(0, 0, 256, 384);
      g.fillStyle = color; g.fillRect(0, 0, 256, 26); g.fillRect(0, 358, 256, 26);
      g.fillStyle = INK; g.textAlign = "center"; g.textBaseline = "middle";
      let size = 58, lines;
      do {
        g.font = `800 ${size}px Tajawal, system-ui, sans-serif`;
        lines = [];
        let line = "";
        for (const w of text.split(" ")) {
          const t = line ? line + " " + w : w;
          if (g.measureText(t).width > 220 && line) { lines.push(line); line = w; } else line = t;
        }
        lines.push(line);
        size -= 4;
      } while (lines.some((l) => g.measureText(l).width > 220) && size > 26);
      const lh = (size + 4) * 1.15;
      lines.forEach((l, i) => g.fillText(l, 128, 192 + (i - (lines.length - 1) / 2) * lh));
      tex.needsUpdate = true;
    };
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    draw();
    if (document.fonts && document.fonts.status !== "loaded") document.fonts.ready.then(draw);
    return tex;
  }

  function floorTexture() {
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const g = c.getContext("2d");
    g.fillStyle = "#15283b"; g.fillRect(0, 0, 256, 256);
    g.fillStyle = "#1f3852";
    g.fillRect(0, 0, 256, 6);
    g.fillRect(84, 0, 4, 256); g.fillRect(170, 0, 4, 256);
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, 14);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  // ---------- scene ----------
  function build() {
    const renderer = Stage.renderer();
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog("#0e1c2b", 16, 34);
    const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 80);
    scene.add(new THREE.HemisphereLight("#dfe9f3", "#0e1c2b", 1.5));
    const key = new THREE.DirectionalLight("#fff3e0", 1.3);
    key.position.set(-3, 6, 4);
    scene.add(key);

    const floorTex = floorTexture();
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 60), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.9 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.z = -24;
    scene.add(floor);

    // glowing rails along both sides of the track
    const railMat = new THREE.MeshBasicMaterial({ color: "#38c6b6" });
    for (const x of [-2.9, 2.9]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 60), railMat);
      rail.position.set(x, 0.04, -24);
      scene.add(rail);
    }
    // a row of lab columns either side, so the motion reads as speed
    const pillarMat = new THREE.MeshStandardMaterial({ color: "#1f3852", roughness: 0.8 });
    const pillars = [];
    for (let i = 0; i < 8; i++) for (const x of [-3.8, 3.8]) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.4, 3.2, 0.4), pillarMat);
      p.position.set(x, 1.6, -i * 6);
      scene.add(p);
      pillars.push(p);
    }

    // the player: nucleus with two electron orbits
    const atom = new THREE.Group();
    atom.add(new THREE.Mesh(new THREE.SphereGeometry(0.32, 20, 14), new THREE.MeshStandardMaterial({ color: "#f2aa3c", emissive: "#4a2c00" })));
    const orbitMat = new THREE.MeshBasicMaterial({ color: "#6fa8ff" });
    const eMat = new THREE.MeshStandardMaterial({ color: "#eef3f7", emissive: "#5a6b7c" });
    const orbits = [];
    for (let i = 0; i < 2; i++) {
      const o = new THREE.Group();
      o.add(new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.02, 6, 48), orbitMat));
      const e = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), eMat);
      e.position.x = 0.62;
      o.add(e);
      o.rotation.set(Math.PI / 2 + (i ? 0.9 : -0.9), 0, 0);
      atom.add(o);
      orbits.push(o);
    }
    atom.position.set(0, 0.75, 0);
    scene.add(atom);

    const gateGroup = new THREE.Group();
    scene.add(gateGroup);

    ctx = { renderer, scene, camera, floorTex, pillars, atom, orbits, gateGroup,
      tweens: [], clock: new THREE.Clock(), raf: 0, swipe: null };

    const canvas = renderer.domElement;
    canvas.addEventListener("pointerdown", (e) => { if (run) ctx.swipe = { x: e.clientX, id: e.pointerId }; });
    canvas.addEventListener("pointerup", (e) => {
      const s = ctx.swipe;
      ctx.swipe = null;
      if (!run || !s || s.id !== e.pointerId) return;
      const dx = e.clientX - s.x;
      if (Math.abs(dx) > 30) step(dx > 0 ? 1 : -1);
      else setLane(Math.min(2, Math.floor((e.clientX / window.innerWidth) * 3))); // tap a third of the screen
    });
    document.addEventListener("keydown", (e) => {
      if (!run) return;
      if (e.key === "ArrowLeft") { e.preventDefault(); step(-1); }
      if (e.key === "ArrowRight") { e.preventDefault(); step(1); }
    });
    window.addEventListener("resize", resize);
  }

  // Keep the three lanes in view between the question card and the lane buttons.
  function resize() {
    if (!ctx || !run) return;
    const { renderer, camera } = ctx;
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    const q = document.querySelector(".race-q"), lanes = document.querySelector(".race-lanes");
    const top = q ? q.getBoundingClientRect().bottom : 64;
    const bottom = lanes ? lanes.getBoundingClientRect().top : h;
    const freeH = Math.max(bottom - top, 160);
    camera.aspect = w / h;
    const t = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
    // distance at which 7.4 units of track width fit the screen width, and the scene fits the free height
    const d = Math.max(5.5, 3.7 / (t * camera.aspect), (5.5 * h) / (2 * t * freeH));
    camera.position.set(0, 1.4 + d * 0.32, d);
    camera.lookAt(0, 0.6, -5);
    camera.setViewOffset(w, h, 0, -((top + bottom) / 2 - h / 2), w, h);
    camera.updateProjectionMatrix();
    ctx.scene.fog.near = d + 12;
    ctx.scene.fog.far = d + 34;
  }

  // ---------- run ----------
  function distractors(unit, term, pool) {
    const same = shuffle(unit.terms.filter((t) => t.id !== term.id));
    const other = shuffle(pool.filter((t) => t.id !== term.id && !same.includes(t)));
    return same.concat(other).slice(0, 2);
  }

  function startRun(unit, ui, onExit) {
    run = {
      unit, ui, onExit,
      questions: shuffle(unit.terms),
      index: -1, lane: 1, hearts: HEARTS, correct: 0, score: 0,
      gate: null, asked: [],
    };
    ctx.atom.position.x = LANES[1];
    renderUI();
    ui.setScore(0);
    resize();
    nextGate();
  }

  function clearGate() {
    const g = ctx.gateGroup;
    while (g.children.length) {
      const o = g.children.pop();
      o.traverse((m) => {
        if (m.geometry) m.geometry.dispose();
        if (m.material) { if (m.material.map) m.material.map.dispose(); m.material.dispose(); }
      });
    }
  }

  function nextGate() {
    clearGate();
    run.index++;
    const term = run.questions[run.index];
    if (!term || run.hearts <= 0) return finish();
    const options = shuffle([term].concat(distractors(run.unit, term, run.ui.pool())));
    const wall = new THREE.Group();
    const frameMat = new THREE.MeshStandardMaterial({ color: "#2a4560", roughness: 0.7 });
    const beam = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.35, 0.4), frameMat);
    beam.position.y = 2.75;
    wall.add(beam);
    for (const x of [-2.7, -0.9, 0.9, 2.7]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.22, 2.9, 0.4), frameMat);
      post.position.set(x, 1.45, 0);
      wall.add(post);
    }
    const doors = options.map((opt, i) => {
      const pivot = new THREE.Group(); // hinge on the door's left edge so it can swing open
      pivot.position.set(LANES[i] - 0.78, 0, 0);
      const door = new THREE.Mesh(
        new THREE.BoxGeometry(1.56, 2.55, 0.1),
        new THREE.MeshStandardMaterial({ map: doorTexture(opt.en, DOOR_COLORS[i]), roughness: 0.6 })
      );
      door.position.set(0.78, 1.3, 0);
      pivot.add(door);
      wall.add(pivot);
      return { term: opt, pivot, door };
    });
    wall.position.z = GATE_FROM;
    ctx.gateGroup.add(wall);
    // about 9 s for the first gate, down to 6 s
    const seconds = Math.max(6, 9 - run.index * 0.4);
    run.gate = { term, options, wall, doors, speed: -GATE_FROM / seconds, decided: false };
    run.asked.push(term);
    showQuestion(term, options);
  }

  function setLane(i) {
    if (!run || !run.gate || run.gate.decided) return;
    run.lane = i;
    tween(ctx.atom.position, { x: LANES[i] }, 0.18);
    document.querySelectorAll(".lane").forEach((b) => b.classList.toggle("on", Number(b.dataset.i) === i));
  }

  function step(dir) { setLane(Math.max(0, Math.min(2, run.lane + dir))); }

  // called when the gate reaches the atom
  function decide() {
    const g = run.gate;
    g.decided = true;
    const picked = g.options[run.lane];
    const rightIndex = g.options.indexOf(g.term);
    const ok = picked === g.term;
    tween(g.doors[rightIndex].pivot.rotation, { y: -1.4 }, 0.3);
    markLanes(rightIndex, ok ? -1 : run.lane);
    if (ok) {
      run.correct++;
      run.score += 10;
      run.ui.setScore(run.score);
      run.ui.toast(`${g.term.en} = ${g.term.ar}`, "ok");
      later(nextGate, 900);
    } else {
      run.hearts--;
      renderHearts();
      run.ui.toast(`الجواب: ${g.term.en} = ${g.term.ar}`, "bad");
      g.speed = 0;
      tween(ctx.atom.position, { z: 1.4 }, 0.2, () => tween(ctx.atom.position, { z: 0 }, 0.35));
      later(nextGate, 1700);
    }
  }

  // run a step later only if the same run is still on screen
  function later(fn, ms) {
    const r = run;
    setTimeout(() => { if (run === r) fn(); }, ms);
  }

  function finish() {
    run.gate = null;
    const out = run.hearts <= 0;
    const stars = out ? 0 : run.hearts;
    run.score += stars * 5;
    run.ui.setScore(run.score);
    run.ui.levelDone({
      stars,
      score: run.score,
      title: out ? "انتهت المحاولات" : "عبرت كل الأبواب!",
      summary: `${num(run.correct)} من ${num(run.asked.length)} إجابة صحيحة`,
      items: run.asked,
      levelIndex: 0,
      levelCount: 1,
    });
  }

  // ---------- DOM ----------
  function renderUI() {
    const q = document.createElement("div");
    q.className = "race-q";
    q.innerHTML = `<div class="race-meta"><span id="race-hearts" aria-label="المحاولات"></span><span id="race-count"></span></div>
      <p id="race-def"></p><div class="race-bar"><span id="race-bar"></span></div>`;
    const lanes = document.createElement("div");
    lanes.className = "race-lanes";
    lanes.dir = "ltr"; // lanes follow the doors from left to right
    lanes.innerHTML = [0, 1, 2].map((i) => `<button class="lane" type="button" data-i="${i}" style="--c:${DOOR_COLORS[i]}"></button>`).join("");
    lanes.addEventListener("click", (e) => {
      const b = e.target.closest(".lane");
      if (b) setLane(Number(b.dataset.i));
    });
    document.getElementById("stage-ui").replaceChildren(q, lanes);
    renderHearts();
  }

  function renderHearts() {
    let s = "";
    for (let i = 0; i < HEARTS; i++) s += i < run.hearts ? "♥" : '<span class="off">♥</span>';
    document.getElementById("race-hearts").innerHTML = s;
  }

  function showQuestion(term, options) {
    document.getElementById("race-def").textContent = term.def_ar;
    document.getElementById("race-count").textContent = `سؤال ${num(run.index + 1)} من ${num(run.questions.length)}`;
    run.ui.setStatus(`${run.unit.title_ar} · اعبر من باب المصطلح الصحيح`);
    document.querySelectorAll(".lane").forEach((b, i) => {
      b.textContent = options[i].en;
      b.className = "lane" + (i === run.lane ? " on" : "");
    });
  }

  function markLanes(right, wrong) {
    document.querySelectorAll(".lane").forEach((b, i) => {
      if (i === right) b.classList.add("right");
      if (i === wrong) b.classList.add("wrong");
    });
  }

  // ---------- loop ----------
  function tween(obj, to, dur, done) {
    const from = {};
    for (const k in to) from[k] = obj[k];
    ctx.tweens = ctx.tweens.filter((t) => !(t.obj === obj && Object.keys(t.to).some((k) => k in to)));
    ctx.tweens.push({ obj, from, to, dur, t: 0, done });
  }

  function frame() {
    ctx.raf = requestAnimationFrame(frame);
    const dt = Math.min(ctx.clock.getDelta(), 0.05);
    const finished = [];
    ctx.tweens = ctx.tweens.filter((tw) => {
      tw.t = Math.min(tw.t + dt / tw.dur, 1);
      const e = 1 - Math.pow(1 - tw.t, 3);
      for (const k in tw.to) tw.obj[k] = tw.from[k] + (tw.to[k] - tw.from[k]) * e;
      if (tw.t >= 1 && tw.done) finished.push(tw.done);
      return tw.t < 1;
    });
    finished.forEach((f) => f());

    const g = run && run.gate;
    const moving = g && g.speed > 0;
    if (g) {
      g.wall.position.z += g.speed * dt;
      if (!g.decided && g.wall.position.z >= ctx.atom.position.z - 0.3) decide();
      const bar = document.getElementById("race-bar");
      if (bar) bar.style.width = `${Math.min(100, (1 - g.wall.position.z / GATE_FROM) * 100)}%`;
    }
    // the floor and columns scroll with the gate so the corridor feels like it is moving
    const v = moving ? g.speed * dt : 0;
    ctx.floorTex.offset.y += (v * 14) / 60;
    for (const p of ctx.pillars) { p.position.z += v; if (p.position.z > 6) p.position.z -= 48; }
    ctx.atom.rotation.y += dt * 1.5;
    ctx.orbits.forEach((o, i) => { o.rotation.z += dt * (2.2 + i); });
    ctx.atom.position.y = 0.75 + Math.sin(ctx.clock.elapsedTime * 3) * 0.06;
    ctx.renderer.render(ctx.scene, ctx.camera);
  }

  return {
    id: "atom-race",
    levelsOf: (terms) => [terms],
    metaLabel: (terms) => `${num(terms.length)} سؤال`,
    start(unit, _levelIndex, ui, onExit) {
      if (!ctx) build();
      startRun(unit, ui, onExit);
      cancelAnimationFrame(ctx.raf);
      ctx.clock.getDelta();
      frame();
    },
    stop() {
      if (ctx) cancelAnimationFrame(ctx.raf);
      run = null;
    },
    // for the automated browser test
    peek() {
      return run && run.gate && {
        index: run.index, hearts: run.hearts, correct: run.correct,
        answer: run.gate.options.indexOf(run.gate.term), decided: run.gate.decided, z: run.gate.wall.position.z,
      };
    },
  };
})();
