import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { username } = await request.json()

    if (!username || typeof username !== 'string' || username.trim() === '') {
      return NextResponse.json({ error: '請輸入有效的用戶名' }, { status: 400 })
    }

    const trimmedUsername = username.trim()

    const user = await prisma.user.upsert({
      where: { username: trimmedUsername },
      update: {},
      create: { username: trimmedUsername },
    })

    return NextResponse.json(user)
  } catch (error) {
    console.error('Error creating/getting user:', error)
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}
