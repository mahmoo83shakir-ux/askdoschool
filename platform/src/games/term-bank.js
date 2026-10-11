// بنك المصطلحات — a deck of 3D cards for memorising: English face, Arabic face, definition and example below.
// The student flips each card, then files it as "حفظته" (into the bank) or "راجعه لاحقاً" (back of the deck).
// One round = the whole unit; stars come from how many cards were known on the first pass.
const TermBank = (() => {
  const CARD_W = 3.2, CARD_H = 2.0, CARD_D = 0.06;
  const IVORY = "#f3ead8", INK = "#0e1c2b", BRASS = "#f2aa3c", BENCH = "#15283b";

  let ctx = null;
  let run = null;

  // ---------- textures ----------
  function wrap(g, text, maxW) {
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

  function fitText(g, text, font, maxW, maxH, start) {
    let size = start, lines;
    do {
      g.font = font(size);
      lines = wrap(g, text, maxW);
      size -= 6;
    } while ((lines.some((l) => g.measureText(l).width > maxW) || lines.length * size * 1.25 > maxH) && size > 40);
    return { lines, size: size + 6 };
  }

  function drawFront(c, term, k, n) {
    const g = c.getContext("2d");
    g.fillStyle = IVORY; g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = BRASS; g.fillRect(0, 0, c.width, 18);
    g.fillStyle = "rgba(14,28,43,.55)";
    g.font = "700 34px Tajawal, system-ui, sans-serif";
    g.textBaseline = "top";
    g.textAlign = "left"; g.direction = "ltr";
    g.fillText("ENGLISH", 48, 50);
    g.textAlign = "right"; g.direction = "rtl";
    g.fillText(`${k.toLocaleString("ar-IQ")} / ${n.toLocaleString("ar-IQ")}`, c.width - 48, 50);
    g.fillStyle = INK; g.textAlign = "center"; g.direction = "ltr"; g.textBaseline = "middle";
    const { lines, size } = fitText(g, term.en, (s) => `800 ${s}px Tajawal, system-ui, sans-serif`, c.width - 140, 380, 150);
    lines.forEach((l, i) => g.fillText(l, c.width / 2, c.height / 2 + 20 + (i - (lines.length - 1) / 2) * size * 1.15));
    g.fillStyle = "rgba(14,28,43,.45)"; g.font = "500 32px Tajawal, system-ui, sans-serif"; g.direction = "rtl";
    g.fillText("المس البطاقة لتقلبها", c.width / 2, c.height - 56);
  }

  function drawBack(c, term) {
    const g = c.getContext("2d");
    g.fillStyle = BENCH; g.fillRect(0, 0, c.width, c.height);
    g.strokeStyle = BRASS; g.lineWidth = 10; g.strokeRect(24, 24, c.width - 48, c.height - 48);
    g.textAlign = "center"; g.textBaseline = "middle"; g.direction = "rtl";
    g.fillStyle = BRASS;
    const { lines, size } = fitText(g, term.ar, (s) => `${s}px Lalezar, Tajawal, sans-serif`, c.width - 160, 330, 170);
    lines.forEach((l, i) => g.fillText(l, c.width / 2, c.height / 2 - 30 + (i - (lines.length - 1) / 2) * size * 1.2));
    g.fillStyle = "#9cb1c5"; g.direction = "ltr";
    g.font = "700 46px Tajawal, system-ui, sans-serif";
    g.fillText(term.en, c.width / 2, c.height - 110);
  }

  function cardMesh(term, k, n) {
    const front = document.createElement("canvas"), back = document.createElement("canvas");
    front.width = back.width = 1024; front.height = back.height = 640;
    const draw = () => { drawFront(front, term, k, n); drawBack(back, term); ft.needsUpdate = bt.needsUpdate = true; };
    const ft = new THREE.CanvasTexture(front), bt = new THREE.CanvasTexture(back);
    [ft, bt].forEach((t) => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; });
    draw();
    // redraw once the web fonts arrive, so the canvas text is not left in a fallback face
    if (document.fonts && document.fonts.status !== "loaded") document.fonts.ready.then(draw);
    const edge = new THREE.MeshStandardMaterial({ color: "#d9cdb3", roughness: 0.7 });
    const mats = [edge, edge, edge, edge,
      new THREE.MeshStandardMaterial({ map: ft, roughness: 0.6 }),
      new THREE.MeshStandardMaterial({ map: bt, roughness: 0.6 })];
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(CARD_W, CARD_H, CARD_D), mats);
    mesh.userData.term = term;
    return mesh;
  }

  // ---------- scene ----------
  function build() {
    const renderer = Stage.renderer();
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 50);
    scene.add(new THREE.HemisphereLight("#dfe9f3", "#0e1c2b", 1.5));
    const key = new THREE.DirectionalLight("#fff3e0", 1.4);
    key.position.set(-2, 3, 5);
    scene.add(key);

    // an atom model drifting behind the deck: nucleus and three electron orbits
    const atom = new THREE.Group();
    atom.add(new THREE.Mesh(new THREE.SphereGeometry(0.28, 20, 14), new THREE.MeshStandardMaterial({ color: "#ff8a5c", emissive: "#3b1606" })));
    const orbitMat = new THREE.MeshBasicMaterial({ color: "#38c6b6", transparent: true, opacity: 0.55 });
    const eMat = new THREE.MeshStandardMaterial({ color: "#6fa8ff", emissive: "#1d3f80" });
    for (let i = 0; i < 3; i++) {
      const orbit = new THREE.Group();
      orbit.add(new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.015, 6, 64), orbitMat));
      const e = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), eMat);
      e.position.x = 1.1;
      orbit.add(e);
      orbit.rotation.set(Math.PI / 2 + i * 0.9, i * 1.1, 0);
      orbit.userData.speed = 0.9 + i * 0.35;
      atom.add(orbit);
    }
    atom.position.set(3.6, 1.3, -4.5);
    scene.add(atom);

    const deck = new THREE.Group();
    scene.add(deck);

    ctx = { renderer, scene, camera, atom, deck, tweens: [], clock: new THREE.Clock(), raf: 0,
      raycaster: new THREE.Raycaster(), pointer: new THREE.Vector2() };

    renderer.domElement.addEventListener("pointerup", (e) => {
      if (!run || run.busy) return;
      const rect = renderer.domElement.getBoundingClientRect();
      ctx.pointer.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
      ctx.raycaster.setFromCamera(ctx.pointer, camera);
      if (run.card && ctx.raycaster.intersectObject(run.card, false).length) flip();
    });
    window.addEventListener("resize", resize);
    document.addEventListener("keydown", (e) => {
      if (!run || run.busy || e.target.closest("button")) return;
      if (e.key === " " || e.key === "Enter") { e.preventDefault(); flip(); }
    });
  }

  // Fit the card into the space above the bottom panel.
  function resize() {
    if (!ctx || !run) return;
    const { renderer, camera } = ctx;
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    const panel = document.querySelector(".bank-panel");
    const top = 64, bottom = panel ? panel.getBoundingClientRect().top - 8 : h - 20;
    const freeW = Math.min(w - 32, 720), freeH = Math.max(bottom - top, 120);
    const t = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
    const d = Math.max((CARD_W * 1.12 * h) / (2 * t * freeW), (CARD_H * 1.25 * h) / (2 * t * freeH));
    camera.aspect = w / h;
    camera.position.set(0, 0.25 * d / 6, d);
    camera.lookAt(0, 0, 0);
    const dy = (top + bottom) / 2 - h / 2;
    camera.setViewOffset(w, h, 0, -dy, w, h);
    camera.updateProjectionMatrix();
  }

  // ---------- round ----------
  function clearDeck() {
    while (ctx.deck.children.length) {
      const m = ctx.deck.children.pop();
      m.geometry.dispose();
      [].concat(m.material).forEach((mat) => { if (mat.map) mat.map.dispose(); mat.dispose(); });
    }
    ctx.tweens.length = 0;
  }

  function startRound(unit, ui, onExit) {
    clearDeck();
    const n = unit.terms.length;
    run = {
      unit, ui, onExit, n,
      queue: unit.terms.map((t, i) => ({ term: t, k: i + 1, tries: 0 })),
      known: [], firstPass: 0, score: 0,
      card: null, flipped: false, busy: false,
    };
    renderPanel();
    // the rest of the deck, as thin plain cards under the active one
    run.stack = [];
    const stackMat = new THREE.MeshStandardMaterial({ color: "#e4d8bf", roughness: 0.8 });
    for (let i = 0; i < 3; i++) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(CARD_W, CARD_H, CARD_D), stackMat);
      s.position.set(0.06 * (i + 1), -0.07 * (i + 1), -0.12 * (i + 1));
      s.rotation.z = -0.02 * (i + 1);
      ctx.deck.add(s);
      run.stack.push(s);
    }
    ui.setScore(0);
    resize();
    dealNext();
  }

  function updateStack() {
    const left = run.queue.length - 1;
    run.stack.forEach((s, i) => { s.visible = i < left; });
  }

  function dealNext() {
    const item = run.queue[0];
    if (!item) return finish();
    const card = cardMesh(item.term, item.k, run.n);
    card.position.set(0, 3.2, 0.4);
    card.rotation.set(-0.5, 0, 0.12);
    ctx.deck.add(card);
    run.card = card;
    run.flipped = false;
    run.busy = true;
    tween(card.position, { y: 0, z: 0 }, 0.45);
    tween(card.rotation, { x: 0, z: 0 }, 0.45, () => { run.busy = false; });
    updateStack();
    run.ui.setStatus(`${run.unit.title_ar} · في البنك ${num(run.known.length)} من ${num(run.n)}`);
    showInfo(null);
  }

  function flip() {
    if (!run.card || run.busy) return;
    run.flipped = !run.flipped;
    run.busy = true;
    const y = run.flipped ? Math.PI : 0;
    tween(run.card.position, { z: 0.6 }, 0.18, () => tween(run.card.position, { z: 0 }, 0.22));
    tween(run.card.rotation, { y }, 0.4, () => { run.busy = false; });
    if (run.flipped) showInfo(run.queue[0].term);
  }

  function file(knownIt) {
    if (!run.card || run.busy || !run.flipped) return;
    const item = run.queue.shift();
    const card = run.card;
    run.card = null;
    run.busy = true;
    item.tries++;
    if (knownIt) {
      const first = item.tries === 1;
      if (first) run.firstPass++;
      run.score += first ? 10 : 5;
      run.known.push(item.term);
      run.ui.setScore(run.score);
      run.ui.toast(`أُضيفت إلى البنك: ${item.term.ar}`, "ok");
      tween(card.position, { x: -6, y: 1.5 }, 0.45);
      tween(card.rotation, { z: 0.6 }, 0.45, () => { ctx.deck.remove(card); disposeCard(card); dealNext(); });
    } else {
      run.queue.push(item);
      run.ui.toast("ستعود إليك في آخر الرزمة", "");
      tween(card.position, { y: -0.3, z: -0.6 }, 0.35);
      tween(card.scale, { x: 0.92, y: 0.92 }, 0.35, () => { ctx.deck.remove(card); disposeCard(card); dealNext(); });
    }
  }

  function disposeCard(card) {
    card.geometry.dispose();
    new Set(card.material).forEach((m) => { if (m.map) m.map.dispose(); m.dispose(); });
  }

  function finish() {
    run.card = null;
    updateStack();
    const ratio = run.firstPass / run.n;
    const stars = ratio >= 0.99 ? 3 : ratio >= 0.6 ? 2 : 1;
    run.score += stars * 5;
    run.ui.setScore(run.score);
    run.ui.levelDone({
      stars,
      score: run.score,
      summary: `${num(run.firstPass)} من ${num(run.n)} حفظتها من أول مرة`,
      items: run.unit.terms,
      levelIndex: 0,
      levelCount: 1,
    });
  }

  // ---------- DOM panel ----------
  const num = (n) => Number(n).toLocaleString("ar-IQ");
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  function renderPanel() {
    const panel = document.createElement("div");
    panel.className = "bank-panel";
    panel.innerHTML = `
      <div class="bank-info" id="bank-info"></div>
      <div class="bank-actions">
        <button class="btn" type="button" id="bank-again">راجعه لاحقاً</button>
        <button class="btn" type="button" id="bank-flip">اقلب البطاقة</button>
        <button class="btn primary" type="button" id="bank-known">حفظته</button>
      </div>`;
    panel.querySelector("#bank-flip").addEventListener("click", flip);
    panel.querySelector("#bank-again").addEventListener("click", () => file(false));
    panel.querySelector("#bank-known").addEventListener("click", () => file(true));
    document.getElementById("stage-ui").replaceChildren(panel);
  }

  function showInfo(term) {
    const box = document.getElementById("bank-info");
    const again = document.getElementById("bank-again"), known = document.getElementById("bank-known");
    again.disabled = known.disabled = !term;
    if (!term) {
      box.innerHTML = `<p class="bank-prompt">هل تعرف معنى هذا المصطلح؟ قل تعريفه في نفسك، ثم اقلب البطاقة.</p>`;
      return;
    }
    box.innerHTML = `
      <p class="bank-term"><span>${esc(term.emoji || "")} ${esc(term.ar)}</span><bdi>${esc(term.en)}</bdi></p>
      <p class="bank-def">${esc(term.def_ar)}</p>
      ${term.example_ar ? `<p class="bank-ex"><b>مثال:</b> ${esc(term.example_ar)}</p>` : ""}`;
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
    ctx.atom.rotation.y += dt * 0.25;
    ctx.atom.children.forEach((o, i) => { if (i) o.rotation.z += dt * o.userData.speed; });
    ctx.atom.position.y = 1.3 + Math.sin(ctx.clock.elapsedTime * 0.8) * 0.12;
    ctx.renderer.render(ctx.scene, ctx.camera);
  }

  return {
    id: "term-bank",
    levelsOf: (terms) => [terms],
    metaLabel: (terms) => `${num(terms.length)} بطاقة`,
    start(unit, _levelIndex, ui, onExit) {
      if (!ctx) build();
      startRound(unit, ui, onExit);
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
      return run && { left: run.queue.length, known: run.known.length, flipped: run.flipped, busy: run.busy };
    },
  };
})();
