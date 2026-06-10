// YouTube URL 判定（youtube.com / youtu.be）
export function isYoutubeUrl(url: string): boolean {
  return /(?:youtube\.com\/|youtu\.be\/)/i.test(url)
}

const SUPADATA_BASE = 'https://api.supadata.ai/v1'

interface SupadataTranscriptResponse {
  content?: string
  lang?: string
  jobId?: string
  error?: string
  message?: string
}

interface SupadataJobResponse {
  status?: 'queued' | 'active' | 'completed' | 'failed'
  content?: string
  error?: string
}

/**
 * Supadata（YouTube → テキスト）で動画の文字起こしを取得する。
 * 字幕がある動画は公式字幕を、無い動画はSupadata側のWhisper AIで生成する。
 * 取得はSupadataのインフラ側で行われるため、実行環境(Vercel等)のIPに依存せず本番でも動作する。
 */
export async function getYoutubeTranscript(url: string): Promise<string> {
  const apiKey = process.env.SUPADATA_API_KEY
  if (!apiKey) {
    throw new Error(
      'SUPADATA_API_KEY が未設定です。Supadataのキーを環境変数に設定してください。'
    )
  }

  const res = await fetch(
    `${SUPADATA_BASE}/transcript?url=${encodeURIComponent(url)}&text=true`,
    { headers: { 'x-api-key': apiKey } }
  )

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      throw new Error('Supadataの認証に失敗しました（SUPADATA_API_KEYを確認してください）')
    }
    if (res.status === 429) {
      throw new Error('Supadataのレート上限/クレジット上限に達しました（プランをご確認ください）')
    }
    let detail = ''
    try {
      const e = (await res.json()) as SupadataTranscriptResponse
      detail = e.message ?? e.error ?? ''
    } catch {
      // ignore
    }
    throw new Error(`Supadataエラー: HTTP ${res.status}${detail ? ` - ${detail}` : ''}`)
  }

  const data: SupadataTranscriptResponse = await res.json()

  // 同期レスポンス（字幕あり等）
  if (typeof data.content === 'string' && data.content.trim()) {
    return data.content
  }

  // 非同期（字幕なし→Whisper生成等）: jobIdをポーリング
  if (data.jobId) {
    return await pollSupadataJob(data.jobId, apiKey)
  }

  throw new Error(
    `YouTubeの文字起こしを取得できませんでした${data.error ? `: ${data.error}` : ''}`
  )
}

// Supadataの非同期ジョブを完了までポーリング（最大 ~3分）
async function pollSupadataJob(jobId: string, apiKey: string): Promise<string> {
  const maxAttempts = 60
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const res = await fetch(`${SUPADATA_BASE}/transcript/${jobId}`, {
      headers: { 'x-api-key': apiKey },
    })

    if (res.ok) {
      const data: SupadataJobResponse = await res.json()
      if (data.status === 'completed' && typeof data.content === 'string') {
        return data.content
      }
      if (data.status === 'failed') {
        throw new Error(`YouTube文字起こしに失敗しました: ${data.error ?? '不明なエラー'}`)
      }
    }

    await new Promise((r) => setTimeout(r, 3000))
  }

  throw new Error('YouTube文字起こしがタイムアウトしました（処理に時間がかかりすぎています）')
}
