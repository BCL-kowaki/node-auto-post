'use client'

import { useState } from 'react'
import Image from 'next/image'
import { toast } from 'sonner'
import { Loader2, CheckCircle2, ExternalLink, Settings } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { ArticleStatus } from '@/types'

interface Step5PublishProps {
  data: {
    title: string
    body: string
    excerpt: string
    categoryIds: number[]
    tags: string[]
    featuredImageBase64: string | null
  }
  onBack: () => void
}

interface PublishResult {
  id: number
  link: string
  status: string
  adminUrl: string
}

function stripHtml(html: string): number {
  if (typeof document === 'undefined') return html.replace(/<[^>]+>/g, '').length
  const div = document.createElement('div')
  div.innerHTML = html
  return (div.textContent ?? '').length
}

export function Step5Publish({ data, onBack }: Step5PublishProps) {
  const [status, setStatus] = useState<ArticleStatus>('publish')
  const [scheduledAt, setScheduledAt] = useState('')
  const [publishing, setPublishing] = useState(false)
  const [result, setResult] = useState<PublishResult | null>(null)

  const charCount = stripHtml(data.body)

  async function handlePublish() {
    if (status === 'future') {
      if (!scheduledAt) {
        toast.error('予約日時を指定してください')
        return
      }
      if (new Date(scheduledAt).getTime() <= Date.now()) {
        toast.error('予約日時は未来の日時を指定してください')
        return
      }
    }

    setPublishing(true)
    try {
      const res = await fetch('/api/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: data.title,
          content: data.body,
          excerpt: data.excerpt,
          status,
          scheduledAt: status === 'future' ? scheduledAt : undefined,
          featuredImageBase64: data.featuredImageBase64 ?? undefined,
          categoryIds: data.categoryIds,
          tags: data.tags,
        }),
      })
      const resData = await res.json()
      if (!res.ok) throw new Error(resData.error ?? '投稿に失敗しました')

      let adminUrl = ''
      try {
        adminUrl = `${new URL(resData.link).origin}/wp-admin/post.php?post=${resData.id}&action=edit`
      } catch {
        adminUrl = ''
      }

      setResult({ ...resData, adminUrl })
      toast.success(
        status === 'publish'
          ? '記事を公開しました'
          : status === 'draft'
            ? '下書きを保存しました'
            : '予約投稿を設定しました'
      )
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '投稿に失敗しました')
    } finally {
      setPublishing(false)
    }
  }

  // 投稿完了画面
  if (result) {
    return (
      <div className="flex flex-col items-center gap-5 py-8 text-center">
        <CheckCircle2 className="h-14 w-14 text-green-600" />
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">
            {result.status === 'publish'
              ? '公開が完了しました'
              : result.status === 'future'
                ? '予約投稿を設定しました'
                : '下書きを保存しました'}
          </h2>
          <p className="text-sm text-muted-foreground">投稿ID: {result.id}</p>
        </div>
        <div className="flex w-full max-w-sm flex-col gap-2">
          <a
            href={result.link}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants({ variant: 'default', className: 'gap-1.5' })}
          >
            <ExternalLink className="h-4 w-4" /> 公開ページを開く
          </a>
          {result.adminUrl && (
            <a
              href={result.adminUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ variant: 'outline', className: 'gap-1.5' })}
            >
              <Settings className="h-4 w-4" /> WordPress管理画面で編集
            </a>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* サマリー */}
      <Card className="gap-0 overflow-hidden p-0">
        <div className="flex gap-4 p-4">
          {data.featuredImageBase64 ? (
            <div className="relative h-20 w-32 shrink-0 overflow-hidden rounded-md border">
              <Image
                src={data.featuredImageBase64}
                alt="サムネイル"
                fill
                unoptimized
                className="object-cover"
              />
            </div>
          ) : (
            <div className="flex h-20 w-32 shrink-0 items-center justify-center rounded-md border bg-muted text-xs text-muted-foreground">
              画像なし
            </div>
          )}
          <div className="min-w-0 space-y-1">
            <p className="line-clamp-2 font-medium">{data.title}</p>
            <p className="text-xs text-muted-foreground">本文 約{charCount}文字</p>
            {data.tags.length > 0 && (
              <p className="truncate text-xs text-muted-foreground">
                タグ: {data.tags.join(', ')}
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* ステータス選択 */}
      <div className="space-y-2">
        <Label>投稿ステータス</Label>
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              { value: 'publish', label: '今すぐ公開' },
              { value: 'draft', label: '下書き保存' },
              { value: 'future', label: '予約投稿' },
            ] as const
          ).map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setStatus(opt.value)}
              className={cn(
                'rounded-lg border p-3 text-sm font-medium transition-colors',
                status === opt.value
                  ? 'border-primary bg-primary/5 text-foreground'
                  : 'text-muted-foreground hover:bg-muted/50'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* 予約日時 */}
      {status === 'future' && (
        <div className="space-y-2">
          <Label htmlFor="scheduled">予約日時</Label>
          <Input
            id="scheduled"
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
          />
        </div>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} disabled={publishing}>
          戻る
        </Button>
        <Button onClick={handlePublish} disabled={publishing} className="gap-1.5">
          {publishing && <Loader2 className="h-4 w-4 animate-spin" />}
          投稿する
        </Button>
      </div>
    </div>
  )
}
