import type { InteractivePostContent } from './model';

/**
 * Creates an opaque-origin document for the iframe runtime. This is defense in
 * depth with the iframe sandbox: network, navigation, forms, workers, media,
 * and access to the embedding VouchNet document are all unavailable.
 */
export function createSandboxDocument(content: InteractivePostContent): string {
  const stylesheet = content.css.replace(/<\/style/gi, '<\\/style');
  const script = content.javascript.replace(/<\/script/gi, '<\\/script');
  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="referrer" content="no-referrer">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; connect-src 'none'; media-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; worker-src 'none'">
<style>${stylesheet}</style></head><body>${content.html}<script>${script}</script></body></html>`;
}
