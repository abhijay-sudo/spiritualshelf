/* Spritual: reader hardening (third round, lane R). Loaded with `defer` on every story page. Small and self-contained.
   - G05: the meaning card of a tapped word (#gloss) stands by its word. It was position: fixed and stayed where it was put while the
     page scrolled, so it ended up over other words. It now closes when its word moves away (the page scrolled it more than a few lines),
     leaves the screen, or the words are no longer lit (a film beat that has gone). Escape and a tap outside already close it (native popover). */
(function () {
  var d = document, g = d.getElementById('gloss');
  if (!g) return;
  var btn = null, top0 = 0, y0 = 0, raf = 0, on = false;
  function shut() { try { g.hidePopover(); } catch (e) { g.hidden = true; } }
  function check() {
    raf = 0; if (!on || !btn) return;
    var r = btn.getBoundingClientRect(), blk = btn.closest('.fm-t'), lit = !blk || parseFloat(getComputedStyle(blk).opacity) > .35;
    var moved = Math.abs(r.top - top0) > 56 || Math.abs(scrollY - y0) > innerHeight * .9, off = !r.width || r.bottom < 40 || r.top > innerHeight - 12;
    if (moved || off || !lit) shut();
  }
  function tick() { if (!raf) raf = requestAnimationFrame(check); }
  g.addEventListener('toggle', function (e) {
    if (e.newState === 'open') {
      btn = d.querySelector('.term[aria-expanded="true"]'); if (!btn) return;
      top0 = btn.getBoundingClientRect().top; y0 = scrollY; if (!on) { on = true; addEventListener('scroll', tick, { passive: true }); }
    } else if (on) { on = false; btn = null; removeEventListener('scroll', tick); }
  });
})();
