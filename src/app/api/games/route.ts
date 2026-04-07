import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const POST = async (request: NextRequest) => {
  try {
    const { userId, playerMove, cpuMove, result } = await request.json()

    if (!userId || !playerMove || !cpuMove || !result) {
      return NextResponse.json({ error: '缺少必要欄位' }, { status: 400 })
    }

    const game = await prisma.gameRecord.create({
      data: {
        userId: Number(userId),
        playerMove,
        cpuMove,
        result,
      },
    })

    return NextResponse.json(game)
  } catch (error) {
    console.error('Error saving game:', error)
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}
