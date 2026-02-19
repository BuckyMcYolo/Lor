/**
 * Converts a string to a URL-safe slug.
 * Lowercases, strips non-alphanumeric chars, collapses spaces/dashes,
 * trims leading/trailing hyphens, and enforces a max length.
 */
export function sluggify(value: string, maxLength = 50): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLength)
}
