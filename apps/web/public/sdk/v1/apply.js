/* VouchNet Apply SDK v1 — dependency-free PKCE launcher for trusted career sites. */
(() => {
  const encoder = new TextEncoder();
  const toBase64Url = (bytes) => {
    let value = '';
    bytes.forEach((byte) => (value += String.fromCharCode(byte)));
    return btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  };
  const randomVerifier = () => {
    const bytes = new Uint8Array(48);
    crypto.getRandomValues(bytes);
    return toBase64Url(bytes);
  };
  const challengeFor = async (verifier) =>
    toBase64Url(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(verifier))));
  const origin = new URL(document.currentScript?.src || 'https://vouchnet.dev/sdk/v1/apply.js')
    .origin;

  class VouchApplyButton extends HTMLElement {
    connectedCallback() {
      if (this.shadowRoot) return;
      const clientId = this.getAttribute('client-id');
      const redirectUri = this.getAttribute('redirect-uri');
      if (!clientId || !redirectUri) {
        this.textContent = 'VouchNet configuration is incomplete.';
        return;
      }
      const root = this.attachShadow({ mode: 'open' });
      const theme = this.getAttribute('theme') === 'light' ? 'light' : 'dark';
      const size = this.getAttribute('size') === 'large' ? 'large' : 'medium';
      root.innerHTML = `<style>
        button{align-items:center;background:${theme === 'light' ? '#f8fbff' : '#073c35'};border:1px solid ${theme === 'light' ? '#bfd0ee' : '#0a5b50'};border-radius:8px;box-shadow:0 5px 14px #001a1630;color:${theme === 'light' ? '#17315d' : '#fff'};cursor:pointer;display:inline-flex;font:700 ${size === 'large' ? '15px' : '14px'} system-ui,sans-serif;gap:9px;padding:${size === 'large' ? '13px 18px' : '10px 14px'};transition:transform .15s ease,box-shadow .15s ease}button:hover{box-shadow:0 8px 20px #001a1645;transform:translateY(-1px)}button:focus-visible{outline:3px solid #8db6ff;outline-offset:2px}.mark{align-items:center;background:#31a477;border-radius:5px;color:white;display:inline-flex;font-weight:900;height:20px;justify-content:center;width:20px}</style><button type="button"><span class="mark">V</span>Apply with VouchNet</button>`;
      root
        .querySelector('button')
        .addEventListener('click', () => void this.launch(clientId, redirectUri));
    }
    async launch(clientId, redirectUri) {
      const verifier = randomVerifier();
      const challenge = await challengeFor(verifier);
      const state = toBase64Url(crypto.getRandomValues(new Uint8Array(24)));
      sessionStorage.setItem(`vouchnet:pkce:${state}`, verifier);
      const url = new URL('/oauth/authorize', origin);
      url.searchParams.set('response_type', 'code');
      url.searchParams.set('client_id', clientId);
      url.searchParams.set('redirect_uri', redirectUri);
      url.searchParams.set('scope', this.getAttribute('scope') || 'profile:read');
      url.searchParams.set('state', state);
      url.searchParams.set('code_challenge', challenge);
      url.searchParams.set('code_challenge_method', 'S256');
      const popup = window.open(
        url.toString(),
        'vouchnet_apply',
        'popup=yes,width=600,height=720,noopener',
      );
      if (!popup) window.location.assign(url.toString());
      this.dispatchEvent(new CustomEvent('vouch-apply-open', { bubbles: true, detail: { state } }));
    }
  }
  if (!customElements.get('vouch-apply-button'))
    customElements.define('vouch-apply-button', VouchApplyButton);
  window.VouchApply = { version: '1.0.0' };
})();
