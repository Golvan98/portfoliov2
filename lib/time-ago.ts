const MINUTE = 60
const HOUR = 3600
const DAY = 86400

export function timeAgo(dateString: string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(dateString).getTime()) / 1000
  )

  if (seconds < 60) return "just now"
  if (seconds < HOUR) {
    const m = Math.floor(seconds / MINUTE)
    return `${m}m ago`
  }
  if (seconds < DAY) {
    const h = Math.floor(seconds / HOUR)
    return `${h}h ago`
  }
  const d = Math.floor(seconds / DAY)
  if (d === 1) return "1 day ago"
  if (d < 7) return `${d} days ago`
  if (d < 14) return "1 week ago"
  const w = Math.floor(d / 7)
  return `${w} weeks ago`
}
