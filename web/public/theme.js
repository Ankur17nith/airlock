// Apply the saved theme before first paint (a file, not inline, because the CSP forbids inline scripts).
try { var t = localStorage.getItem('airlock-theme'); if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t } catch (e) {}
