/* [fixC] Forgiving search for the People page (stars.js) and the library (site.js): one phonetic key for both sides, so Raam, Ram and
   Rāma meet, Laxman finds Lakshmana, Krishn finds Krishna and Hanumanji finds Hanuman; a few words a reader may use for a theme (love,
   monkey) look for the words the pages use; a slip of one letter still finds the name. Plain functions on window.SpritualFind; the pages
   work without this file (they fall back to the exact match they had). */
(() => {
  'use strict';
  // the key: diacritics and capitals go; Hindi's two spellings of a nasal meet; ksh/x, sh, aspirates (dh, bh, th ...), long vowels,
  // w/v and doubled letters are folded, so a reader's spelling and the page's land on the same letters
  const fold = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').normalize('NFC')
    .replace(/[ङञणनम]्(?=[क-ह])/g, 'ं').replace(/ँ/g, 'ं').toLowerCase()
    .replace(/ksh|x/g, 'ks').replace(/sh/g, 's').replace(/([bcdgjkpt])h/g, '$1')
    .replace(/aa/g, 'a').replace(/ee|ii/g, 'i').replace(/oo|uu/g, 'u').replace(/w/g, 'v').replace(/([a-z])\1+/g, '$1');
  // words a person puts in front of a name or after it, which are not part of it (Shri Ram, Hanumanji, भगवान राम, हनुमान जी)
  const HON = /^(sri|lord|bagvan|bagavan|mata|ji|श्री|भगवान|प्रभु|माता|जी)$/;
  const stem = (w) => (w.length >= 5 && /ji$/.test(w) ? w.slice(0, -2) : w.length >= 4 && /जी$/.test(w) ? w.slice(0, -2) : w);
  const key = (s) => fold(s).replace(/[^\p{L}\p{M}\p{N}]+/gu, ' ').trim();   // a page's text as the words it is searched by
  const words = (raw) => { const w = fold(raw).split(/[^\p{L}\p{M}\p{N}]+/u).filter(Boolean); const rest = w.filter((x) => !HON.test(x)); return (rest.length ? rest : w).map(stem); };
  let SYN = {};
  const setSyn = (o) => { SYN = {}; for (const k of Object.keys(o || {})) SYN[fold(k)] = String(o[k]).split(/\s+/).map(fold).filter(Boolean); };
  // [fixS] FEELINGS: a word a reader uses for what they carry, and the library values the stories for it are about (matched against a story's own value list)
  let FEEL = {};
  const setFeel = (o) => { FEEL = {}; for (const k of Object.keys(o || {})) FEEL[fold(k)] = String(o[k]).split(/\s+/).filter(Boolean); };
  const feel = (w) => FEEL[w] || null;
  // the number of edits between two short words, given up once it is past `max`
  const lev = (a, b, max) => {
    if (Math.abs(a.length - b.length) > max) return max + 1;
    let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
    for (let i = 1; i <= a.length; i++) {
      const cur = [i]; let low = i;
      for (let j = 1; j <= b.length; j++) { const v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); cur[j] = v; if (v < low) low = v; }
      if (low > max) return max + 1; prev = cur;
    }
    return prev[b.length];
  };
  // How well one query word is found in a folded haystack (words apart by spaces): 0 not at all, 1 a slip of a letter, 2 as a
  // theme word, 3 inside a word, 4 at the start of a word, 5 the whole word. A short word (up to three letters) must start a word:
  // "ram" is not Dr-AM-a and "kr" is not Shu-KR-acharya.
  const find = (hay, w, fuzzy) => {
    const h = ' ' + hay + ' ';
    const at = (x) => { if (h.includes(' ' + x + ' ')) return 5; if (h.includes(' ' + x)) return 4; return x.length > 3 && h.includes(x) ? 3 : 0; };
    // [fixS] a feeling word of up to four letters ("sad") is found as itself only, not as the start of another word ("sadhu"); its values do the rest
    let best = FEEL[w] && w.length <= 4 ? (h.includes(' ' + w + ' ') ? 5 : 0) : at(w);
    if (best >= 4) return best;
    for (const e of SYN[w] || []) if (at(e) >= (e.length > 3 ? 4 : 5)) { best = Math.max(best, 2); break; }
    if (best || !fuzzy || w.length < 6 || /[^\x00-\x7f]/.test(w)) return best;
    const max = w.length >= 9 ? 2 : 1;   // [fixS] one slip is forgiven from six letters (money is not monkey), two from nine
    for (const hw of hay.split(' ')) { if (hw.length < 3) continue; if (lev(w, hw, max) <= max || (hw.length > w.length && lev(w, hw.slice(0, w.length), max) <= max)) return 1; }
    return 0;
  };
  window.SpritualFind = { fold, key, words, find, setSyn, setFeel, feel, lev };
})();
