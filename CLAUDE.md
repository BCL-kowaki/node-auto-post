# CLAUDE.md — 音声→WordPress自動投稿システム

## プロジェクト概要

音声（YouTube URL / 音声ファイル / マイク録音）を入力として受け取り、
AI が記事を生成し、人間のレビューを経てWordPressへ自動投稿するWebアプリケーション。

---

## 技術スタック

| レイヤー | 技術 |
|---|---|
| フレームワーク | Next.js 14（App Router） |
| 言語 | TypeScript |
| スタイリング | Tailwind CSS + shadcn/ui |
| 文字起こし | AssemblyAI（音声ファイル）/ Whisper API（YouTube） |
| YouTube処理 | yt-dlp（サーバーサイド） |
| 記事生成 | Gemini 3.5 Flash（`gemini-3.5-flash`） |
| 画像生成 | Nano Banana Pro（`gemini-3-pro-image`） |
| リッチテキスト | Tiptap |
| WordPress連携 | WordPress REST API + Application Password認証 |
| デプロイ | Vercel |

---

## ディレクトリ構成

```
voice-to-wp/
├── CLAUDE.md
├── .env.local              # APIキー類（gitignore）
├── app/
│   ├── layout.tsx
│   ├── page.tsx            # メインUI（ステップウィザード）
│   └── api/
│       ├── transcribe/
│       │   └── route.ts    # 文字起こしAPI
│       ├── generate/
│       │   └── route.ts    # 記事生成API（Gemini 3.5 Flash）
│       ├── image/
│       │   └── route.ts    # アイキャッチ生成API（Nano Banana Pro）
│       └── publish/
│           └── route.ts    # WordPress投稿API
├── components/
│   ├── steps/
│   │   ├── Step1Input.tsx      # 音声入力（URL/ファイル/マイク）
│   │   ├── Step2Transcribe.tsx # 文字起こし確認
│   │   ├── Step3Review.tsx     # タイトル選択・本文編集
│   │   ├── Step4Image.tsx      # アイキャッチ確認・再生成
│   │   └── Step5Publish.tsx    # 投稿設定（即時/予約）
│   ├── ui/                 # shadcn/uiコンポーネント
│   ├── StepIndicator.tsx   # ステップ進捗表示
│   └── TiptapEditor.tsx    # リッチテキストエディタ
├── lib/
│   ├── assemblyai.ts       # AssemblyAI クライアント
│   ├── gemini.ts           # Gemini APIクライアント（記事生成 + 画像生成）
│   ├── wordpress.ts        # WordPress REST APIクライアント
│   └── youtube.ts          # YouTube音声抽出ユーティリティ
└── types/
    └── index.ts            # 共通型定義
```

---

## 環境変数（.env.local）

```bash
# Google Gemini API
GEMINI_API_KEY=

# AssemblyAI
ASSEMBLYAI_API_KEY=

# WordPress
WP_BASE_URL=https://your-site.com
WP_USERNAME=your-wp-username
WP_APP_PASSWORD=xxxx xxxx xxxx xxxx xxxx xxxx

# アプリ設定
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## アプリケーションフロー（5ステップ）

### Step 1: 音声入力
- YouTube URL入力（yt-dlpで音声抽出 → Whisper）
- 音声ファイルアップロード（.mp3/.mp4/.wav/.m4a → AssemblyAI）
- マイク録音（MediaRecorder API → AssemblyAI）

### Step 2: 文字起こし
- AssemblyAI / Whisper APIで文字起こし
- 結果をテキストエリアで確認・手動修正可能
- ポーリングで完了を待機（AssemblyAIは非同期）

### Step 3: 記事生成・レビュー
- Gemini 3.5 Flashでタイトル案×3 + 本文を同時生成
- タイトルを3択で選択 or 再生成ボタン
- Tiptapエディタで本文を自由編集
- カテゴリ・タグ・スラッグの設定

### Step 4: アイキャッチ画像
- Gemini 3.5 Flashが記事内容から画像プロンプト（英語）を自動生成
- Nano Banana Pro（gemini-3-pro-image）で16:9・2K画像を生成
- 再生成ボタン（プロンプト確認・編集も可能）
- テキストなし・ウォーターマークなしを強制

### Step 5: 投稿
- 即時公開 / 下書き保存 / 予約投稿（日時指定）
- WordPress REST APIでメディアアップロード → 記事投稿
- 投稿完了後に管理画面URLを表示

---

## 実装ルール（必ず守ること）

### 1. API Route は全て `/app/api/` 配下に作成
- クライアントサイドからAPIキーを絶対に露出しない
- 全てのExternal API呼び出しはサーバーサイドのみ

### 2. 型安全を徹底
- `any` 型は使用禁止
- `types/index.ts` に共通型を定義してimport

### 3. エラーハンドリング
- API Routeは必ず try/catch で囲む
- ユーザーへのエラー表示はトースト通知（shadcn/ui の `toast`）

### 4. ローディング状態
- 文字起こし・記事生成・画像生成は処理時間が長い
- 各ステップで `isLoading` 状態を管理しスピナー表示
- 処理中はボタンを `disabled` にする

### 5. 画像生成プロンプト
- 末尾に必ず `", no text, no letters, no watermark, no typography"` を付与
- プロンプトは英語で生成（Nano Banana Proは英語指示が高品質）

### 6. WordPress認証
- Application Password方式を使用
- Basic認証ヘッダー: `Authorization: Basic base64(username:app_password)`
- メディアアップロード → 記事投稿の順番を厳守

### 7. ファイルサイズ制限
- 音声ファイルアップロードは最大200MB
- Next.js の `bodyParser` 設定を適切に行う

---

## 共通型定義（types/index.ts）

```typescript
export type InputMethod = 'youtube' | 'file' | 'mic'

export type ArticleStatus = 'publish' | 'draft' | 'future'

export interface TranscribeResult {
  text: string
  duration?: number
  language?: string
}

export interface GeneratedArticle {
  titles: [string, string, string]  // タイトル案3つ
  body: string                       // HTML形式の本文
  excerpt: string                    // 抜粋（120文字）
  imagePrompt: string               // 画像生成用プロンプト（英語）
}

export interface PublishConfig {
  title: string
  body: string
  excerpt: string
  status: ArticleStatus
  scheduledAt?: string              // ISO8601 (予約投稿時)
  categoryIds: number[]
  tags: string[]
  featuredImageId?: number          // WPメディアID
}

export interface AppState {
  step: 1 | 2 | 3 | 4 | 5
  inputMethod?: InputMethod
  transcription?: TranscribeResult
  article?: GeneratedArticle
  selectedTitle?: string
  editedBody?: string
  featuredImageUrl?: string
  featuredImageId?: number
  publishConfig?: PublishConfig
}
```

---

## コマンド

```bash
# 開発
npm run dev

# ビルド
npm run build

# 型チェック
npx tsc --noEmit

# lint
npm run lint
```

---

## 注意事項

- yt-dlpはサーバー環境（Vercel）にインストール不可のため、**YouTube処理はローカル開発のみ対応**（本番はYouTube URL → AssemblyAI transcription URL方式を検討）
- AssemblyAIの文字起こしは非同期（完了まで30秒〜数分）。ポーリングで対応
- Nano Banana Proは思考モード内蔵のため、生成に10〜30秒かかる場合がある
- WordPress Application Passwordはスペース区切り6ブロック形式（そのまま使用可）
