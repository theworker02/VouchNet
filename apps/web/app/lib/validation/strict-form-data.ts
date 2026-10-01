import 'server-only';

/** Rejects duplicate, file, and unknown fields before a route validates its typed values. */
export function strictFormDataRecord(
  form: FormData,
  allowedKeys: readonly string[],
): Record<string, string> {
  const allowed = new Set(allowedKeys);
  const output: Record<string, string> = {};
  for (const [key, value] of form.entries()) {
    if (!allowed.has(key) || typeof value !== 'string' || key in output)
      throw new Error('INVALID_FORM_DATA');
    output[key] = value;
  }
  return output;
}
