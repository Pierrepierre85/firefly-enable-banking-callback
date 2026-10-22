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

  function hasCallbackData() {
    return window.location.search.length > 1 || window.location.hash.length > 1;
  }

  function showConfigured(target) {
    status.textContent = `Callback ingesteld op ${target}. Start de bankkoppeling vanuit de Firefly III Data Importer.`;
  }

  // Factuurmaker includes a server-verified one-time state with its local return
  // address. It must not inherit an older importer's browser preference.
  const returnedStates = new URLSearchParams(window.location.search).getAll('state');
  if (returnedStates.some(value => value.startsWith('fm2_'))) {
    try {
      if (returnedStates.length !== 1) throw new Error('Ambiguous callback state');
      const state = returnedStates[0];
      const encoded = state.slice(4);
      if (state.length > 200 || !/^[A-Za-z0-9_-]+$/.test(encoded)) throw new Error('Invalid callback state');
      const binary = atob(encoded.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - encoded.length % 4) % 4));
      const packet = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(binary, value => value.charCodeAt(0))));
      if (!packet || typeof packet.target !== 'string' || typeof packet.nonce !== 'string' || !/^[A-Za-z0-9_-]{32,128}$/.test(packet.nonce)) throw new Error('Invalid callback packet');
      if (packet.target !== packet.target.trim() || /[\u0000-\u0020\u007f]/.test(packet.target)) throw new Error('Invalid callback target');
      const target = new URL(packet.target);
      const octets = target.hostname.split('.');
      const ipv4 = octets.length === 4 && octets.every(value => /^\d{1,3}$/.test(value) && Number(value) <= 255);
      const localIp = ipv4 && (Number(octets[0]) === 10 || Number(octets[0]) === 127 || Number(octets[0]) === 192 && Number(octets[1]) === 168 || Number(octets[0]) === 172 && Number(octets[1]) >= 16 && Number(octets[1]) <= 31);
      if (!['http:', 'https:'].includes(target.protocol) || !(localIp || target.hostname === 'localhost' || target.hostname === '[::1]') || target.pathname !== '/eb-callback' || target.search || target.hash || target.username || target.password) throw new Error('Non-local callback target');
      const next = destination(target.href);
      status.textContent = 'Je wordt doorgestuurd naar Factuurmaker…';
      setup.hidden = true;
      continueLink.href = next;
      continueLink.hidden = false;
      window.location.replace(next);
    } catch {
      status.textContent = 'Deze bankterugkeer is ongeldig. Start de bankkoppeling opnieuw vanuit Factuurmaker.';
      setup.hidden = true;
      continueLink.hidden = true;
    }
    return;
  }

  const saved = localStorage.getItem(storageKey) || '';
  if (validLocalTarget(saved)) {
    if (hasCallbackData()) {
      redirect(saved);
    } else {
      showConfigured(saved);
    }
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
    if (hasCallbackData()) {
      redirect(value);
    } else {
      setup.hidden = true;
      showConfigured(value);
    }
  });
})();
