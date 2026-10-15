// Platform shell: home page (one card per unit in content/terms), game registry, progress in localStorage.
const UNITS = JSON.parse(document.getElementById("units-data").textContent);

// Every unit gets every game; a game with ready:false shows as "قريباً".
const GAMES = [
  { id: "term-lab", name: "مختبر المصطلحات", desc: "اسحب مكعب المصطلح الإنكليزي إلى منصة تعريفه العربي.", ready: true, impl: TermLab },
  { id: "atom-race", name: "سباق الذرات", desc: "سؤال سريع وثلاثة أبواب، اعبر من باب الجواب الصحيح.", ready: true, impl: AtomRace },
  { id: "term-bank", name: "بنك المصطلحات", desc: "بطاقات تدور للحفظ: وجه إنكليزي، ووجه عربي مع التعريف.", ready: true, impl: TermBank },
];

const num = (n) => Number(n).toLocaleString("ar-IQ");
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// ---------- progress (per-viewer convenience only) ----------
const STORE_KEY = "askdo.platform.v1";
let progress = {};
try { progress = JSON.parse(localStorage.getItem(STORE_KEY) || "{}") || {}; } catch (_) { progress = {}; }
function saveProgress() { try { localStorage.setItem(STORE_KEY, JSON.stringify(progress)); } catch (_) {} }
function gameProgress(unitId, gameId) {
  progress[unitId] = progress[unitId] || {};
  return (progress[unitId][gameId] = progress[unitId][gameId] || { stars: {}, best: {} });
}

function starsHtml(got, total) {
  let s = "";
  for (let i = 0; i < total; i++) s += i < got ? "★" : '<span class="off">★</span>';
  return s;
}

// ---------- home ----------
// The newest book chapter (units under 90) opens by default; the viewer's own toggles are kept while the page is open.
const currentUnit = UNITS.filter((u) => u.unit < 90).reduce((a, u) => (!a || u.unit > a.unit ? u : a), null);
const openUnits = new Set(currentUnit ? [currentUnit.id] : []);

function renderHome() {
  let termCount = 0, starsGot = 0, starsMax = 0;
  const cards = UNITS.map((u) => {
    termCount += u.terms.length;
    let unitGot = 0, unitMax = 0;
    const games = GAMES.map((g) => {
      if (!g.ready) {
        return `<button class="game-card" type="button" disabled>
          <strong>${g.name}</strong><p>${g.desc}</p>
          <div class="meta"><span class="soon">قريباً</span></div></button>`;
      }
      const levels = g.impl.levelsOf(u.terms).length;
      const gp = gameProgress(u.id, g.id);
      const got = Object.values(gp.stars).reduce((a, b) => a + b, 0);
      unitGot += got; unitMax += levels * 3;
      return `<button class="game-card" type="button" data-unit="${esc(u.id)}" data-game="${g.id}">
        <strong>${g.name}</strong><p>${g.desc}</p>
        <div class="meta"><span>${g.impl.metaLabel ? g.impl.metaLabel(u.terms) : (levels === 1 ? "مستوى واحد" : `${num(levels)} مستويات`)}</span><span class="stars" aria-label="${num(got)} من ${num(levels * 3)} نجوم">${starsHtml(Math.round((got / (levels * 3)) * 5), 5)}</span></div>
      </button>`;
    }).join("");
    starsGot += unitGot; starsMax += unitMax;
    const isCurrent = currentUnit && u.id === currentUnit.id;
    return `<details class="unit" data-unit-id="${esc(u.id)}"${openUnits.has(u.id) ? " open" : ""}>
      <summary class="unit-head">
        <div><div class="unit-num">${u.unit >= 90 ? "مصطلحات إضافية" : `الفصل ${num(u.unit)}`}${isCurrent ? '<span class="now">الفصل الحالي</span>' : ""}</div><h2>${esc(u.title_ar)}</h2><div class="unit-en">${esc(u.title_en)}</div></div>
        <div class="unit-side">
          <span class="status ${u.status === "reviewed" ? "reviewed" : ""}">${u.status === "reviewed" ? "مطابق للكتاب" : "مسودة"}</span>
          <span class="unit-count">${num(u.terms.length)} مصطلح، ${num(unitGot)} من ${num(unitMax)} نجمة</span>
        </div>
      </summary>
      <div class="unit-body">
        <div class="term-strip" aria-label="مصطلحات الفصل">${u.terms.map((t) => `<span>${esc(t.en)}</span>`).join("")}</div>
        <div class="games">${games}</div>
      </div>
    </details>`;
  });
  cards.push(`<article class="unit placeholder"><h2>الفصول القادمة</h2>
    <p>كل فصل يضاف إلى ملف المصطلحات يظهر هنا تلقائياً مع ألعابه.</p></article>`);
  $("units").innerHTML = cards.join("");
  $("units").querySelectorAll("details.unit").forEach((d) => d.addEventListener("toggle", () => {
    if (d.open) openUnits.add(d.dataset.unitId); else openUnits.delete(d.dataset.unitId);
  }));
  $("totals").innerHTML = `
    <span class="chip"><b>${num(UNITS.length)}</b> فصل</span>
    <span class="chip"><b>${num(termCount)}</b> مصطلح</span>
    <span class="chip"><b>${num(starsGot)}</b> من ${num(starsMax)} نجمة</span>`;
}

