export type InputMethod = 'youtube' | 'file' | 'mic'
export type ArticleStatus = 'publish' | 'draft' | 'future'

export interface TranscribeResult {
  text: string
  duration?: number
  language?: string
}

export interface GeneratedArticle {
  titles: [string, string, string]
  body: string
  excerpt: string
  imagePrompt: string
}

export interface PublishConfig {
  title: string
  body: string
  excerpt: string
  status: ArticleStatus
  scheduledAt?: string
  categoryIds: number[]
  tags: string[]
  featuredImageId?: number
}

export interface AppState {
  step: 1 | 2 | 3 | 4 | 5
  inputMethod?: InputMethod
  transcription?: TranscribeResult
  article?: GeneratedArticle
  selectedTitle?: string
  editedBody?: string
  featuredImageUrl?: string
  featuredImageId?: number
  publishConfig?: PublishConfig
}
