/**
 * The loading screen (#loader, inline in index.html) stays over the game until the first
 * screen is ready: the font and every picture on it (the model's layers). Its bar shows how
 * many of those pictures have arrived. It shows at least MIN_MS, so it never just flickers,
 * and goes away after MAX_MS whatever happens, so a slow network never traps the player.
 * The Yandex Games "ready" signal belongs here too, once the SDK is in.
 */
const MIN_MS = 600;
const MAX_MS = 8000;

export function hideLoaderWhenReady(root: HTMLElement) {
  const loader = document.getElementById('loader');
  if (!loader) return;
  const bar = loader.querySelector<HTMLElement>('.ld-bar i');
  const started = performance.now();
  let fontsReady = !document.fonts;
  document.fonts?.ready.then(() => { fontsReady = true; });

  const finish = () => {
    clearInterval(timer);
    if (bar) bar.style.width = '100%';
    setTimeout(() => {
      loader.classList.add('done');
      setTimeout(() => loader.remove(), 600);
    }, 150);
  };

  const timer = setInterval(() => {
    const imgs = [...root.querySelectorAll('img')];
    const loaded = imgs.filter((i) => i.complete).length;
    // the bar: a little for the script, the rest for the pictures
    const share = imgs.length ? loaded / imgs.length : 0;
    if (bar) bar.style.width = `${Math.round(15 + 80 * share)}%`;
    const elapsed = performance.now() - started;
    // a screen without pictures counts as ready once the script has had a moment to draw it
    const ready = fontsReady && (imgs.length ? loaded === imgs.length : elapsed > 1500);
    if ((ready && elapsed >= MIN_MS) || elapsed >= MAX_MS) finish();
  }, 100);
}
