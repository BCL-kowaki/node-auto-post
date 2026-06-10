// YouTube URL 判定（youtube.com / youtu.be）
export function isYoutubeUrl(url: string): boolean {
  return /(?:youtube\.com\/|youtu\.be\/)/i.test(url)
}

// URL から動画ID（11文字）を抽出
function extractVideoId(url: string): string | null {
  const m = url.match(/(?:v=|youtu\.be\/|\/embed\/|\/shorts\/|\/live\/)([\w-]{11})/)
  return m ? m[1] : null
}

const RAPIDAPI_HOST = 'youtube-mp36.p.rapidapi.com'

/**
 * 外部API（RapidAPI: youtube-mp36）でYouTube動画から音声(mp3)の公開URLを取得する。
 * yt-dlpのようなシステムバイナリ不要のため、Vercel等のサーバーレス環境でも動作する。
 *
 * youtube-mp36 は非同期変換のため、status が "ok" になるまでポーリングする。
 * 返すURLは公開アクセス可能なmp3リンクで、そのままAssemblyAIに渡して文字起こしできる。
 */
async function getYoutubeAudioUrl(url: string): Promise<string> {
  const videoId = extractVideoId(url)
  if (!videoId) {
    throw new Error('有効なYouTube URLではありません')
  }

  const apiKey = process.env.RAPIDAPI_KEY
  if (!apiKey) {
    throw new Error(
      'RAPIDAPI_KEY が未設定です。YouTube音声抽出APIのキーを環境変数に設定してください。'
    )
  }

  const headers = {
    'x-rapidapi-key': apiKey,
    'x-rapidapi-host': RAPIDAPI_HOST,
  }

  // 変換完了までポーリング（最大 ~60秒）
  const maxAttempts = 20
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const res = await fetch(
      `https://${RAPIDAPI_HOST}/dl?id=${encodeURIComponent(videoId)}`,
      { headers }
    )

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        throw new Error('YouTube音声抽出APIの認証に失敗しました（RAPIDAPI_KEYを確認してください）')
      }
      if (res.status === 429) {
        throw new Error('YouTube音声抽出APIのレート上限に達しました（プランをご確認ください）')
      }
      throw new Error(`YouTube音声抽出APIエラー: HTTP ${res.status}`)
    }

    const data: { status?: string; link?: string; msg?: string } = await res.json()

    if (data.status === 'ok' && data.link) {
      return data.link
    }
    if (data.status === 'fail') {
      throw new Error(`YouTube音声抽出に失敗しました: ${data.msg ?? '不明なエラー'}`)
    }

    // status が "processing" 等 → 少し待って再試行
    await new Promise((r) => setTimeout(r, 3000))
  }

  throw new Error('YouTube音声抽出がタイムアウトしました（変換に時間がかかりすぎています）')
}

/**
 * YouTube動画の音声(mp3)をサーバー側でダウンロードして Buffer で返す。
 * 外部APIが返すmp3ホストはAssemblyAIから直接取得できない場合があるため、
 * 自前でダウンロードして AssemblyAI へアップロードする。
 */
export async function downloadYoutubeAudio(url: string): Promise<Buffer> {
  const mp3Url = await getYoutubeAudioUrl(url)

  const res = await fetch(mp3Url, {
    headers: {
      // 一部の配信ホストはブラウザUA以外を弾くため付与
      'user-agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
    },
  })

  if (!res.ok) {
    throw new Error(`YouTube音声のダウンロードに失敗しました: HTTP ${res.status}`)
  }

  const buffer = Buffer.from(await res.arrayBuffer())
  if (buffer.length === 0) {
    throw new Error('YouTube音声を取得できませんでした（空のデータ）')
  }
  return buffer
}
