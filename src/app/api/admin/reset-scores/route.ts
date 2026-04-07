import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const POST = async (request: NextRequest) => {
  try {
    const deleted = await prisma.gameRecord.deleteMany()
    return NextResponse.json({ ok: true, count: (deleted as any).count ?? deleted })
  } catch (error) {
    console.error('Error resetting scores:', error)
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}
