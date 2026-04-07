import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const POST = async (request: NextRequest) => {
  return NextResponse.json({ error: '請使用 /api/users/register 或 /api/users/login 進行註冊或登入' }, { status: 400 })
}
