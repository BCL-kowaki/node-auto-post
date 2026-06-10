'use client'

import { useState } from 'react'
import { Sparkles, AudioLines } from 'lucide-react'
import { StepIndicator } from '@/components/StepIndicator'
import { Step1Input } from '@/components/steps/Step1Input'
import { Step2Transcribe } from '@/components/steps/Step2Transcribe'
import { Step3Review } from '@/components/steps/Step3Review'
import { Step4Image } from '@/components/steps/Step4Image'
import { Step5Publish } from '@/components/steps/Step5Publish'
import type { GeneratedArticle, InputMethod } from '@/types'

type Step = 1 | 2 | 3 | 4 | 5

interface InputPayload {
  method: InputMethod
  file?: File
  url?: string
}

interface ReviewData {
  article: GeneratedArticle
  selectedTitle: string
  body: string
  excerpt: string
  categoryIds: number[]
  tags: string[]
}

const STEP_META: Record<Step, { title: string; description: string }> = {
  1: { title: '音声を入力', description: 'YouTube・音声ファイル・マイク録音から選択' },
  2: { title: '文字起こしを確認', description: 'AIによる文字起こし結果を確認・修正' },
  3: { title: '記事を生成・編集', description: 'タイトルを選び、本文を編集' },
  4: { title: 'アイキャッチを生成', description: '記事に合った画像を生成' },
  5: { title: '投稿設定', description: '公開方法を選んでWordPressへ投稿' },
}

export default function Home() {
  const [step, setStep] = useState<Step>(1)

  const [input, setInput] = useState<InputPayload | null>(null)
  const [transcription, setTranscription] = useState<string>('')
  const [review, setReview] = useState<ReviewData | null>(null)
  const [featuredImage, setFeaturedImage] = useState<string | null>(null)

  const meta = STEP_META[step]

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pt-4 pb-10">
      {/* ブランド（左上） */}
      <div className="mb-8 flex items-center gap-2">
        <span className="bg-grad-cta flex h-6 w-6 items-center justify-center rounded-lg shadow-[0_4px_14px_-4px_rgb(var(--glow)/0.8)]">
          <AudioLines className="h-3.5 w-3.5 text-white" />
        </span>
        <span className="text-xs font-semibold tracking-wide text-muted-foreground">
          Node Auto Post
        </span>
      </div>

      {/* ヒーロー */}
      <header className="mb-10 text-center">
        <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
          <Sparkles className="h-3.5 w-3.5 text-sky-300" />
          AIが音声から記事を自動生成
        </div>
        <h1 className="text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
          <span className="text-gradient">音声</span> から
          <br className="sm:hidden" />
          <span className="text-gradient"> WordPress</span> へ
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground sm:text-base">
          話すだけで、AIが記事の執筆からアイキャッチ生成・投稿までを伴走します。
        </p>
      </header>

      {/* ステップインジケーター */}
      <div className="glass mb-6 px-4 py-4 sm:px-6">
        <StepIndicator current={step} />
      </div>

      {/* ウィザード本体（グラスカード） */}
      <section className="glass-card">
        <div className="border-b border-white/10 px-5 py-4 sm:px-7 sm:py-5">
          <div className="flex items-center gap-2">
            <span className="bg-grad-cta rounded-md px-2 py-0.5 text-xs font-bold text-white">
              STEP {step}
            </span>
            <h2 className="text-lg font-bold tracking-tight">{meta.title}</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{meta.description}</p>
        </div>

        <div className="px-5 py-6 sm:px-7">
          {step === 1 && (
            <Step1Input
              onNext={(payload) => {
                // 入力ソースが変わったら後続データをリセット
                setInput(payload)
                setTranscription('')
                setReview(null)
                setFeaturedImage(null)
                setStep(2)
              }}
            />
          )}

          {step === 2 && input && (
            <Step2Transcribe
              input={input}
              initialText={transcription || undefined}
              onBack={() => setStep(1)}
              onNext={(text) => {
                if (text !== transcription) setReview(null)
                setTranscription(text)
                setStep(3)
              }}
            />
          )}

          {step === 3 && (
            <Step3Review
              transcription={transcription}
              initialArticle={review?.article}
              onBack={() => setStep(2)}
              onNext={(data) => {
                setReview(data)
                setStep(4)
              }}
            />
          )}

          {step === 4 && review && (
            <Step4Image
              imagePrompt={review.article.imagePrompt}
              initialImage={featuredImage ?? undefined}
              onBack={() => setStep(3)}
              onNext={(img) => {
                setFeaturedImage(img)
                setStep(5)
              }}
            />
          )}

          {step === 5 && review && (
            <Step5Publish
              data={{
                title: review.selectedTitle,
                body: review.body,
                excerpt: review.excerpt,
                categoryIds: review.categoryIds,
                tags: review.tags,
                featuredImageBase64: featuredImage,
              }}
              onBack={() => setStep(4)}
            />
          )}
        </div>
      </section>

      <p className="mt-6 text-center text-xs text-muted-foreground/70">
        ©︎ 2026 node LLC.
      </p>
    </main>
  )
}
