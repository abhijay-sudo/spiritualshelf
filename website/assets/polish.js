/* Lane A finish (23 Nov 2026), about 1 KB. 1) a separator never stands at the start of a wrapped line: the first item on each line
   of the story's meta lines and a person's titles is marked (.sep-first, polish.css), live as the width changes. 2) which kind of
   input was last used, so a tap on Menu does not leave a keyboard ring on the first button in the sheet (data-input, polish.css).
   No network, no storage. */
(function () {
  'use strict';
  var d = document, root = d.documentElement;
  var BOXES = ['.cx-film-name a', '.cx-film-card > .cx-facts', '.cast-title-in', '.cx-open-left .cx-first'/* [int-a] its minutes, when they wrap under the label */];
  var mark = function (box) {
    var kids = box.children, prev = null;
    for (var i = 0; i < kids.length; i++) {
      var k = kids[i]; if (!k.offsetParent && getComputedStyle(k).position !== 'fixed') continue;   /* a hidden item (e.g. the other-script name on a phone) is skipped; the next shown item is still compared with the last shown one */
      var t = k.offsetTop, first = i > 0 && prev !== null && t >= prev - 2;   /* prev: the bottom of the last shown item; an item that starts at or below it opens a new line (items of different sizes on one line never do) */
      if (k.classList.contains('sep-first') !== first) k.classList.toggle('sep-first', first);
      prev = t + k.offsetHeight;
    }
  };
  var boxes = [];
  BOXES.forEach(function (s) { [].forEach.call(d.querySelectorAll(s), function (b) { boxes.push(b); }); });
  if (boxes.length) {
    var run = function () { boxes.forEach(mark); }, tick = 0;
    var later = function () { if (tick) return; tick = requestAnimationFrame(function () { tick = 0; run(); }); };
    run();
    if (window.ResizeObserver) { var lastW = {}, ro = new ResizeObserver(function (es) { var ch = false; es.forEach(function (e) { var w = Math.round(e.contentRect.width), i = boxes.indexOf(e.target); if (lastW[i] !== w) { lastW[i] = w; ch = true; } }); if (ch) later(); }); boxes.forEach(function (b) { ro.observe(b); }); } else addEventListener('resize', later);
    if (d.fonts && d.fonts.ready) d.fonts.ready.then(later);
  }
  addEventListener('pointerdown', function () { if (root.dataset.input !== 'pointer') root.dataset.input = 'pointer'; }, true);
  addEventListener('keydown', function (e) { if (e.key === 'Tab' || e.key.indexOf('Arrow') === 0) { if (root.dataset.input) delete root.dataset.input; } }, true);
})();
