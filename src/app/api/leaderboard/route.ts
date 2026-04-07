import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const GET = async () => {
  try {
    // Aggregate wins/losses/draws at the database level
    const grouped = await prisma.gameRecord.groupBy({
      by: ['userId', 'result'],
      _count: { id: true },
    })

    // Fetch all relevant users
    const userIds = [...new Set(grouped.map((g) => g.userId))]
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, username: true },
    })

    const userMap = new Map(users.map((u) => [u.id, u.username]))

    // Pivot the grouped results into per-user stats
    const statsMap = new Map<
      number,
      { wins: number; losses: number; draws: number; total: number }
    >()
    for (const row of grouped) {
      const s = statsMap.get(row.userId) ?? {
        wins: 0,
        losses: 0,
        draws: 0,
        total: 0,
      }
      const count = row._count.id
      if (row.result === 'win') s.wins += count
      else if (row.result === 'loss') s.losses += count
      else if (row.result === 'draw') s.draws += count
      s.total += count
      statsMap.set(row.userId, s)
    }

    const leaderboard = [...statsMap.entries()]
      .map(([userId, s]) => ({
        id: userId,
        username: userMap.get(userId) ?? '未知',
        ...s,
      }))
      .sort((a, b) => b.wins - a.wins)
      .slice(0, 10)

    return NextResponse.json(leaderboard)
  } catch (error) {
    console.error('Error fetching leaderboard:', error)
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}
