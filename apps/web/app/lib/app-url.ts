/** Use the configured public origin for redirects; serverless adapters may expose an internal deploy URL. */
export function publicUrl(path: string, requestUrl: string): URL {
  const configuredAppUrl = process.env.APP_URL?.trim();
  return new URL(path, configuredAppUrl || requestUrl);
}
