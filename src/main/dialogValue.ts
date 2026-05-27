export function getDialogValue(
  payload: { name: string; value: string }[],
  name: string
): string {
  return payload.find(item => item.name === name)?.value || ''
}

export function parseDialogPositiveInteger(
  value: string,
  fallback: number,
  min: number
): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.max(min, Math.floor(parsed))
}

export function parseDialogOptionalInteger(value: string): number | null {
  const normalized = value.trim()
  if (!normalized) return null
  const parsed = Number(normalized)
  if (!Number.isFinite(parsed)) return null
  return Math.max(0, Math.floor(parsed))
}

export function parseDialogNumberList(value: string): number[] {
  return value
    .split(/[\s,，]+/)
    .map(item => Number(item))
    .filter(item => Number.isFinite(item) && item > 0)
    .map(item => Math.floor(item))
}
