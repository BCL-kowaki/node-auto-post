import { spawn } from 'child_process'
import { mkdtemp, readdir, readFile, rm } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'

// yt-dlp の実行パス（環境変数で上書き可能。デフォルトはPATH解決）
const YT_DLP = process.env.YT_DLP_PATH || 'yt-dlp'

// YouTube URL 判定（youtube.com / youtu.be）
export function isYoutubeUrl(url: string): boolean {
  return /(?:youtube\.com\/|youtu\.be\/)/i.test(url)
}

interface ExtractedAudio {
  buffer: Buffer
  ext: string
}

/**
 * yt-dlp で YouTube から音声を抽出して Buffer で返す。
 * ※ サーバー（Vercel等）には yt-dlp を導入できないため、ローカル開発限定。
 */
export async function extractYoutubeAudio(url: string): Promise<ExtractedAudio> {
  const dir = await mkdtemp(join(tmpdir(), 'ytdlp-'))
  try {
    const outTemplate = join(dir, 'audio.%(ext)s')
    // bestaudio をネイティブコンテナ（m4a/webm等）のまま取得 → AssemblyAIが対応
    await runYtDlp([
      '-f',
      'bestaudio/best',
      '--no-playlist',
      '--no-warnings',
      '-o',
      outTemplate,
      url,
    ])

    const files = await readdir(dir)
    const audioFile = files.find((f) => f.startsWith('audio.'))
    if (!audioFile) {
      throw new Error('音声ファイルの抽出に失敗しました（出力が見つかりません）')
    }

    const buffer = await readFile(join(dir, audioFile))
    const ext = audioFile.split('.').pop() ?? 'm4a'
    return { buffer, ext }
  } finally {
    // 一時ディレクトリを必ず削除
    await rm(dir, { recursive: true, force: true })
  }
}

function runYtDlp(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(YT_DLP, args)
    let stderr = ''

    proc.stderr.on('data', (d: Buffer) => {
      stderr += d.toString()
    })

    proc.on('error', (e: NodeJS.ErrnoException) => {
      if (e.code === 'ENOENT') {
        reject(
          new Error(
            'yt-dlp が見つかりません。`brew install yt-dlp` でインストールしてください（YouTube処理はローカル開発限定）。'
          )
        )
      } else {
        reject(new Error(`yt-dlp の起動に失敗しました: ${e.message}`))
      }
    })

    proc.on('close', (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(
          new Error(
            `YouTube音声の抽出に失敗しました: ${stderr.slice(-400) || `exit code ${code}`}`
          )
        )
      }
    })
  })
}
