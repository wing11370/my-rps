import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        games: {
          select: { result: true },
        },
      },
    })

    const leaderboard = users
      .map((user) => {
        const wins = user.games.filter((g) => g.result === 'win').length
        const losses = user.games.filter((g) => g.result === 'loss').length
        const draws = user.games.filter((g) => g.result === 'draw').length
        return {
          id: user.id,
          username: user.username,
          wins,
          losses,
          draws,
          total: user.games.length,
        }
      })
      .sort((a, b) => b.wins - a.wins)
      .slice(0, 10)

    return NextResponse.json(leaderboard)
  } catch (error) {
    console.error('Error fetching leaderboard:', error)
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}
