// Platform shell: home page (one card per unit in content/terms), game registry, progress in localStorage.
const UNITS = JSON.parse(document.getElementById("units-data").textContent);

// Every unit gets every game; a game with ready:false shows as "قريباً".
const GAMES = [
  { id: "term-lab", name: "مختبر المصطلحات", desc: "اسحب مكعب المصطلح الإنكليزي إلى منصة تعريفه العربي.", ready: true, impl: TermLab },
  { id: "atom-race", name: "سباق الذرات", desc: "سؤال سريع وثلاثة أبواب، اعبر من باب الجواب الصحيح.", ready: false },
  { id: "term-bank", name: "بنك المصطلحات", desc: "بطاقات تدور للحفظ: وجه إنكليزي، ووجه عربي مع التعريف.", ready: false },
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
function renderHome() {
  let termCount = 0, starsGot = 0, starsMax = 0;
  const cards = UNITS.map((u) => {
    termCount += u.terms.length;
    const games = GAMES.map((g) => {
      if (!g.ready) {
        return `<button class="game-card" type="button" disabled>
          <strong>${g.name}</strong><p>${g.desc}</p>
          <div class="meta"><span class="soon">قريباً</span></div></button>`;
      }
      const levels = g.impl.levelsOf(u.terms).length;
      const gp = gameProgress(u.id, g.id);
      const got = Object.values(gp.stars).reduce((a, b) => a + b, 0);
      starsGot += got; starsMax += levels * 3;
      return `<button class="game-card" type="button" data-unit="${esc(u.id)}" data-game="${g.id}">
        <strong>${g.name}</strong><p>${g.desc}</p>
        <div class="meta"><span>${num(levels)} مستويات</span><span class="stars" aria-label="${num(got)} من ${num(levels * 3)} نجوم">${starsHtml(Math.round((got / (levels * 3)) * 5), 5)}</span></div>
      </button>`;
    }).join("");
    return `<article class="unit">
      <div class="unit-head">
        <div><div class="unit-num">الفصل ${num(u.unit)}</div><h2>${esc(u.title_ar)}</h2><div class="unit-en">${esc(u.title_en)}</div></div>
        <span class="status ${u.status === "reviewed" ? "reviewed" : ""}">${u.status === "reviewed" ? "مطابق للكتاب" : "مسودة"}</span>
      </div>
      <div class="term-strip" aria-label="مصطلحات الفصل">${u.terms.map((t) => `<span>${esc(t.en)}</span>`).join("")}</div>
      <div class="games">${games}</div>
    </article>`;
  });
  cards.push(`<article class="unit placeholder"><h2>الفصول القادمة</h2>
    <p>كل فصل يضاف إلى ملف المصطلحات يظهر هنا تلقائياً مع ألعابه.</p></article>`);
  $("units").innerHTML = cards.join("");
  $("totals").innerHTML = `
    <span class="chip"><b>${num(UNITS.length)}</b> فصل</span>
    <span class="chip"><b>${num(termCount)}</b> مصطلح</span>
    <span class="chip"><b>${num(starsGot)}</b> / ${num(starsMax)} نجمة</span>`;
}

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
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (t.className = "toast"), 1600);
  },
  setScore(s) { $("hud-score").textContent = num(s); },
  setLevel(i, n) { $("hud-level").textContent = `${current.unit.title_ar} · المستوى ${num(i + 1)} من ${num(n)}`; },
  levelDone(r) {
    const gp = gameProgress(current.unit.id, current.game.id);
    gp.stars[r.levelIndex] = Math.max(gp.stars[r.levelIndex] || 0, r.stars);
    gp.best[r.levelIndex] = Math.max(gp.best[r.levelIndex] || 0, r.score);
    saveProgress();
    const last = r.levelIndex === r.levelCount - 1;
    const wrap = document.createElement("div");
    wrap.className = "sheet-wrap";
    wrap.innerHTML = `<div class="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title">
      <h3 id="sheet-title">${last ? "أنهيت الفصل!" : `أنهيت المستوى ${num(r.levelIndex + 1)}`}</h3>
      <div class="big-stars" aria-label="${num(r.stars)} من ٣ نجوم">${starsHtml(r.stars, 3)}</div>
      <p>${num(r.score)} نقطة · ${r.mistakes ? `${num(r.mistakes)} محاولة خاطئة` : "بلا أخطاء"}</p>
      <div class="learned">${r.items.map((t) => `<div><span>${esc(t.emoji || "")} ${esc(t.ar)}</span><bdi>${esc(t.en)}</bdi></div>`).join("")}</div>
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
