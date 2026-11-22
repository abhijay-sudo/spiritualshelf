// Spritual (lane F): Listening that follows. The device's own voice (speechSynthesis; nothing is recorded, nothing leaves the
// phone: only voices the device runs itself are used) reads the story one SENTENCE at a time. The sentence being spoken is
// softly lit in the text (CSS Custom Highlight API: a quiet gold underline and glow; never a bouncing word), the film moves on
// with the voice, and a small bar offers pause, speed, a sleep timer and a plain Stop. It takes over the [data-listen] buttons
// that site.js already wires; if this file never loads, site.js's older paragraph-by-paragraph Listen still works.
// iOS Safari: the first sentence is spoken inside the tap (speech is refused otherwise); one short utterance at a time (long
// ones are cut off); "pause" is a cancel that remembers the sentence (Safari's own pause/resume is unreliable); a tab that is
// hidden, or an interruption (a call, Siri), pauses and waits for a tap: it never starts by itself.
(() => {
  const d = document, root = d.documentElement, R = window.SpritualReader, synth = window.speechSynthesis;
  if (!R) return;
  const { UI, scenes, total, store } = R, hi = UI.lang === 'hi';
  const $ = (s, r = d) => r.querySelector(s), $$ = (s, r = d) => [...r.querySelectorAll(s)];
  const still = () => R.reduced();
  const S = hi ? {
    region: 'सुनना', scene: (n, t) => `दृश्य ${n} / ${t}`, pause: 'रोकें', resume: 'जारी रखें', speed: 'गति', sleep: 'नींद का टाइमर', sleepOff: 'बंद', min: (n) => `${n} मिनट`, sleepIn: (n) => `${n} मिनट में रुकेगा`,
    stop: 'बंद करें', stopLong: 'सुनना बंद करें', away: 'रुका हुआ है। आगे सुनने के लिए दबाएँ।', slept: 'टाइमर पूरा हुआ। अब विश्राम कीजिए।', lang: { hi: 'हिन्दी', en: 'अंग्रेज़ी' },
    noVoiceT: (l, ph) => `${ph ? 'आपके फ़ोन में' : 'इस डिवाइस में'} ${l} आवाज़ नहीं है`,
    noVoiceN: (ph) => `कथा में कोई कमी नहीं है; बस ${ph ? 'इस फ़ोन' : 'इस डिवाइस'} पर इसे बोलकर सुनाया नहीं जा सकता। सेटिंग में बोली गई सामग्री (Spoken Content) या टेक्स्ट-टू-स्पीच (Text-to-speech) में जाकर आवाज़ जोड़ी जा सकती है। तब तक इसे पढ़ लें।`,
    read: 'पढ़ लेते हैं', close: 'छोड़ें', keepOn: 'सुनते समय स्क्रीन चालू रखें; फ़ोन लॉक होते ही आवाज़ रुक जाती है।', na: 'इस ब्राउज़र में सुनने की सुविधा उपलब्ध नहीं है।', naN: 'कथा पढ़ने के लिए यहीं है।', fail: 'आवाज़ शुरू नहीं हो सकी। फिर से दबाकर देखें।',
  } : {
    region: 'Listening', scene: (n, t) => `Scene ${n} of ${t}`, pause: 'Pause', resume: 'Resume', speed: 'Speed', sleep: 'Sleep timer', sleepOff: 'Off', min: (n) => `${n} min`, sleepIn: (n) => `Stops in ${n} min`,
    stop: 'Stop', stopLong: 'Stop listening', away: 'Paused. Tap to carry on.', slept: 'Sleep timer finished. Rest well.', lang: { hi: 'Hindi', en: 'English' },
    noVoiceT: (l, ph) => `${ph ? 'Your phone' : 'This device'} has no ${l} voice`,
    noVoiceN: (ph) => `Nothing is wrong with the story: it just cannot be spoken on ${ph ? 'this phone' : 'this device'} yet. A voice can be added in the settings (on iPhone: Accessibility, Spoken Content, Voices). Until then, it reads well on its own.`,
    read: 'Read it instead', close: 'Close', keepOn: 'Keep the screen on while listening: the phone stops speaking when it locks.', na: 'Read-aloud is not available in this browser.', naN: 'The story is here to read.', fail: 'The voice could not start. Tap to try again.',
  };
  const nb = (x) => x.replace(/ (\S+)$/u, '\u00a0$1'), phone = () => { try { return matchMedia('(pointer:coarse)').matches; } catch { return true; } };
  const RATES = [0.8, 1, 1.2, 1.5], SLEEPS = [0, 10, 20, 30];
  const prefs = () => store.get('listen', {}); let rate = RATES.includes(prefs().rate) ? prefs().rate : 1;
  const HL = typeof Highlight !== 'undefined' && !!(window.CSS && CSS.highlights);

  /* ---------- the voice: the best one this device runs itself, for the language being read ---------- */
  const NOVELTY = /^(Albert|Bad News|Bahh|Bells|Boing|Bubbles|Cellos|Good News|Jester|Organ|Superstar|Trinoids|Whisper|Wobble|Zarvox|Eddy|Flo|Grandma|Grandpa|Reed|Rocko|Sandy|Shelley)\b/i;   // (macOS novelty voices and iOS's Eloquence voices: robotic)
  const norm = (v) => String(v.lang || '').replace('_', '-').toLowerCase();
  const pick = (L) => {
    if (!synth) return null; const want = L === 'hi' ? 'hi' : 'en';
    const vs = synth.getVoices().filter((v) => v.localService !== false && norm(v).slice(0, 2) === want && !NOVELTY.test(v.name));
    const score = (v) => { const l = norm(v), n = (v.name || '').replace(/\s*\(.*\)\s*$/, ''); let s = 0; if (l === `${want}-in`) s += 40; else if (want === 'en') s += { 'en-gb': 12, 'en-us': 8, 'en-au': 6 }[l] || 2;
      if (/premium|enhanced|neural|natural/i.test(n)) s += 10; if (/siri/i.test(n)) s += 6; if (/^(Rishi|Veena|Lekha|Daniel|Samantha|Karen|Moira|Tessa)\b/i.test(n)) s += 4; if (v.default) s += 2; return s; };
    return vs.sort((a, b) => score(b) - score(a))[0] || null;
  };
  // the device has said which voices it has, and none is fit for this language (an empty list means "not known yet": try)
  const lacks = (L) => !!synth && synth.getVoices().length > 0 && !pick(L);

  /* ---------- the text, in sentences, with their places in it ---------- */
  const textMap = (el) => {
    const nodes = []; let raw = ''; const w = d.createTreeWalker(el, NodeFilter.SHOW_TEXT, { acceptNode: (n) => (n.parentElement && n.parentElement.closest('[hidden],[aria-hidden="true"],.visually-hidden,script,style') && !el.isEqualNode(n.parentElement) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT) });
    for (let n = w.nextNode(); n; n = w.nextNode()) { nodes.push({ n, a: raw.length }); raw += n.nodeValue; }
    return { nodes, raw };
  };
  const SENT = /[^.!?।॥]+(?:[.!?।॥]+["”’')\]]*)|[^.!?।॥]+$/gu;
  const sentences = (raw) => {
    const out = [];
    for (const m of raw.matchAll(SENT)) {
      const lead = m[0].length - m[0].trimStart().length, a = m.index + lead, t = m[0].trim(); if (!t) continue;
      if (!/[\p{L}\p{N}]/u.test(t) && out.length) { out[out.length - 1].b = a + t.length; continue; }   // (a stray quote or mark rides with the sentence before it)
      out.push({ a, b: a + t.length });
    }
    // a very long sentence is spoken in two or three breaths, at a comma, so that no utterance runs long
    const fine = [];
    for (const s of out) {
      let a = s.a; const txt = raw.slice(s.a, s.b);
      while (s.b - a > 230) { const cut = raw.slice(a + 110, a + 230).search(/[,;:—–]\s/); if (cut < 0) break; const e = a + 110 + cut + 1; fine.push({ a, b: e }); a = e; while (/\s/.test(raw[a] || '')) a++; }
      fine.push({ a, b: s.b }); void txt;
    }
    return fine;
  };
  const clean = (t) => t.replace(/[ ­​]/g, (c) => (c === ' ' ? ' ' : '')).replace(/\s+/g, ' ').replace(/\.{2,}/g, '.').replace(/([.!?।])\s*\./g, '$1').trim();
  const rangeOf = (map, a, b) => {
    const r = d.createRange(); const at = (pos, end) => { for (const { n, a: s } of map.nodes) { const len = n.nodeValue.length; if (pos < s + len || (end && pos === s + len)) return [n, Math.max(0, pos - s)]; } const l = map.nodes[map.nodes.length - 1]; return l ? [l.n, l.n.nodeValue.length] : null; };
    const x = at(a, false), y = at(b, true); if (!x || !y) return null; r.setStart(...x); r.setEnd(...y); return r;
  };
  // every sentence of the story from scene `from` on: { n: scene, el, k: its place among the scene's items, a, b, text, first }
  // (a scene or two at a time, as the voice reaches them: a long story is not prepared in one go on a slow phone)
  const units = (from, items0, to = from) => {
    const out = [];
    for (let n = from; n <= to; n++) {
      const s = scenes[n - 1], L = R.readLang(), h = $(`h2[lang="${L}"]`, s);
      let items = (n === from && items0) || [...(h ? [h] : []), ...R.visibleParas(s)];
      items = items.filter((el) => el.textContent.trim());
      items.forEach((el, k) => { const map = textMap(el); sentences(map.raw).forEach((x, i) => { const text = clean(map.raw.slice(x.a, x.b)); if (text) out.push({ n, el, k, map, a: x.a, b: x.b, text, first: i === 0, kinds: items.length }); }); });
    }
    return out;
  };

  /* ---------- the player ---------- */
  const ICON = {
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z"/></svg>',
    pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13M16 5.5v13"/></svg>',
    stop: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/></svg>',
    moon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 14.6A7.6 7.6 0 0 1 9.4 5a7.6 7.6 0 1 0 9.6 9.6Z"/></svg>',
  };
  let bar, st = 'idle', list = [], builtTo = 0, i = 0, tok = 0, sleepAt = 0, sleepT = 0, sleepTick = 0, sleepM = 0, sleepDue = false, watch = 0, started = 0, noteT = 0, noVoiceUp = false, curEl = null, retried = 0, wd = 0;
  const btns = $$('[data-listen]');
  // while the film is on, the dock (and with it Listen) is out of the way: the reading-comfort sheet, which the Aa chip opens at any point, carries a Listen row
  const sheet = $('#comfort .sheet-title');
  if (sheet && UI.icPlay && !$('[data-listen-sheet]')) {
    const row = d.createElement('div'); row.className = 'lst-entry';
    row.setAttribute('role', 'group'); row.setAttribute('aria-labelledby', 'lst-entry-h');   // [fixR] a heading of its own, like every other group in the sheet
    row.innerHTML = `<p class="legend lst-entry-h" id="lst-entry-h">${S.region}</p><button type="button" data-listen data-listen-sheet>${UI.icPlay}<span>${UI.listen}</span></button><p class="lst-entry-n">${hi ? 'आपके फ़ोन की अपनी आवाज़ में। कुछ भी फ़ोन से बाहर नहीं जाता।' : 'In your phone’s own voice. Nothing leaves the phone.'}</p>`;
    ($('.sample', sheet.closest('form')) || sheet).before(row); btns.push($('[data-listen]', row));
  }
  const label = () => btns.forEach((b) => {
    const t = st === 'playing' ? UI.pauseListen : st === 'paused' ? UI.resume : UI.listen; const sp = b.querySelector('span'); if (sp) sp.textContent = t;
    b.setAttribute('aria-pressed', String(st === 'playing')); const ic = b.querySelector('svg.ic'), want = st === 'playing' ? UI.icPause : UI.icPlay; if (ic && want) ic.outerHTML = want;
  });
  const build = () => {
    if (bar) return bar; bar = d.createElement('div'); bar.className = 'lst'; bar.hidden = true; bar.setAttribute('role', 'region'); bar.setAttribute('aria-label', S.region);
    bar.innerHTML = `<div class="lst-pop" hidden role="group"></div>
      <div class="lst-row"><button type="button" class="lst-play" data-a="play">${ICON.pause}</button>
        <p class="lst-mid" role="status" aria-live="polite"><span class="lst-st"></span><span class="lst-sub" hidden></span></p>
        <button type="button" class="lst-chip lst-speed" data-a="speed" aria-haspopup="true" aria-expanded="false"></button>
        <button type="button" class="lst-chip lst-sleep" data-a="sleep" aria-haspopup="true" aria-expanded="false">${ICON.moon}<span class="lst-sl"></span></button>
        <button type="button" class="lst-off" data-a="stop" aria-label="${S.stopLong}">${ICON.stop}<span>${S.stop}</span></button></div>
      <div class="lst-nv" hidden><p class="lst-nt"></p><p class="lst-nn"></p><div class="lst-nb"><button type="button" class="lst-read" data-a="read">${S.read}</button><button type="button" class="lst-x" data-a="close" aria-label="${S.close}">${ICON.stop}</button></div></div>
      <i class="lst-prog" aria-hidden="true"></i>`;
    d.body.append(bar);
    bar.addEventListener('click', (e) => {
      const b = e.target.closest('[data-a]'); if (!b) { return; } const a = b.dataset.a;
      if (a === 'play') toggle(); else if (a === 'stop') stop(); else if (a === 'speed' || a === 'sleep') pop(a, b); else if (a === 'read') { closeNoVoice(true); } else if (a === 'close') closeNoVoice(false);
      else if (a === 'opt') choose(b);
    });
    bar.addEventListener('keydown', (e) => { if (e.key === 'Escape') { if (!$('.lst-pop', bar).hidden) { closePop(true); e.stopPropagation(); } else if (noVoiceUp) closeNoVoice(false); } });
    bar.addEventListener('focusout', (e) => { if (!$('.lst-pop', bar).hidden && e.relatedTarget && !bar.contains(e.relatedTarget)) closePop(false); });
    d.addEventListener('pointerdown', (e) => { if (!$('.lst-pop', bar).hidden && !e.target.closest('.lst')) closePop(false); }, true);
    return bar;
  };
  const show = (on) => {
    build(); const was = root.classList.contains('lst-on'); root.classList.toggle('lst-on', on); if (was !== on) requestAnimationFrame(() => window.SpritualFilmMeasure?.());   // (the film makes room for the bar, as it does for the dock)
    if (on) { bar.hidden = false; requestAnimationFrame(() => requestAnimationFrame(() => bar.classList.add('is-in'))); }
    else { bar.classList.remove('is-in'); const done = () => { if (!root.classList.contains('lst-on')) bar.hidden = true; }; if (still()) done(); else setTimeout(done, 340); }
  };
  const mid = (t, sub) => { if (!bar) return; const s = $('.lst-st', bar), n = $('.lst-sub', bar); if (t != null && s.textContent !== t) s.textContent = t; n.hidden = !sub; n.textContent = sub || ''; };
  const paintBar = () => {
    if (!bar) return; bar.dataset.state = st; const p = $('.lst-play', bar); p.innerHTML = st === 'playing' ? ICON.pause : ICON.play; p.setAttribute('aria-label', st === 'playing' ? S.pause : S.resume);
    $('.lst-speed', bar).textContent = `${rate}×`; $('.lst-speed', bar).setAttribute('aria-label', `${S.speed}: ${rate}×`);
    const mins = sleepAt ? Math.max(1, Math.ceil((sleepAt - Date.now()) / 6e4)) : 0, sl = $('.lst-sleep', bar);
    $('.lst-sl', bar).textContent = mins ? String(mins) : ''; sl.classList.toggle('is-on', !!mins); sl.setAttribute('aria-label', `${S.sleep}: ${mins ? S.sleepIn(mins) : S.sleepOff}`);
  };
  // a small row of choices that rises over the bar: speed, or the sleep timer
  let popFor = null;
  const pop = (kind, from) => {
    const box = $('.lst-pop', bar); if (popFor === kind && !box.hidden) return closePop(true);
    popFor = kind; const cur = kind === 'speed' ? rate : sleepM;
    box.setAttribute('aria-label', kind === 'speed' ? S.speed : S.sleep);
    box.innerHTML = (kind === 'speed' ? RATES : SLEEPS).map((v) => `<button type="button" data-a="opt" data-k="${kind}" data-v="${v}" aria-pressed="${v === cur}">${kind === 'speed' ? `${v}×` : v ? S.min(v) : S.sleepOff}</button>`).join('') + (kind === 'sleep' ? `<p class="lst-pn">${nb(S.keepOn)}</p>` : '');
    box.hidden = false; requestAnimationFrame(() => requestAnimationFrame(() => box.classList.add('is-in')));
    $$('.lst-chip', bar).forEach((c) => c.setAttribute('aria-expanded', String(c === from))); ($('[aria-pressed="true"]', box) || $('button', box)).focus({ preventScroll: true });
  };
  const closePop = (refocus) => {
    const box = $('.lst-pop', bar); if (box.hidden) return; box.classList.remove('is-in'); box.hidden = true; $$('.lst-chip', bar).forEach((c) => c.setAttribute('aria-expanded', 'false'));
    if (refocus && popFor) $(`.lst-${popFor}`, bar)?.focus({ preventScroll: true }); popFor = null;
  };
  const choose = (b) => {
    const kind = b.dataset.k, v = +b.dataset.v; closePop(true);
    if (kind === 'speed') { rate = v; store.set('listen', { ...prefs(), rate }); paintBar(); if (st === 'playing') speakAt(i); }   // (the sentence in hand begins again at the new pace)
    else setSleep(v);
  };
  const setSleep = (m) => {
    clearTimeout(sleepT); clearInterval(sleepTick); sleepDue = false; sleepAt = m ? Date.now() + m * 6e4 : 0; sleepM = m;
    if (m) { sleepT = setTimeout(() => { sleepT = 0; if (st === 'playing') sleepDue = true; else if (st !== 'idle') stop(S.slept); }, m * 6e4); sleepTick = setInterval(paintBar, 30000); }
    paintBar();
  };

  /* ---------- the sentence being spoken ---------- */
  let hlOn = null;
  const light = (u) => {
    if (HL) { const r = rangeOf(u.map, u.a, u.b); if (r) { CSS.highlights.set('spritual-listen', new Highlight(r)); hlOn = true; return; } }
    if (curEl !== u.el) { curEl?.classList.remove('is-speaking'); curEl = u.el; u.el.classList.add('is-speaking'); }
  };
  const unlight = () => { if (HL) CSS.highlights.delete('spritual-listen'); curEl?.classList.remove('is-speaking'); curEl = null; hlOn = null; };
  // where the page must go for the sentence: the film turns to the paragraph (it is a beat); a reading page moves only when it must
  const follow = (u) => {
    if (!u.first) return; const el = u.el;
    if (window.SpritualFilmReveal?.(el)) return;
    if (root.dataset.mode === 'leaf') return;
    const r = el.getBoundingClientRect(); const room = 100 + (bar && !bar.hidden ? bar.offsetHeight : 0);
    if (r.top < 72 || r.bottom > innerHeight - room) scrollBy({ top: r.top - (r.top < 72 ? 96 : Math.max(96, innerHeight * .3)), behavior: still() ? 'instant' : 'smooth' });
  };

  /* ---------- speaking: one sentence, then the next ---------- */
  const utter = (u) => {
    const L = R.readLang(), ut = new SpeechSynthesisUtterance(u.text); ut.lang = L === 'hi' ? 'hi-IN' : 'en-IN'; const v = pick(L); if (v) { ut.voice = v; ut.lang = String(v.lang || ut.lang).replace('_', '-'); } ut.rate = Math.min(2, Math.max(.5, .95 * rate)); return ut;
  };
  const speakAt = (k) => {
    while (k >= list.length - 2 && builtTo < total) { builtTo++; list.push(...units(builtTo)); }
    if (k >= list.length) return finish(); i = k; const u = list[k], my = ++tok; started = 0;
    if (root.dataset.mode === 'leaf' && u.first && u.k === 0) R.goTo(u.n, 1);
    const ut = utter(u);
    ut.onstart = () => { if (my !== tok) return; started = Date.now(); retried = 0; light(u); follow(u); mid(S.scene(u.n, total)); bar?.style.setProperty('--lst-p', ((u.n - 1 + (u.k + 1) / Math.max(1, u.kinds)) / total).toFixed(4)); };
    ut.onend = () => { if (my !== tok || st !== 'playing') return; if (sleepDue) return stop(S.slept); speakAt(k + 1); };
    ut.onerror = (e) => {
      if (my !== tok || st !== 'playing') return; const err = e && e.error;
      if (err === 'interrupted' || err === 'canceled') return away();                                   // (a call, Siri, another page: wait for a tap)
      if (err === 'not-allowed') return away(S.fail);
      if (retried++ < 2) speakAt(k + 1); else stop(S.fail);                                              // (an engine hiccup: skip the sentence; if it keeps on, say so)
    };
    // a cancel is only for a voice still talking (a new speed, a resume): never between sentences that ended on their own, and
    // the new sentence follows on the next tick (iOS loses an utterance spoken straight after cancel)
    if (synth.speaking || synth.pending) { synth.cancel(); setTimeout(() => { if (my === tok && st === 'playing') synth.speak(ut); }, 60); } else synth.speak(ut);
    if (!wd) wd = setInterval(sentenceLost, 1500);
    // a voice that never begins (Safari, when speech is not allowed or the engine is gone) must not leave a bar saying "listening"
    clearTimeout(watch); watch = setTimeout(() => { if (my === tok && st === 'playing' && !started && !synth.speaking && !synth.pending) away(S.fail); }, 1800);
  };
  // Safari sometimes loses a sentence's end: if nothing is speaking and nothing is waiting, go on (the check runs only while listening)
  const sentenceLost = () => { if (st !== 'playing') { clearInterval(wd); wd = 0; return; } if (started && !synth.speaking && !synth.pending && Date.now() - started > 900) { const my = tok; setTimeout(() => { if (my === tok && st === 'playing' && !synth.speaking && !synth.pending) { if (sleepDue) stop(S.slept); else speakAt(i + 1); } }, 700); } };

  // [fixR] the scene Listen starts from is read from the screen at the moment of the press (the film's own position, or the scene under the middle
  // of the viewport), never from the last value an observer happened to leave: after a quick scroll or a jump that value can lag behind
  const sceneNow = () => {
    if (root.dataset.mode === 'leaf') return R.current();
    const f = root.classList.contains('fm') ? window.SpritualFilmNow?.() : null;
    if (f) return f.ended ? total : Math.min(total, Math.max(1, Math.floor(f.at) || 1));
    let k = 0, mid = innerHeight * .4; scenes.forEach((sc, j) => { if (sc.getBoundingClientRect().top <= mid) k = j + 1; });
    return k || R.current();
  };
  const startPoint = () => {
    // from what is on the screen (the paragraph that begins in view), not back at the top of the scene
    const n = sceneNow(), s = scenes[n - 1], L = R.readLang(), h = $(`h2[lang="${L}"]`, s);
    let items = [...(h ? [h] : []), ...R.visibleParas(s)].filter((el) => el.textContent.trim());
    if (root.dataset.mode !== 'leaf') {
      let k = items.findIndex((el) => { const r = el.getBoundingClientRect(); return r.top >= 72 && r.top < innerHeight - 120; });
      if (k < 0) { k = items.findIndex((el) => el.getBoundingClientRect().bottom > 80); if (k >= 0 && items[k].getBoundingClientRect().top >= innerHeight) k = -1; }
      if (k > 0) items = items.slice(k);
    }
    builtTo = n; return units(n, items);
  };
  const start = () => {
    if (!synth || typeof SpeechSynthesisUtterance === 'undefined') return noVoice(S.na, S.naN);
    const L = R.readLang(); if (lacks(L)) return noVoice(S.noVoiceT(S.lang[L === 'hi' ? 'hi' : 'en'], phone()), S.noVoiceN(phone()));
    list = startPoint(); if (!list.length) return; retried = 0; sleepDue = false;
    st = 'playing'; label();
    speakAt(0);                                                                                           // (inside the tap: Safari allows speech from here on)
    // the bar is raised on the next frame, so that the tap itself does no layout work beyond the voice
    requestAnimationFrame(() => { if (st === 'idle') return; build(); closeNoVoice(false, true); show(true); paintBar(); mid(S.scene(list[i]?.n || R.current(), total)); bar.style.setProperty('--lst-p', '0'); });
  };
  // a bar that is hidden while it holds the keyboard's place would drop it at the top of the page: it goes back to Listen
  const keepFocus = () => { if (bar && bar.contains(d.activeElement)) { const b = btns.find((x) => x.offsetParent && getComputedStyle(x).visibility !== 'hidden'); (b || $('.fm-aa'))?.focus({ preventScroll: true }); } };
  const away = (note) => { if (st !== 'playing') return; tok++; clearTimeout(watch); try { synth.cancel(); } catch {} st = 'paused'; label(); paintBar(); mid(S.scene(list[i]?.n || R.current(), total), note || null); };
  const pauseNow = () => { if (st !== 'playing') return; tok++; clearTimeout(watch); try { synth.cancel(); } catch {} st = 'paused'; label(); paintBar(); mid(null, null); };
  const resume = () => { if (st !== 'paused') return; st = 'playing'; retried = 0; label(); paintBar(); mid(null, null); speakAt(i); };
  const toggle = () => { R.haptic(); if (st === 'idle') start(); else if (st === 'playing') pauseNow(); else resume(); };
  const finish = () => { clearTimeout(watch); keepFocus(); unlight(); st = 'idle'; tok++; label(); setSleep(0); show(false); };
  const stop = (note) => {
    keepFocus(); tok++; clearTimeout(watch); try { synth?.cancel(); } catch {} unlight(); st = 'idle'; label(); setSleep(0);
    if (typeof note === 'string' && note) { mid('', note); paintBar(); bar.dataset.state = 'note'; setTimeout(() => { if (st === 'idle') show(false); }, 6000); } else show(false);
  };

  /* ---------- no voice for this language (or no speech at all): said plainly, with a way to read instead ---------- */
  const noVoice = (title, note) => {
    build(); noVoiceUp = true; bar.dataset.state = 'novoice'; $('.lst-nt', bar).textContent = nb(title); $('.lst-nn', bar).textContent = nb(note); $('.lst-nv', bar).hidden = false; $('.lst-row', bar).hidden = true;
    show(true); $('.lst-read', bar).focus({ preventScroll: true });
  };
  const closeNoVoice = (readIt, quiet) => {
    if (!noVoiceUp) return; noVoiceUp = false; $('.lst-nv', bar).hidden = true; $('.lst-row', bar).hidden = false; if (quiet) return; bar.dataset.state = 'idle'; show(false);
    if (readIt && scrollY < innerHeight * .5) $('.cx-film-btns a[href="#page-1"]')?.click();
    btns[0]?.focus({ preventScroll: true });
  };

  btns.forEach((b) => b.addEventListener('click', (e) => { const kb = e.detail === 0; if (b.hasAttribute('data-listen-sheet')) b.closest('dialog')?.close(); toggle(); if (kb && st !== 'idle') requestAnimationFrame(() => requestAnimationFrame(() => { if (bar && !bar.hidden && st !== 'idle') $('.lst-play', bar)?.focus({ preventScroll: true }); })); }));
  // away from the page: the voice pauses (it will not go on by itself), and a page that is left is silenced
  d.addEventListener('visibilitychange', () => { if (d.hidden && st === 'playing') away(S.away); });
  addEventListener('pagehide', () => { try { synth?.cancel(); } catch {} });
  addEventListener('pageshow', (e) => { if (e.persisted && st !== 'idle') stop(); });
  window.SpritualListen = { owns: true, stop: () => { if (st !== 'idle') stop(); }, pick, active: () => st !== 'idle' };
})();
