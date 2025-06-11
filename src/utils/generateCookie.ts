export function generateCookie(pairs: [string, string | undefined][]): string {
  return pairs
    .filter((pair) => pair[1] !== undefined)
    .map(([key, value]) => `${key}=${value}`)
    .join('; ')
}
