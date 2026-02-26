/**
 * Conditional chunking per DECISIONS.md Section C.
 *
 * If content <= CHUNK_MIN_CHARS_BEFORE_SPLIT: 1 chunk (no split)
 * Else: split into chunks of CHUNK_TARGET_CHARS with CHUNK_OVERLAP_CHARS overlap
 */
export function chunkContent(content: string): string[] {
  const minChars = parseInt(
    process.env.CHUNK_MIN_CHARS_BEFORE_SPLIT ?? "2000"
  )
  const targetChars = parseInt(process.env.CHUNK_TARGET_CHARS ?? "1200")
  const overlapChars = parseInt(process.env.CHUNK_OVERLAP_CHARS ?? "150")

  if (content.length <= minChars) {
    return [content]
  }

  const chunks: string[] = []
  let start = 0
  while (start < content.length) {
    const end = Math.min(start + targetChars, content.length)
    chunks.push(content.slice(start, end))
    if (end >= content.length) break
    start = end - overlapChars
  }
  return chunks
}
