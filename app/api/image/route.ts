import { NextRequest, NextResponse } from 'next/server'
import { generateFeaturedImage } from '@/lib/gemini'

export const maxDuration = 300 // Nano Banana Proの2K生成は60〜120秒かかる場合がある

export async function POST(req: NextRequest) {
  try {
    const { imagePrompt } = await req.json()

    if (!imagePrompt) {
      return NextResponse.json({ error: '画像プロンプトが必要です' }, { status: 400 })
    }

    const imageBase64 = await generateFeaturedImage(imagePrompt)
    return NextResponse.json({ image: imageBase64 })
  } catch (error) {
    console.error('Image generation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '画像生成に失敗しました' },
      { status: 500 }
    )
  }
}
