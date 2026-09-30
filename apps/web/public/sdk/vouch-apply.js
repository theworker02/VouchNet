(() => {
  const mount = (host) => {
    const clientId = host.dataset.clientId;
    const redirectUri = host.dataset.redirectUri;
    if (!clientId || !redirectUri) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'Apply with VouchNet';
    button.style.cssText =
      'border:0;border-radius:8px;padding:11px 16px;background:#073c35;color:#fff;font:600 14px system-ui;cursor:pointer;box-shadow:0 2px 8px #0003';
    button.onclick = () => {
      const url = new URL('/oauth/authorize', 'https://vouchnet.dev');
      url.searchParams.set('response_type', 'code');
      url.searchParams.set('client_id', clientId);
      url.searchParams.set('redirect_uri', redirectUri);
      url.searchParams.set('scope', host.dataset.scope || 'profile:read');
      const popup = window.open(url.toString(), 'vouch_apply', 'width=600,height=700,noopener');
      if (!popup) window.location.assign(url.toString());
    };
    host.replaceChildren(button);
  };
  document.querySelectorAll('[data-vouch-apply]').forEach(mount);
})();
