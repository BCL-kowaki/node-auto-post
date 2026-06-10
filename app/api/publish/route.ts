import { NextRequest, NextResponse } from 'next/server'
import { uploadMedia, publishPost } from '@/lib/wordpress'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    // tags はWP REST APIではタグID（number[]）が必要なため、現状は転送しない
    const { title, content, excerpt, status, scheduledAt, featuredImageBase64, categoryIds } = body

    let featuredMediaId: number | undefined

    // アイキャッチ画像をWordPressにアップロード
    if (featuredImageBase64) {
      // ファイル名はASCII安全に正規化（日本語タイトルはHTTPヘッダーに使えないため）
      const asciiSlug = String(title)
        .toLowerCase()
        .replace(/[^\x00-\x7F]/g, '') // 非ASCII除去
        .replace(/[^a-z0-9]+/g, '-') // 英数字以外を-に
        .replace(/^-+|-+$/g, '') // 端の-除去
        .slice(0, 30)
      // 実MIMEから拡張子を決定（jpeg→jpg）
      const mimeExt = String(featuredImageBase64)
        .match(/^data:image\/([\w.+-]+);base64,/)?.[1]
        ?.replace('jpeg', 'jpg')
        ?.replace('svg+xml', 'svg')
      const ext = mimeExt ?? 'png'
      const filename = `${asciiSlug || 'featured'}-${Date.now()}.${ext}`
      const media = await uploadMedia(featuredImageBase64, filename)
      featuredMediaId = media.id
    }

    const post = await publishPost({
      title,
      content,
      excerpt,
      status,
      date: scheduledAt,
      categories: categoryIds,
      featuredMediaId,
    })

    return NextResponse.json({
      id: post.id,
      link: post.link,
      status: post.status,
    })
  } catch (error) {
    console.error('Publish error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '投稿に失敗しました' },
      { status: 500 }
    )
  }
}