// ---------- sound: short tones for right, wrong and level done; starts only after a tap ----------
const Sfx = (() => {
  let ac = null;
  let muted = false;
  try { muted = localStorage.getItem("askdo.platform.muted") === "1"; } catch (_) {}
  function tone(freq, start, dur, type = "sine", gain = 0.12) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(gain, ac.currentTime + start);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + start + dur);
    o.connect(g).connect(ac.destination);
    o.start(ac.currentTime + start); o.stop(ac.currentTime + start + dur + 0.02);
  }
  function play(kind) {
    if (muted) return;
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      if (ac.state === "suspended") ac.resume();
      if (kind === "ok") { tone(660, 0, 0.12); tone(990, 0.09, 0.18); }
      else if (kind === "bad") { tone(220, 0, 0.22, "triangle", 0.14); }
      else if (kind === "done") { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.1, 0.22)); }
    } catch (_) { /* no audio on this device */ }
  }
  return {
    play,
    get muted() { return muted; },
    toggle() {
      muted = !muted;
      try { localStorage.setItem("askdo.platform.muted", muted ? "1" : "0"); } catch (_) {}
      return muted;
    },
  };
})();

function renderMute() {
  const b = $("btn-sound");
  b.textContent = Sfx.muted ? "🔇" : "🔊";
  b.setAttribute("aria-label", Sfx.muted ? "تشغيل الصوت" : "كتم الصوت");
  b.setAttribute("aria-pressed", String(Sfx.muted));
}
$("btn-sound").addEventListener("click", () => { Sfx.toggle(); renderMute(); });
renderMute();

$("units").addEventListener("click", (e) => {
  const card = e.target.closest("[data-game]");
  if (!card) return;
  const unit = UNITS.find((u) => u.id === card.dataset.unit);
  const game = GAMES.find((g) => g.id === card.dataset.game);
  const gp = gameProgress(unit.id, game.id);
  const levels = game.impl.levelsOf(unit.terms).length;
  let next = 0;
  while (next < levels - 1 && gp.stars[next]) next++;
  openGame(unit, game, next);
});

// ---------- game screen ----------
let current = null;
let toastTimer = 0;

