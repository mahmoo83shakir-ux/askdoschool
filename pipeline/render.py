"""Renders an episode to a 1080×1920 MP4: HTML slides -> PNG, narration -> WAV, ffmpeg -> video."""
import asyncio
import html
import os
import ssl
import subprocess
import wave
from pathlib import Path

HERE = Path(__file__).resolve().parent
FONTS = HERE / "assets" / "fonts"
LETTERS = ["أ", "ب", "ج", "د"]
SAMPLE_RATE = 24000


def esc(text):
    return html.escape(str(text))


# ---------- slides ----------

def frame(ep, body, foot_note="حلقة جديدة كل يوم"):
    cfg = ep["config"]
    handle = f'<span class="ltr">{esc(cfg["handle"])}</span>' if cfg.get("handle") else f'<span>{esc(cfg.get("teacher", ""))}</span>'
    return f"""
<section class="slide">
  <div class="head">
    <div class="brand">{esc(cfg["series_title_ar"])}<small>{esc(cfg["series_subtitle_ar"])}</small></div>
    <div class="ep">الحلقة {ep["number"]}</div>
  </div>
  <div class="card">{body}</div>
  <div class="foot">{handle}<b>{esc(foot_note)}</b></div>
</section>"""


def build_slides(ep):
    """Returns [(html, narration)], narration being [(lang, text, pause_after_seconds)]."""
    terms, quiz = ep["terms"], ep["quiz"]
    slides = []

    rows = "".join(f'<div><span class="en ltr">{esc(t["en"])}</span><span class="ar">{esc(t["ar"])}</span></div>' for t in terms)
    intro = f"""
<div class="big-emoji">{"".join(esc(t.get("emoji", "")) for t in terms)}</div>
<div class="hero">{"مراجعة اليوم" if ep["review"] else "مصطلحات اليوم"}</div>
<div class="unit">{esc(terms[0]["unit_title"])}</div>
<div class="list">{rows}</div>"""
    slides.append((frame(ep, intro), [("ar", ep["hook"], 0.6)]))

    for i, t in enumerate(terms):
        dots = "".join(f'<i class="{"on" if j <= i else ""}"></i>' for j in range(len(terms)))
        body = f"""
<div class="pill">المصطلح {ep["ordinals"][i]}</div>
<div class="emoji">{esc(t.get("emoji", ""))}</div>
<div class="term-en ltr">{esc(t["en"])}</div>
<div class="term-ar">{esc(t["ar"])}</div>
<div class="rule"></div>
<div class="def-ar">{esc(t["def_ar"])}</div>
<div class="def-en ltr">{esc(t.get("def_en", ""))}</div>
{f'<div class="note"><span>مثال</span>{esc(t["example_ar"])}</div>' if t.get("example_ar") else ""}
<div class="dots">{dots}</div>"""
        narration = [
            ("ar", f"المصطلح {ep['ordinals'][i]}", 0.25),
            ("en", t["en"], 0.35),
            ("ar", f"{t['ar']}. {t['def_ar']}", 0.4),
        ]
        if t.get("example_ar"):
            narration.append(("ar", f"مثال: {t['example_ar']}", 0.4))
        narration.append(("en", t["en"], 0.8))
        slides.append((frame(ep, body), narration))

    def choices_html(reveal):
        out = []
        for j, c in enumerate(quiz["choices"]):
            cls = "choice" + ((" ok" if j == quiz["answer"] else " dim") if reveal else "")
            out.append(f'<div class="{cls}"><i>{LETTERS[j]}</i><span class="en ltr">{esc(c)}</span></div>')
        return "".join(out)

    question = f"""
<div class="pill">اختبر نفسك</div>
<div class="big-emoji">🤔</div>
<div class="q">{esc(quiz["question"])}</div>
<div class="choices">{choices_html(False)}</div>"""
    narration = [("ar", "اختبر نفسك.", 0.3), ("ar", quiz["question"], 0.5)]
    narration += [("en", c, 0.35) for c in quiz["choices"]]
    narration[-1] = (*narration[-1][:2], 3.0)  # thinking time before the answer
    slides.append((frame(ep, question, "اكتب جوابك في التعليقات"), narration))

    correct = quiz["choices"][quiz["answer"]]
    meaning = next((t["ar"] for t in terms if t["en"] == correct), "")
    answer = f"""
<div class="pill">الجواب</div>
<div class="big-emoji">✅</div>
<div class="choices">{choices_html(True)}</div>
{f'<div class="meaning">{esc(meaning)}</div>' if meaning else ""}"""
    narration = [("ar", "الجواب الصحيح هو", 0.2), ("en", correct, 0.3)]
    if meaning:
        narration.append(("ar", f"أي {meaning}", 0.6))
    slides.append((frame(ep, answer), narration))

    cfg = ep["config"]
    outro = f"""
<div class="big-emoji">🎉</div>
<div class="hero">أحسنت!</div>
<div class="cta">اكتب مصطلحات اليوم في دفترك<br>وراجعها قبل النوم</div>
<div class="list">{rows}</div>
{f'<div class="cta">العب وتعلّم على المنصة:<br><b class="ltr">{esc(cfg["platform_url"])}</b></div>' if cfg.get("platform_url") else ""}
<div class="cta"><b>نلتقي غداً في حلقة جديدة</b></div>"""
    slides.append((frame(ep, outro, "تابعنا"),
                   [("ar", "أحسنت! اكتب مصطلحات اليوم في دفترك، ونلتقي غداً في حلقة جديدة.", 1.0)]))
    return slides


