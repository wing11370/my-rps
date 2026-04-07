import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      include: {
        games: true,
      },
    })

    const leaderboard = users.map((user) => {
      const wins = user.games.filter((g) => g.result === 'win').length
      const losses = user.games.filter((g) => g.result === 'loss').length
      const draws = user.games.filter((g) => g.result === 'draw').length
      const total = user.games.length
      return {
        id: user.id,
        username: user.username,
        wins,
        losses,
        draws,
        total,
      }
    })

    leaderboard.sort((a, b) => b.wins - a.wins)

    return NextResponse.json(leaderboard.slice(0, 10))
  } catch (error) {
    console.error('Error fetching leaderboard:', error)
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}
