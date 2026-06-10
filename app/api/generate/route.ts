import { NextRequest, NextResponse } from 'next/server'
import { generateArticle, regenerateTitles } from '@/lib/gemini'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { transcription, action, currentTitles } = body

    if (!transcription) {
      return NextResponse.json({ error: '文字起こしテキストが必要です' }, { status: 400 })
    }

    if (action === 'regenerate_titles' && currentTitles) {
      const titles = await regenerateTitles(transcription, currentTitles)
      return NextResponse.json({ titles })
    }

    const article = await generateArticle(transcription)
    return NextResponse.json(article)
  } catch (error) {
    console.error('Generate error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '記事生成に失敗しました' },
      { status: 500 }
    )
  }
}
