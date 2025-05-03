export function hasPathParamOptions(
  options: unknown,
): options is { params: Record<string, string> } {
  return typeof options === 'object' && options !== null && 'params' in options
}
