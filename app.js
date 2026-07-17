(() => {
  'use strict';

  const storageKey = 'local-bank-callback-url';
  const status = document.querySelector('#status');
  const setup = document.querySelector('#setup');
  const targetInput = document.querySelector('#target');
  const continueLink = document.querySelector('#continue');

  function validLocalTarget(value) {
    try {
      const url = new URL(value);
      const host = url.hostname;
      const privateHost = host === 'localhost' || host === '127.0.0.1' ||
        /^10\./.test(host) || /^192\.168\./.test(host) ||
        /^172\.(1[6-9]|2\d|3[01])\./.test(host);
      return url.protocol === 'http:' && privateHost && url.pathname.endsWith('/eb-callback');
    } catch {
      return false;
    }
  }

  function destination(target) {
    const url = new URL(target);
    url.search = window.location.search;
    url.hash = window.location.hash;
    return url.toString();
  }

  function redirect(target) {
    const next = destination(target);
    status.textContent = 'Je wordt doorgestuurd naar de lokale importer…';
    continueLink.href = next;
    continueLink.hidden = false;
    window.location.replace(next);
  }

  const saved = localStorage.getItem(storageKey) || '';
  if (validLocalTarget(saved)) {
    redirect(saved);
    return;
  }

  status.textContent = 'Vul eenmalig de lokale callback-URL van je importer in.';
  setup.hidden = false;
  setup.addEventListener('submit', (event) => {
    event.preventDefault();
    const value = targetInput.value.trim();
    if (!validLocalTarget(value)) {
      targetInput.setCustomValidity('Gebruik een lokaal http-adres dat eindigt op /eb-callback.');
      targetInput.reportValidity();
      return;
    }
    targetInput.setCustomValidity('');
    localStorage.setItem(storageKey, value);
    redirect(value);
  });
})();
