'use client'

import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Loader2, RefreshCw, AlertCircle, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { TiptapEditor } from '@/components/TiptapEditor'
import { cn } from '@/lib/utils'
import type { GeneratedArticle } from '@/types'

interface WpCategory {
  id: number
  name: string
}

interface Step3ReviewProps {
  transcription: string
  initialArticle?: GeneratedArticle
  onNext: (data: {
    article: GeneratedArticle
    selectedTitle: string
    body: string
    excerpt: string
    categoryIds: number[]
    tags: string[]
  }) => void
  onBack: () => void
}

export function Step3Review({ transcription, initialArticle, onNext, onBack }: Step3ReviewProps) {
  const [article, setArticle] = useState<GeneratedArticle | null>(initialArticle ?? null)
  const [loading, setLoading] = useState(!initialArticle)
  const [error, setError] = useState<string | null>(null)
  const [regenTitles, setRegenTitles] = useState(false)

  const [selectedTitle, setSelectedTitle] = useState(initialArticle?.titles[0] ?? '')
  const [body, setBody] = useState(initialArticle?.body ?? '')
  const [excerpt, setExcerpt] = useState(initialArticle?.excerpt ?? '')
  const [tagsInput, setTagsInput] = useState('')

  const [categories, setCategories] = useState<WpCategory[]>([])
  const [selectedCats, setSelectedCats] = useState<number[]>([])

  const startedRef = useRef(false)

  async function generate() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcription }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? '記事生成に失敗しました')

      const art = data as GeneratedArticle
      setArticle(art)
      setSelectedTitle(art.titles[0])
      setBody(art.body)
      setExcerpt(art.excerpt)
      toast.success('記事を生成しました')
    } catch (e) {
      const msg = e instanceof Error ? e.message : '記事生成に失敗しました'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  async function regenerateTitles() {
    if (!article) return
    setRegenTitles(true)
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcription,
          action: 'regenerate_titles',
          currentTitles: article.titles,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'タイトル再生成に失敗しました')

      const newTitles = data.titles as [string, string, string]
      setArticle({ ...article, titles: newTitles })
      setSelectedTitle(newTitles[0])
      toast.success('タイトルを再生成しました')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'タイトル再生成に失敗しました')
    } finally {
      setRegenTitles(false)
    }
  }

  async function loadCategories() {
    try {
      const res = await fetch('/api/categories')
      const data = await res.json()
      setCategories(data.categories ?? [])
    } catch {
      // カテゴリ取得失敗は致命的でないため無視（環境変数未設定など）
    }
  }

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    loadCategories()
    // マウント時に一度だけ記事生成を実行（意図的な副作用）
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!initialArticle) generate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function toggleCat(id: number) {
    setSelectedCats((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    )
  }

  function handleNext() {
    if (!article) return
    if (!selectedTitle.trim()) {
      toast.error('タイトルを選択してください')
      return
    }
    if (!body.trim()) {
      toast.error('本文が空です')
      return
    }
    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
    onNext({
      article,
      selectedTitle,
      body,
      excerpt,
      categoryIds: selectedCats,
      tags,
    })
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-lg border py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm font-medium">記事を生成中…</p>
        <p className="text-xs text-muted-foreground">Geminiが記事を執筆しています</p>
      </div>
    )
  }

  if (error || !article) {
    return (
      <div className="space-y-5">
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 py-12 text-center">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <p className="text-sm font-medium text-destructive">{error ?? '記事がありません'}</p>
          <Button variant="outline" size="sm" onClick={generate} className="gap-1.5">
            <RefreshCw className="h-4 w-4" /> 再生成
          </Button>
        </div>
        <div className="flex justify-between">
          <Button variant="outline" onClick={onBack}>戻る</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* タイトル3択 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>タイトルを選択</Label>
          <Button
            variant="ghost"
            size="sm"
            onClick={regenerateTitles}
            disabled={regenTitles}
            className="gap-1.5"
          >
            {regenTitles ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            再生成
          </Button>
        </div>
        <div className="space-y-2">
          {article.titles.map((title, i) => {
            const active = selectedTitle === title
            return (
              <button
                key={i}
                type="button"
                onClick={() => setSelectedTitle(title)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg border p-3 text-left text-sm transition-colors',
                  active ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                )}
              >
                <span
                  className={cn(
                    'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
                    active ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/40'
                  )}
                >
                  {active && <Check className="h-3 w-3" />}
                </span>
                <span className="font-medium">{title}</span>
              </button>
            )
          })}
        </div>
        <Input
          value={selectedTitle}
          onChange={(e) => setSelectedTitle(e.target.value)}
          placeholder="タイトル（手動編集可）"
          className="mt-1"
        />
      </div>

      {/* 本文 */}
      <div className="space-y-2">
        <Label>本文</Label>
        <TiptapEditor content={body} onChange={setBody} />
      </div>

      {/* 抜粋 */}
      <div className="space-y-2">
        <Label htmlFor="excerpt">抜粋（120文字以内）</Label>
        <Textarea
          id="excerpt"
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
          rows={3}
        />
        <p className="text-right text-xs text-muted-foreground">{excerpt.length} / 120</p>
      </div>

      {/* カテゴリ */}
      {categories.length > 0 && (
        <div className="space-y-2">
          <Label>カテゴリ</Label>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => {
              const active = selectedCats.includes(cat.id)
              return (
                <Badge
                  key={cat.id}
                  variant={active ? 'default' : 'outline'}
                  onClick={() => toggleCat(cat.id)}
                  className="cursor-pointer select-none"
                >
                  {cat.name}
                </Badge>
              )
            })}
          </div>
        </div>
      )}

      {/* タグ */}
      <div className="space-y-2">
        <Label htmlFor="tags">タグ（カンマ区切り）</Label>
        <Input
          id="tags"
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
          placeholder="例: AI, 音声入力, ブログ"
        />
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>戻る</Button>
        <Button onClick={handleNext}>アイキャッチ生成へ</Button>
      </div>
    </div>
  )
}
