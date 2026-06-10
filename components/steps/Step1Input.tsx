'use client'

import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { Video, Upload, Mic, Square, FileAudio, X } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { InputMethod } from '@/types'

const ACCEPTED = '.mp3,.mp4,.wav,.m4a'
const MAX_BYTES = 200 * 1024 * 1024 // 200MB

interface Step1InputProps {
  onNext: (payload: { method: InputMethod; file?: File; url?: string }) => void
}

export function Step1Input({ onNext }: Step1InputProps) {
  const [tab, setTab] = useState<InputMethod>('youtube')

  // YouTube
  const [url, setUrl] = useState('')

  // File
  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Mic
  const [recording, setRecording] = useState(false)
  const [recordedFile, setRecordedFile] = useState<File | null>(null)
  const [recordedUrl, setRecordedUrl] = useState<string>('')
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  function pickFile(f: File | null | undefined) {
    if (!f) return
    if (f.size > MAX_BYTES) {
      toast.error('ファイルサイズが200MBを超えています')
      return
    }
    setFile(f)
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        const recFile = new File([blob], `recording-${Date.now()}.webm`, {
          type: 'audio/webm',
        })
        setRecordedFile(recFile)
        setRecordedUrl(URL.createObjectURL(blob))
        stream.getTracks().forEach((t) => t.stop())
      }
      recorder.start()
      mediaRecorderRef.current = recorder
      setRecording(true)
    } catch {
      toast.error('マイクへのアクセスが拒否されました')
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop()
    setRecording(false)
  }

  function handleNext() {
    if (tab === 'youtube') {
      const trimmed = url.trim()
      if (!/^https?:\/\/.+/.test(trimmed)) {
        toast.error('有効なYouTube URLを入力してください')
        return
      }
      onNext({ method: 'youtube', url: trimmed })
    } else if (tab === 'file') {
      if (!file) {
        toast.error('音声ファイルを選択してください')
        return
      }
      onNext({ method: 'file', file })
    } else {
      if (!recordedFile) {
        toast.error('録音を完了してください')
        return
      }
      onNext({ method: 'mic', file: recordedFile })
    }
  }

  return (
    <div className="space-y-6">
      <Tabs value={tab} onValueChange={(v) => setTab(v as InputMethod)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="youtube" className="gap-1.5">
            <Video className="h-4 w-4" /> YouTube
          </TabsTrigger>
          <TabsTrigger value="file" className="gap-1.5">
            <Upload className="h-4 w-4" /> ファイル
          </TabsTrigger>
          <TabsTrigger value="mic" className="gap-1.5">
            <Mic className="h-4 w-4" /> 録音
          </TabsTrigger>
        </TabsList>

        {/* YouTube */}
        <TabsContent value="youtube" className="mt-4 space-y-3">
          <Label htmlFor="yt-url">YouTube URL</Label>
          <Input
            id="yt-url"
            type="url"
            placeholder="https://www.youtube.com/watch?v=..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            ※ YouTube処理はローカル開発環境のみ対応です（サーバーにyt-dlpが必要）。
          </p>
        </TabsContent>

        {/* File */}
        <TabsContent value="file" className="mt-4">
          <div
            onDragOver={(e) => {
              e.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragging(false)
              pickFile(e.dataTransfer.files?.[0])
            }}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-10 text-center transition-colors',
              dragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/30 hover:bg-muted/40'
            )}
          >
            <Upload className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium">
              クリックまたはドラッグ&ドロップでアップロード
            </p>
            <p className="text-xs text-muted-foreground">
              .mp3 / .mp4 / .wav / .m4a（最大200MB）
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED}
              className="hidden"
              onChange={(e) => pickFile(e.target.files?.[0])}
            />
          </div>
          {file && (
            <Card className="mt-3 flex flex-row items-center justify-between gap-3 p-3">
              <div className="flex min-w-0 items-center gap-2">
                <FileAudio className="h-5 w-5 shrink-0 text-primary" />
                <span className="truncate text-sm">{file.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {(file.size / 1024 / 1024).toFixed(1)}MB
                </span>
              </div>
              <button
                type="button"
                aria-label="ファイルを削除"
                onClick={() => setFile(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </Card>
          )}
        </TabsContent>

        {/* Mic */}
        <TabsContent value="mic" className="mt-4 space-y-4">
          <div className="flex flex-col items-center gap-4 rounded-lg border p-8">
            {!recording ? (
              <Button
                type="button"
                size="lg"
                onClick={startRecording}
                className="gap-2"
              >
                <Mic className="h-4 w-4" /> 録音開始
              </Button>
            ) : (
              <Button
                type="button"
                size="lg"
                variant="destructive"
                onClick={stopRecording}
                className="gap-2"
              >
                <Square className="h-4 w-4" /> 録音停止
              </Button>
            )}
            {recording && (
              <p className="flex items-center gap-2 text-sm text-destructive">
                <span className="h-2 w-2 animate-pulse rounded-full bg-destructive" />
                録音中…
              </p>
            )}
            {recordedUrl && !recording && (
              <div className="w-full space-y-2">
                <p className="text-sm font-medium">録音プレビュー</p>
                <audio controls src={recordedUrl} className="w-full" />
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end">
        <Button onClick={handleNext}>文字起こしへ進む</Button>
      </div>
    </div>
  )
}
