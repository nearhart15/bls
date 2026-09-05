      (function () {
        try {
          var stored = localStorage.getItem('bls-theme');
          var theme = stored === 'light' || stored === 'dark'
            ? stored
            : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
          document.documentElement.setAttribute('data-bs-theme', theme);
        } catch (e) {}
      })();
