export function sanitize(input: string, maxLength = 200): string {
  return input.replace(/<[^>]*>?/g, '').trim().slice(0, maxLength);
}

export function sanitizeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
