interface WpMediaResponse {
  id: number
  source_url: string
}

interface WpPostResponse {
  id: number
  link: string
  status: string
}

// 末尾スラッシュを除去して二重スラッシュを防ぐ
function getBaseUrl(): string {
  return (process.env.WP_BASE_URL ?? '').replace(/\/+$/, '')
}

function getAuthHeader(): string {
  const credentials = `${process.env.WP_USERNAME}:${process.env.WP_APP_PASSWORD}`
  return `Basic ${Buffer.from(credentials).toString('base64')}`
}

// メディア（画像）をアップロード
export async function uploadMedia(
  imageBase64: string,
  filename: string
): Promise<WpMediaResponse> {
  // data URI から実MIMEを判定（Geminiはjpeg/png等を返しうる）
  const mime = imageBase64.match(/^data:(image\/[\w.+-]+);base64,/)?.[1] ?? 'image/png'
  const base64Data = imageBase64.replace(/^data:image\/[\w.+-]+;base64,/, '')
  const buffer = Buffer.from(base64Data, 'base64')

  // Content-DispositionヘッダーはASCIIのみ許可（非ASCIIはfetchが例外を投げる）
  const safeFilename =
    filename.replace(/[^\x20-\x7E]/g, '').replace(/"/g, '') || 'featured.png'

  const response = await fetch(`${getBaseUrl()}/wp-json/wp/v2/media`, {
    method: 'POST',
    headers: {
      Authorization: getAuthHeader(),
      'Content-Type': mime,
      'Content-Disposition': `attachment; filename="${safeFilename}"`,
    },
    body: buffer,
  })

  if (!response.ok) {
    throw new Error(`メディアアップロード失敗: ${response.statusText}`)
  }

  return response.json()
}

// 記事を投稿
export async function publishPost(params: {
  title: string
  content: string
  excerpt: string
  status: 'publish' | 'draft' | 'future'
  date?: string
  categories?: number[]
  tags?: number[]
  featuredMediaId?: number
}): Promise<WpPostResponse> {
  const body: Record<string, unknown> = {
    title: params.title,
    content: params.content,
    excerpt: params.excerpt,
    status: params.status,
    categories: params.categories ?? [],
    tags: params.tags ?? [],
  }

  if (params.featuredMediaId) {
    body.featured_media = params.featuredMediaId
  }

  if (params.status === 'future' && params.date) {
    body.date = params.date
  }

  const response = await fetch(`${getBaseUrl()}/wp-json/wp/v2/posts`, {
    method: 'POST',
    headers: {
      Authorization: getAuthHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`投稿失敗: ${error.message ?? response.statusText}`)
  }

  return response.json()
}

// WordPressのカテゴリ一覧取得
export async function getCategories(): Promise<{ id: number; name: string }[]> {
  const response = await fetch(
    `${getBaseUrl()}/wp-json/wp/v2/categories?per_page=100`,
    {
      headers: { Authorization: getAuthHeader() },
    }
  )

  if (!response.ok) return []
  const data = await response.json()
  return data.map((c: { id: number; name: string }) => ({ id: c.id, name: c.name }))
}
