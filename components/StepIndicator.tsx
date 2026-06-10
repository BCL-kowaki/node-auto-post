'use client'

import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

const STEPS = [
  { num: 1, label: '音声入力' },
  { num: 2, label: '文字起こし' },
  { num: 3, label: '記事生成' },
  { num: 4, label: 'アイキャッチ' },
  { num: 5, label: '投稿' },
] as const

export function StepIndicator({ current }: { current: number }) {
  return (
    <nav aria-label="進捗" className="w-full">
      <ol className="flex items-start">
        {STEPS.map((step, i) => {
          const isDone = current > step.num
          const isActive = current === step.num
          return (
            <li
              key={step.num}
              className="relative flex flex-1 flex-col items-center gap-1.5"
            >
              {/* 次の丸への接続線（丸と丸の隙間だけに描画） */}
              {i < STEPS.length - 1 && (
                <span
                  aria-hidden
                  className={cn(
                    'absolute top-[17px] left-[calc(50%+1.375rem)] right-[calc(-50%+1.375rem)] h-0.5 rounded transition-colors',
                    isDone ? 'bg-grad-cta' : 'bg-white/12'
                  )}
                />
              )}
              <div
                className={cn(
                  'relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-all duration-300',
                  isDone && 'bg-grad-cta text-white',
                  isActive && 'bg-grad-cta glow text-white',
                  !isDone && !isActive && 'gradient-border bg-white/5'
                )}
              >
                {isDone ? (
                  <Check className="h-4 w-4" />
                ) : isActive ? (
                  step.num
                ) : (
                  <span className="text-gradient opacity-55">{step.num}</span>
                )}
              </div>
              <span
                className={cn(
                  'hidden text-center text-xs font-medium sm:block',
                  isActive ? 'text-foreground' : 'text-muted-foreground'
                )}
              >
                {step.label}
              </span>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