const ui = {
  renderTray(items, letters, colors, onTap) {
    const old = document.querySelector(".tray");
    if (old) old.remove();
    const tray = document.createElement("div");
    tray.className = "tray";
    tray.innerHTML = items.map((t, i) => `<button class="def" type="button" data-i="${i}" style="--c:${colors[i]}">
      <span class="tag">${letters[i]}</span><span class="txt">${esc(t.def_ar)}<span class="ans" hidden></span></span></button>`).join("");
    tray.addEventListener("click", (e) => {
      const b = e.target.closest(".def");
      if (b && !b.classList.contains("done")) onTap(Number(b.dataset.i));
    });
    $("stage-ui").replaceChildren(tray, Object.assign(document.createElement("p"), { className: "hint", id: "hint" }));
    ui.hint(null);
  },
  markDone(i, term) {
    const b = document.querySelector(`.def[data-i="${i}"]`);
    b.classList.add("done");
    const a = b.querySelector(".ans");
    a.hidden = false;
    a.textContent = `${term.emoji || "✔"} ${term.ar} · ${term.en}`;
  },
  markDecoy(i, term) {
    const b = document.querySelector(`.def[data-i="${i}"]`);
    b.classList.add("decoy");
    const a = b.querySelector(".ans");
    a.hidden = false;
    a.textContent = `تعريف إضافي: ${term.ar} · ${term.en}`;
  },
  pool: () => UNITS.flatMap((u) => u.terms),
  markTarget(i) {
    document.querySelectorAll(".def").forEach((b) => b.classList.toggle("target", Number(b.dataset.i) === i));
  },
  shake(i) {
    const b = document.querySelector(`.def[data-i="${i}"]`);
    b.classList.remove("shake"); void b.offsetWidth; b.classList.add("shake");
  },
  hint(text) {
    const h = $("hint");
    if (h) h.textContent = text || "اسحب المكعب إلى منصة تعريفه، أو المسه ثم المس التعريف";
  },
  toast(text, kind) {
    const t = $("toast");
    t.textContent = text;
    t.className = "toast show " + (kind || "");
    if (kind) Sfx.play(kind);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (t.className = "toast"), 1600);
  },
  setScore(s) { $("hud-score").textContent = num(s); },
  setStatus(text) { $("hud-level").textContent = text; },
  setLevel(i, n) { $("hud-level").textContent = `${current.unit.title_ar} · المستوى ${num(i + 1)} من ${num(n)}`; },
  levelDone(r) {
    const gp = gameProgress(current.unit.id, current.game.id);
    gp.stars[r.levelIndex] = Math.max(gp.stars[r.levelIndex] || 0, r.stars);
    gp.best[r.levelIndex] = Math.max(gp.best[r.levelIndex] || 0, r.score);
    saveProgress();
    $("toast").className = "toast";
    Sfx.play(r.stars > 0 ? "done" : "bad");
    const last = r.levelIndex === r.levelCount - 1;
    const wrap = document.createElement("div");
    wrap.className = "sheet-wrap";
    wrap.innerHTML = `<div class="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title">
      <h3 id="sheet-title">${r.title ? esc(r.title) : last ? "أنهيت الفصل!" : `أنهيت المستوى ${num(r.levelIndex + 1)}`}</h3>
      <div class="big-stars" aria-label="${num(r.stars)} من ٣ نجوم">${starsHtml(r.stars, 3)}</div>
      <p>${num(r.score)} نقطة، ${r.summary || (r.mistakes ? `${num(r.mistakes)} محاولة خاطئة` : "بلا أخطاء")}</p>
      <div class="learned">${r.items.map((t) => `<div><span>${esc(t.emoji || "")} ${esc(t.ar)}</span><bdi>${esc(t.en)}</bdi>${t.example_ar ? `<small>${esc(t.example_ar)}</small>` : ""}</div>`).join("")}</div>
      <div class="actions">
        ${last ? "" : `<button class="btn primary" type="button" data-act="next">المستوى التالي</button>`}
        <button class="btn" type="button" data-act="again">أعد المستوى</button>
        <button class="btn" type="button" data-act="home">الفصول</button>
      </div></div>`;
    wrap.addEventListener("click", (e) => {
      const act = e.target.closest("[data-act]")?.dataset.act;
      if (!act) return;
      wrap.remove();
      if (act === "home") closeGame();
      else openGame(current.unit, current.game, r.levelIndex + (act === "next" ? 1 : 0));
    });
    $("stage-ui").appendChild(wrap);
    wrap.querySelector(".btn").focus();
  },
};

function openGame(unit, game, levelIndex) {
  current = { unit, game };
  $("home").hidden = true;
  $("game").hidden = false;
  $("hud-game").textContent = game.name;
  game.impl.start(unit, levelIndex, ui, closeGame);
}

function closeGame() {
  if (current) current.game.impl.stop();
  current = null;
  $("game").hidden = true;
  $("home").hidden = false;
  renderHome();
}

$("btn-back").addEventListener("click", closeGame);
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && current) closeGame(); });

renderHome();
