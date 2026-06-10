import { AssemblyAI } from 'assemblyai'

const client = new AssemblyAI({
  apiKey: process.env.ASSEMBLYAI_API_KEY!,
})

export async function transcribeFile(audioUrl: string): Promise<{
  text: string
  duration?: number
}> {
  const transcript = await client.transcripts.transcribe({
    audio: audioUrl,
    language_detection: true,
  })

  if (transcript.status === 'error') {
    throw new Error(transcript.error ?? '文字起こしに失敗しました')
  }

  return {
    text: transcript.text ?? '',
    duration: transcript.audio_duration ?? undefined,
  }
}
