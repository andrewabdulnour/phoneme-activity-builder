export const THEME_COOKIE = "phoneme-theme";
export const LAYOUT_COOKIE = "phoneme-layout";
const ONE_YEAR = 60 * 60 * 24 * 365;

export function readCookie(name) {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
  return match ? decodeURIComponent(match[1]) : null;
}

export function writeCookie(name, value) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${ONE_YEAR}; samesite=lax`;
}

// Inline, render-blocking script string: applied before hydration so the
// page never flashes the wrong theme. Reads cookies directly (no server
// round trip needed) and mirrors the choice onto <html>.
export const THEME_INIT_SCRIPT = `(function () {
  try {
    function getCookie(name) {
      var match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
      return match ? decodeURIComponent(match[1]) : null;
    }
    var theme = getCookie('${THEME_COOKIE}') || 'system';
    var layout = getCookie('${LAYOUT_COOKIE}') || 'comfortable';
    var systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var isDark = theme === 'dark' || (theme === 'system' && systemDark);
    document.documentElement.classList.toggle('dark', isDark);
    document.documentElement.setAttribute('data-layout', layout);
  } catch (e) {}
})();`;
