import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../lib/prisma";

const moves = ["rock", "paper", "scissors"] as const;
type Move = (typeof moves)[number];

function decide(user: Move, cpu: Move): "win" | "loss" | "tie" {
  if (user === cpu) return "tie";
  if (
    (user === "rock" && cpu === "scissors") ||
    (user === "paper" && cpu === "rock") ||
    (user === "scissors" && cpu === "paper")
  ) {
    return "win";
  }
  return "loss";
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") return res.status(405).end();

  const { username, move } = req.body as { username: string; move: string };
  if (!username || !move || !moves.includes(move as Move)) {
    return res.status(400).json({ error: "Invalid payload" });
  }

  const userMove = move as Move;
  const cpuMove = moves[Math.floor(Math.random() * moves.length)];
  const result = decide(userMove, cpuMove);

  const user = await prisma.user.upsert({
    where: { name: username },
    create: {
      name: username,
      wins: result === "win" ? 1 : 0,
      losses: result === "loss" ? 1 : 0,
      ties: result === "tie" ? 1 : 0,
    },
    update: {
      wins: { increment: result === "win" ? 1 : 0 },
      losses: { increment: result === "loss" ? 1 : 0 },
      ties: { increment: result === "tie" ? 1 : 0 },
    },
  });

  await prisma.game.create({
    data: {
      userId: user.id,
      userMove,
      cpuMove,
      result,
    },
  });

  return res.json({
    result,
    userMove,
    cpuMove,
    totals: { wins: user.wins, losses: user.losses, ties: user.ties },
  });
}
