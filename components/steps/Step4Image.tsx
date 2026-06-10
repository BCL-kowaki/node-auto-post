'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { toast } from 'sonner'
import { Loader2, RefreshCw, AlertCircle, ChevronDown, ImageOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface Step4ImageProps {
  imagePrompt: string
  initialImage?: string
  onNext: (imageBase64: string | null) => void
  onBack: () => void
}

export function Step4Image({ imagePrompt, initialImage, onNext, onBack }: Step4ImageProps) {
  const [prompt, setPrompt] = useState(imagePrompt)
  const [image, setImage] = useState<string | null>(initialImage ?? null)
  const [loading, setLoading] = useState(!initialImage)
  const [error, setError] = useState<string | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const startedRef = useRef(false)

  async function generate(usePrompt: string) {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imagePrompt: usePrompt }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? '画像生成に失敗しました')

      setImage(data.image)
      toast.success('アイキャッチ画像を生成しました')
    } catch (e) {
      const msg = e instanceof Error ? e.message : '画像生成に失敗しました'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (startedRef.current || initialImage) return
    startedRef.current = true
    generate(imagePrompt)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="space-y-5">
      {/* プレビュー領域 */}
      <div className="aspect-video w-full overflow-hidden rounded-lg border bg-muted/30">
        {loading ? (
          <div className="flex h-full flex-col items-center justify-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium">Nano Banana Proが生成中…</p>
            <p className="text-xs text-muted-foreground">
              思考モードのため10〜30秒かかる場合があります
            </p>
          </div>
        ) : error ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <p className="text-sm font-medium text-destructive">{error}</p>
          </div>
        ) : image ? (
          // base64 data URI のため next/image 最適化を無効化
          <Image
            src={image}
            alt="アイキャッチ画像"
            width={1280}
            height={720}
            unoptimized
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
            <ImageOff className="h-8 w-8" />
            <p className="text-sm">画像がありません</p>
          </div>
        )}
      </div>

      {/* アクション */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          onClick={() => generate(prompt)}
          disabled={loading}
          className="gap-1.5"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          再生成
        </Button>
      </div>

      {/* プロンプト編集（アコーディオン） */}
      <div className="rounded-lg border">
        <button
          type="button"
          onClick={() => setShowPrompt((s) => !s)}
          className="flex w-full items-center justify-between p-3 text-sm font-medium"
        >
          画像プロンプトを確認・編集
          <ChevronDown
            className={cn('h-4 w-4 transition-transform', showPrompt && 'rotate-180')}
          />
        </button>
        {showPrompt && (
          <div className="space-y-2 border-t p-3">
            <Label htmlFor="img-prompt" className="text-xs text-muted-foreground">
              英語プロンプト（編集後に「再生成」で反映）
            </Label>
            <Textarea
              id="img-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              ※ 生成時に「テキストなし・ウォーターマークなし」が自動付与されます。
            </p>
          </div>
        )}
      </div>

      {/* ナビゲーション */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={onBack} disabled={loading}>
          戻る
        </Button>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => onNext(null)} disabled={loading}>
            画像なしで続ける
          </Button>
          <Button onClick={() => onNext(image)} disabled={loading || !image}>
            投稿設定へ
          </Button>
        </div>
      </div>
    </div>
  )
}
