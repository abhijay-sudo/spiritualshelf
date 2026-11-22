(function () {
var ui = {}; try { ui = JSON.parse(document.getElementById('ui').textContent); } catch (e) {}
var list = document.querySelector('[data-offline-list]');
var some = document.querySelector('[data-offline-some]'), none = document.querySelector('[data-offline-none]');
var retry = document.querySelector('[data-offline-retry]');
if (retry) retry.addEventListener('click', function () { location.reload(); });
var asked = /\/stories\/[\w-]+\/?$/.test(location.pathname) ? location.pathname.replace(/\/?$/, '/') : '';
if (asked && ui.nsTitle) {
var h = document.querySelector('.cx-h2'); if (h) h.textContent = ui.nsTitle;
document.title = ui.nsTitle + ' | Spritual';
if (some) some.textContent = ui.nsBody; if (none) none.textContent = ui.nsBody;
} else if (none && ui.noneBody) none.textContent = ui.noneBody;
if (!list || !ui.stories || !('caches' in window)) return;
var last = null; try { last = JSON.parse(localStorage.getItem('spritual:last') || 'null'); } catch (e) {}
var lastSlug = last && (last.slug || last.s);
var slugs = Object.keys(ui.stories);
var has = function (url) { return url ? caches.match(url, { ignoreSearch: true }).then(function (r) { return !!r; }, function () { return false; }) : Promise.resolve(false); };
var art = function (url) {
if (!url) return Promise.resolve('');
var base; try { base = new URL(url, location.href).pathname.replace(/-\d+\.webp$/, '-'); } catch (e) { return Promise.resolve(''); }
return caches.keys().then(function (ks) { return Promise.all(ks.map(function (k) { return caches.open(k).then(function (c) { return c.keys(); }); })); }).then(function (all) {
var best = null;
all.forEach(function (rs) { rs.forEach(function (r) { var p = new URL(r.url).pathname, m = /-(\d+)\.webp$/.exec(p); if (m && p.indexOf(base) === 0 && p.length === base.length + m[1].length + 5) { var w = +m[1]; if (!best || Math.abs(w - 480) < Math.abs(best.w - 480)) best = { w: w, u: r.url }; } }); });
return best ? best.u : '';
}, function () { return ''; });
};
Promise.all(slugs.map(function (slug) {
var s = ui.stories[slug];
return has(s.h).then(function (ok) { return ok ? art(s.p).then(function (pic) { return { slug: slug, s: s, pic: pic }; }) : null; });
})).then(function (found) {
found = found.filter(Boolean);
found.sort(function (a, b) { return (b.slug === lastSlug) - (a.slug === lastSlug); });
if (!found.length) return;
found.forEach(function (f) {
var li = document.createElement('li'); var a = document.createElement('a');
a.className = 'off-item'; a.href = f.s.h;
var pic = document.createElement('span'); pic.className = 'off-pic'; pic.setAttribute('aria-hidden', 'true');
if (f.pic) { var im = document.createElement('img'); im.src = f.pic; im.alt = ''; im.width = 96; im.height = 96; im.decoding = 'async'; pic.appendChild(im); }
var txt = document.createElement('span'); txt.className = 'off-txt';
if (f.slug === lastSlug && ui.offLast) { var k = document.createElement('small'); k.textContent = ui.offLast; txt.appendChild(k); }
var t = document.createElement('strong'); t.textContent = f.s.t; txt.appendChild(t);
a.appendChild(pic); a.appendChild(txt); li.appendChild(a); list.appendChild(li);
});
if (some) some.hidden = false; if (none) none.hidden = true;
});
})();
