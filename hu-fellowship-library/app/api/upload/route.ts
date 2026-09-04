import { put } from '@vercel/blob'
import { NextResponse } from 'next/server'

const MAX_FILE_SIZE = 5 * 1024 * 1024
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file')

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No image file provided' }, { status: 400 })
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: 'Please upload a JPG, PNG, or WebP image' }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'Cover image must be smaller than 5MB' }, { status: 400 })
    }

    const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const blob = await put(`book-covers/${crypto.randomUUID()}.${extension}`, file, {
      access: 'public',
      addRandomSuffix: false,
      contentType: file.type,
    })

    return NextResponse.json({ url: blob.url })
  } catch (error) {
    console.error('Cover upload error:', error)
    return NextResponse.json({ error: 'Cover upload failed' }, { status: 500 })
  }
}
