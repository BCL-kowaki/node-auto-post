import { NextResponse } from 'next/server'
import { getCategories } from '@/lib/wordpress'

export async function GET() {
  try {
    const categories = await getCategories()
    return NextResponse.json({ categories })
  } catch (error) {
    console.error('Categories error:', error)
    return NextResponse.json({ categories: [] })
  }
}
