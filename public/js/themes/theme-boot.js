// Klassiek script in <head>: zet het laatst gebruikte thema (en zijn CSS) vóór de eerste tekenbeurt, zodat de pagina niet flitst.
try {
  const applied = JSON.parse(localStorage.getItem('lan:theme:applied'));
  if (applied && applied.id) {
    document.documentElement.dataset.theme = applied.id;
    if (applied.css) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = applied.css;
      link.id = 'theme-css';
      document.head.append(link);
    }
  }
} catch { /* opslag niet beschikbaar of leeg: ThemeSelector zet het thema straks alsnog */ }
