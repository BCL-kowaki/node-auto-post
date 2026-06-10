'use client'

import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Loader2, RefreshCw, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import type { InputMethod } from '@/types'

interface Step2TranscribeProps {
  input: { method: InputMethod; file?: File; url?: string }
  initialText?: string
  onNext: (text: string) => void
  onBack: () => void
}

export function Step2Transcribe({ input, initialText, onNext, onBack }: Step2TranscribeProps) {
  const [text, setText] = useState(initialText ?? '')
  const [loading, setLoading] = useState(!initialText)
  const [error, setError] = useState<string | null>(null)
  const startedRef = useRef(false)

  async function runTranscribe() {
    setLoading(true)
    setError(null)
    try {
      const formData = new FormData()
      if (input.method === 'youtube' && input.url) {
        formData.append('audioUrl', input.url)
      } else if (input.file) {
        formData.append('file', input.file)
      } else {
        throw new Error('音声ソースが見つかりません')
      }

      const res = await fetch('/api/transcribe', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? '文字起こしに失敗しました')

      setText(data.text ?? '')
      toast.success('文字起こしが完了しました')
    } catch (e) {
      const msg = e instanceof Error ? e.message : '文字起こしに失敗しました'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (startedRef.current || initialText) return
    startedRef.current = true
    runTranscribe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="space-y-5">
      {loading ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm font-medium">文字起こし中…</p>
          <p className="text-xs text-muted-foreground">
            AssemblyAIで処理しています（数十秒〜数分かかる場合があります）
          </p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 py-12 text-center">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <p className="text-sm font-medium text-destructive">{error}</p>
          <Button variant="outline" size="sm" onClick={runTranscribe} className="gap-1.5">
            <RefreshCw className="h-4 w-4" /> 再試行
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="transcript">文字起こし結果（編集可能）</Label>
            <Button variant="ghost" size="sm" onClick={runTranscribe} className="gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" /> 再実行
            </Button>
          </div>
          <Textarea
            id="transcript"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={14}
            placeholder="文字起こし結果がここに表示されます"
          />
          <p className="text-right text-xs text-muted-foreground">{text.length} 文字</p>
        </div>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} disabled={loading}>
          戻る
        </Button>
        <Button
          onClick={() => {
            if (!text.trim()) {
              toast.error('文字起こしテキストが空です')
              return
            }
            onNext(text)
          }}
          disabled={loading || !!error}
        >
          記事生成へ進む
        </Button>
      </div>
    </div>
  )
}
