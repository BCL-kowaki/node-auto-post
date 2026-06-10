import { GoogleGenAI } from '@google/genai'

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })

// 記事生成（Gemini 3.5 Flash）
export async function generateArticle(transcription: string): Promise<{
  titles: [string, string, string]
  body: string
  excerpt: string
  imagePrompt: string
}> {
  const response = await ai.models.generateContent({
    model: 'gemini-3.5-flash',
    contents: `
あなたはプロのWebライターです。以下の音声文字起こしを元に、ブログ記事を生成してください。

【文字起こし内容】
${transcription}

【出力形式】JSONのみで返してください（マークダウンのコードブロック不要）
{
  "titles": ["タイトル案1", "タイトル案2", "タイトル案3"],
  "body": "HTML形式の本文（h2/h3/p/ul/liタグ使用可。2000〜3000文字程度）",
  "excerpt": "記事の要約（120文字以内）",
  "imagePrompt": "アイキャッチ画像生成用の英語プロンプト（50〜80語。テキストなし、記事テーマを象徴するビジュアルシーン）"
}

【ルール】
- タイトルは3案とも異なるアプローチで（数字入り/問いかけ型/インパクト型）
- 本文はh2見出しで3〜5セクションに分ける
- imagePromptは英語で、末尾に "no text, no letters, no watermark" を含める
- JSONのみ出力（余計な説明不要）
    `.trim(),
  })

  const text = response.text ?? ''
  const clean = text.replace(/```json|```/g, '').trim()
  return JSON.parse(clean)
}

// タイトルのみ再生成
export async function regenerateTitles(
  transcription: string,
  currentTitles: [string, string, string]
): Promise<[string, string, string]> {
  const response = await ai.models.generateContent({
    model: 'gemini-3.5-flash',
    contents: `
以下の文字起こし内容に対して、既存とは異なる新しいブログタイトル案を3つ生成してください。

【文字起こし】
${transcription}

【既存タイトル（これとは異なるものを生成）】
${currentTitles.join('\n')}

JSONのみで返してください:
["新タイトル1", "新タイトル2", "新タイトル3"]
    `.trim(),
  })

  const text = response.text ?? ''
  const clean = text.replace(/```json|```/g, '').trim()
  return JSON.parse(clean)
}

// アイキャッチ画像生成（Nano Banana Pro）
export async function generateFeaturedImage(
  imagePrompt: string
): Promise<string> {
  // プロンプトにテキスト禁止を強制付与
  const safePrompt = `${imagePrompt}, no text, no letters, no watermark, no typography`

  // Nano Banana Proは生成時間が不安定で、稀にGemini側で504(DEADLINE_EXCEEDED)に
  // なるため、最大2回まで試行する
  const maxAttempts = 2
  let lastError: unknown

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image',
        contents: safePrompt,
        config: {
          // @google/genai v2.x: 画像生成は responseModalities + imageConfig で指定
          responseModalities: ['IMAGE'],
          imageConfig: {
            aspectRatio: '16:9',
            imageSize: '1K', // 1K=高速・安定。ブログのアイキャッチには十分な解像度
          },
          // 生成が長引いた場合のタイムアウト耐性（既定より長めに設定）
          httpOptions: { timeout: 290000 },
        },
      })

      const parts = response.candidates?.[0]?.content?.parts ?? []
      for (const part of parts) {
        if (part.inlineData?.data) {
          // 実際のMIMEタイプを使用（Geminiはjpeg/pngいずれも返しうる）
          const mime = part.inlineData.mimeType ?? 'image/png'
          return `data:${mime};base64,${part.inlineData.data}`
        }
      }
      throw new Error('画像生成に失敗しました（画像データが返されませんでした）')
    } catch (e) {
      lastError = e
      if (attempt < maxAttempts) {
        console.warn(
          `画像生成に失敗、リトライします (${attempt}/${maxAttempts - 1}): ${
            e instanceof Error ? e.message : e
          }`
        )
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('画像生成に失敗しました')
}
