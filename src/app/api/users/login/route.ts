import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPassword } from '@/lib/auth'

export const POST = async (request: NextRequest) => {
  try {
    const { username, password } = await request.json()

    if (!username || typeof username !== 'string' || username.trim() === '') {
      return NextResponse.json({ error: '請輸入有效的用戶名' }, { status: 400 })
    }
    if (!password || typeof password !== 'string') {
      return NextResponse.json({ error: '請輸入密碼' }, { status: 400 })
    }

    const trimmedUsername = username.trim()

    const user = await prisma.user.findUnique({ where: { username: trimmedUsername } })
    if (!user) {
      return NextResponse.json({ error: '用戶不存在' }, { status: 404 })
    }

    const stored = (user as any).passwordHash
    if (!stored) {
      return NextResponse.json({ error: '此帳號尚未完成註冊，請先註冊或重設密碼' }, { status: 403 })
    }

    const ok = verifyPassword(password, stored)
    if (!ok) {
      return NextResponse.json({ error: '密碼錯誤' }, { status: 401 })
    }

    const { passwordHash: _ph, ...safe } = user as any
    return NextResponse.json(safe)
  } catch (error) {
    console.error('Error logging in user:', error)
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}