def page_html(slides):
    faces = "".join(
        f'@font-face{{font-family:"{fam}";font-weight:{w};src:url("{(FONTS / f).as_uri()}");}}'
        for fam, w, f in [("Tajawal", 400, "Tajawal-Regular.ttf"), ("Tajawal", 500, "Tajawal-Regular.ttf"),
                          ("Tajawal", 700, "Tajawal-Bold.ttf"), ("Tajawal", 800, "Tajawal-ExtraBold.ttf"),
                          ("Lalezar", 400, "Lalezar-Regular.ttf")]
    )
    css = (HERE / "templates" / "slides.css").read_text(encoding="utf-8")
    body = "".join(s for s, _ in slides)
    return f'<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><style>{faces}{css}</style></head><body>{body}</body></html>'


def screenshot_slides(slides, out_dir):
    from playwright.sync_api import sync_playwright

    page_path = out_dir / "slides.html"
    page_path.write_text(page_html(slides), encoding="utf-8")
    pngs = []
    with sync_playwright() as p:
        launch = {"executable_path": os.environ["CHROMIUM_PATH"]} if os.environ.get("CHROMIUM_PATH") else {}
        browser = p.chromium.launch(**launch)
        page = browser.new_page(viewport={"width": 1080, "height": 1920})
        page.goto(page_path.as_uri())
        page.evaluate("document.fonts.ready")
        for i, el in enumerate(page.query_selector_all("section.slide")):
            png = out_dir / f"slide-{i:02d}.png"
            el.screenshot(path=str(png))
            pngs.append(png)
        browser.close()
    return pngs


# ---------- narration ----------

def tts_edge(text, voice, mp3):
    import edge_tts
    import edge_tts.communicate as comm

    # Behind a TLS-inspecting proxy (local runs), trust the CA bundle the environment points at.
    if os.environ.get("SSL_CERT_FILE"):
        comm._SSL_CTX = ssl.create_default_context(cafile=os.environ["SSL_CERT_FILE"])
    asyncio.run(edge_tts.Communicate(text, voice, rate="-5%").save(str(mp3)))


def tts_gtts(text, lang, mp3):
    from gtts import gTTS

    gTTS(text, lang=lang).save(str(mp3))


def synthesize(text, lang, voices, mp3):
    errors = []
    for fn, arg in ((tts_edge, voices[lang]), (tts_gtts, lang)):
        try:
            fn(text, arg, mp3)
            if mp3.exists() and mp3.stat().st_size > 0:
                return
        except Exception as exc:  # fall through to the next engine
            errors.append(f"{fn.__name__}: {exc}")
    raise RuntimeError("TTS failed: " + " | ".join(errors))


def to_wav(src, dst):
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(src), "-ac", "1", "-ar", str(SAMPLE_RATE),
                    "-sample_fmt", "s16", str(dst)], check=True)


def build_narration(narration, voices, out_dir, idx):
    """Concatenates TTS segments with pauses into one WAV; returns (path, seconds)."""
    frames = b""
    for j, (lang, text, pause) in enumerate(narration):
        mp3 = out_dir / f"n{idx:02d}-{j:02d}.mp3"
        wav = mp3.with_suffix(".wav")
        synthesize(text, lang, voices, mp3)
        to_wav(mp3, wav)
        with wave.open(str(wav)) as w:
            frames += w.readframes(w.getnframes())
        frames += b"\x00\x00" * int(SAMPLE_RATE * pause)
    frames = b"\x00\x00" * int(SAMPLE_RATE * 0.35) + frames  # lead-in so the fade does not clip speech
    path = out_dir / f"narration-{idx:02d}.wav"
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SAMPLE_RATE)
        w.writeframes(frames)
    return path, len(frames) / 2 / SAMPLE_RATE


# ---------- video ----------

def render(ep, out_dir):
    out_dir.mkdir(parents=True, exist_ok=True)
    slides = build_slides(ep)
    pngs = screenshot_slides(slides, out_dir)
    voices = ep["config"]["voices"]
    parts = []
    for i, ((_, narration), png) in enumerate(zip(slides, pngs)):
        wav, seconds = build_narration(narration, voices, out_dir, i)
        part = out_dir / f"part-{i:02d}.mp4"
        fade_out = max(seconds - 0.25, 0)
        subprocess.run([
            "ffmpeg", "-y", "-loglevel", "error", "-loop", "1", "-framerate", "30", "-i", str(png), "-i", str(wav),
            "-vf", f"scale=1080:1920,format=yuv420p,fade=t=in:st=0:d=0.25,fade=t=out:st={fade_out:.2f}:d=0.25",
            "-c:v", "libx264", "-preset", "medium", "-tune", "stillimage", "-crf", "20", "-r", "30",
            "-c:a", "aac", "-b:a", "128k", "-ar", "48000", "-t", f"{seconds:.2f}", str(part),
        ], check=True)
        parts.append(part)

    listing = out_dir / "parts.txt"
    listing.write_text("".join(f"file '{p.name}'\n" for p in parts), encoding="utf-8")
    video = out_dir / f"episode-{ep['date']}.mp4"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", str(listing),
                    "-c", "copy", "-movflags", "+faststart", str(video)], check=True)
    return video, pngs[0]
