// Spiritual: story motion (story lane), the small script behind motion-story.css. Progressive: the page is whole without it.
// It marks the story title so the gold rule may sit under it, on the side the title is set (left, or centred on a phone).
(() => {
  const h = document.querySelector('.cx-film-title'); if (!h) return;
  const mark = () => { h.classList.add('ms-rule'); h.classList.toggle('ms-c', /center/.test(getComputedStyle(h).textAlign)); };
  mark();
  let t = 0; addEventListener('resize', () => { clearTimeout(t); t = setTimeout(mark, 200); }, { passive: true });
})();
