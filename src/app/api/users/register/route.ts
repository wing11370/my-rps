import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'

export const POST = async (request: NextRequest) => {
  try {
    const { username, password } = await request.json()

    if (!username || typeof username !== 'string' || username.trim() === '') {
      return NextResponse.json({ error: '請輸入有效的用戶名' }, { status: 400 })
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      return NextResponse.json({ error: '密碼需至少 6 個字元' }, { status: 400 })
    }

    const trimmedUsername = username.trim()

    const existing = await prisma.user.findUnique({ where: { username: trimmedUsername } })
    if (existing) {
      return NextResponse.json({ error: '用戶名已存在，請改用其他名稱或登入' }, { status: 409 })
    }

    const passwordHash = hashPassword(password)

    const user = await prisma.user.create({ data: { username: trimmedUsername, passwordHash } })

    // do not return passwordHash to client
    const { passwordHash: _ph, ...safe } = user as any
    return NextResponse.json(safe)
  } catch (error) {
    console.error('Error registering user:', error)
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}
