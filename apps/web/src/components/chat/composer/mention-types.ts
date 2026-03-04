export interface MentionCandidate {
  id: string
  label: string
  search?: string
  name?: string
  username?: string | null
  displayUsername?: string | null
  image?: string | null
}
