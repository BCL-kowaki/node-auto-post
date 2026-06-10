import { NextRequest, NextResponse } from 'next/server'
import { transcribeFile } from '@/lib/assemblyai'
import { isYoutubeUrl, downloadYoutubeAudio } from '@/lib/youtube'

export const runtime = 'nodejs'
export const maxDuration = 300 // 5分

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const audioUrl = formData.get('audioUrl') as string | null
    const file = formData.get('file') as File | null

    let audioSource: string

    if (audioUrl) {
      if (isYoutubeUrl(audioUrl)) {
        // YouTube: 外部API(RapidAPI)でmp3を取得 → 自前DL → AssemblyAIにアップロード
        // （配信ホストはAssemblyAIから直接取得できないため、サーバー経由で渡す）
        const buffer = await downloadYoutubeAudio(audioUrl)
        const { AssemblyAI } = await import('assemblyai')
        const client = new AssemblyAI({ apiKey: process.env.ASSEMBLYAI_API_KEY! })
        audioSource = await client.files.upload(buffer)
      } else {
        // 直接の音声ファイルURL
        audioSource = audioUrl
      }
    } else if (file) {
      // ファイルをAssemblyAIにアップロード
      const { AssemblyAI } = await import('assemblyai')
      const client = new AssemblyAI({ apiKey: process.env.ASSEMBLYAI_API_KEY! })
      const uploadedUrl = await client.files.upload(
        Buffer.from(await file.arrayBuffer())
      )
      audioSource = uploadedUrl
    } else {
      return NextResponse.json({ error: '音声ソースが必要です' }, { status: 400 })
    }

    const result = await transcribeFile(audioSource)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Transcribe error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '文字起こしに失敗しました' },
      { status: 500 }
    )
  }
}
