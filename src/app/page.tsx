"use client";

import { useState, useEffect, useCallback, type FC } from "react";

type Move = "rock" | "paper" | "scissors";
type Result = "win" | "loss" | "draw";

interface User {
  id: number;
  username: string;
}

interface Score {
  wins: number;
  losses: number;
  draws: number;
}

interface LeaderboardEntry {
  id: number;
  username: string;
  wins: number;
  losses: number;
  draws: number;
  total: number;
}

const moveEmoji: Record<Move, string> = {
  rock: "🪨",
  paper: "📄",
  scissors: "✂️",
};

const moveName: Record<Move, string> = {
  rock: "石頭",
  paper: "布",
  scissors: "剪刀",
};

const moves: Move[] = ["rock", "paper", "scissors"];

const getComputerMove = (): Move => moves[Math.floor(Math.random() * 3)]

const determineResult = (player: Move, cpu: Move): Result => {
  if (player === cpu) return "draw"
  if (
    (player === "rock" && cpu === "scissors") ||
    (player === "paper" && cpu === "rock") ||
    (player === "scissors" && cpu === "paper")
  ) {
    return "win"
  }
  return "loss"
}

const Home: FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [usernameInput, setUsernameInput] = useState("");
  const [score, setScore] = useState<Score>({ wins: 0, losses: 0, draws: 0 });
  const [playerMove, setPlayerMove] = useState<Move | null>(null);
  const [cpuMove, setCpuMove] = useState<Move | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
  const [loginError, setLoginError] = useState("");

  const fetchLeaderboard = useCallback(async () => {
    setLoadingLeaderboard(true);
    try {
      const res = await fetch("/api/leaderboard");
      const data = await res.json();
      setLeaderboard(data);
    } catch (err) {
      console.error("Failed to fetch leaderboard", err);
    } finally {
      setLoadingLeaderboard(false);
    }
  }, []);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    const trimmed = usernameInput.trim();
    if (!trimmed) {
      setLoginError("請輸入用戶名");
      return;
    }
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: trimmed }),
      });
      if (!res.ok) {
        const data = await res.json();
        setLoginError(data.error || "登入失敗");
        return;
      }
      const data = await res.json();
      setUser(data);
    } catch (err) {
      console.error(err);
      setLoginError("網路錯誤，請稍後再試");
    }
  };

  const handleMove = async (move: Move) => {
    if (isAnimating || !user) return;
    setIsAnimating(true);
    setResult(null);
    setPlayerMove(null);
    setCpuMove(null);

    await new Promise((resolve) => setTimeout(resolve, 300));

    const cpu = getComputerMove();
    const gameResult = determineResult(move, cpu);

    setPlayerMove(move);
    setCpuMove(cpu);
    setResult(gameResult);

    setScore((prev) => ({
      wins: prev.wins + (gameResult === "win" ? 1 : 0),
      losses: prev.losses + (gameResult === "loss" ? 1 : 0),
      draws: prev.draws + (gameResult === "draw" ? 1 : 0),
    }));

    try {
      await fetch("/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          playerMove: move,
          cpuMove: cpu,
          result: gameResult,
        }),
      });
      fetchLeaderboard();
    } catch (err) {
      console.error("Failed to save game", err);
    }

    setIsAnimating(false);
  };

  const handleLogout = () => {
    setUser(null);
    setScore({ wins: 0, losses: 0, draws: 0 });
    setPlayerMove(null);
    setCpuMove(null);
    setResult(null);
    setUsernameInput("");
  };

  const resultText: Record<Result, string> = {
    win: "🎉 你贏了！",
    loss: "😢 你輸了！",
    draw: "🤝 平局！",
  };

  const resultColor: Record<Result, string> = {
    win: "text-green-400",
    loss: "text-red-400",
    draw: "text-yellow-400",
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 text-white">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold mb-2">✊ 猜拳遊戲</h1>
          <p className="text-purple-300 text-lg">Rock Paper Scissors</p>
        </div>

        {!user ? (
          /* Login Form */
          <div className="flex justify-center">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 w-full max-w-md border border-white/20">
              <h2 className="text-2xl font-bold mb-6 text-center">
                歡迎！請輸入你的名字
              </h2>
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <input
                    type="text"
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    placeholder="輸入用戶名..."
                    className="w-full px-4 py-3 rounded-xl bg-white/20 border border-white/30 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent text-lg"
                    maxLength={20}
                  />
                  {loginError && (
                    <p className="text-red-400 text-sm mt-1">{loginError}</p>
                  )}
                </div>
                <button
                  type="submit"
                  className="w-full py-3 bg-purple-500 hover:bg-purple-400 rounded-xl font-bold text-lg transition-all duration-200 hover:scale-105 active:scale-95"
                >
                  開始遊戲 🎮
                </button>
              </form>
            </div>
          </div>
        ) : (
          /* Game Area */
          <div className="space-y-6">
            {/* User bar */}
            <div className="flex items-center justify-between bg-white/10 backdrop-blur-sm rounded-xl px-6 py-3 border border-white/20">
              <span className="font-semibold text-lg">👤 {user.username}</span>
              <button
                onClick={handleLogout}
                className="text-sm text-purple-300 hover:text-white transition-colors"
              >
                換人 / 登出
              </button>
            </div>

            {/* Move buttons */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
              <h3 className="text-center text-lg font-semibold mb-6 text-purple-200">
                選擇你的出拳！
              </h3>
              <div className="grid grid-cols-3 gap-4">
                {moves.map((move) => (
                  <button
                    key={move}
                    onClick={() => handleMove(move)}
                    disabled={isAnimating}
                    className="flex flex-col items-center justify-center py-6 bg-white/10 hover:bg-white/25 border border-white/20 hover:border-white/50 rounded-2xl transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed group"
                  >
                    <span className="text-5xl mb-2 group-hover:scale-110 transition-transform">
                      {moveEmoji[move]}
                    </span>
                    <span className="font-semibold">{moveName[move]}</span>
                    <span className="text-xs text-purple-300 mt-0.5 capitalize">
                      {move}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Score board */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-green-500/20 border border-green-500/40 rounded-xl p-4 text-center">
                <div className="text-3xl font-bold text-green-400">
                  {score.wins}
                </div>
                <div className="text-green-300 text-sm mt-1">勝利 Wins</div>
              </div>
              <div className="bg-yellow-500/20 border border-yellow-500/40 rounded-xl p-4 text-center">
                <div className="text-3xl font-bold text-yellow-400">
                  {score.draws}
                </div>
                <div className="text-yellow-300 text-sm mt-1">平局 Draws</div>
              </div>
              <div className="bg-red-500/20 border border-red-500/40 rounded-xl p-4 text-center">
                <div className="text-3xl font-bold text-red-400">
                  {score.losses}
                </div>
                <div className="text-red-300 text-sm mt-1">失敗 Losses</div>
              </div>
            </div>

            {/* Game Result */}
            {result && playerMove && cpuMove && (
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 text-center">
                <div className="flex justify-center items-center gap-8 mb-4">
                  <div className="text-center">
                    <div className="text-6xl mb-2">{moveEmoji[playerMove]}</div>
                    <div className="text-sm text-purple-300">
                      你：{moveName[playerMove]}
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-white/50">VS</div>
                  <div className="text-center">
                    <div className="text-6xl mb-2">{moveEmoji[cpuMove]}</div>
                    <div className="text-sm text-purple-300">
                      電腦：{moveName[cpuMove]}
                    </div>
                  </div>
                </div>
                <div className={`text-3xl font-bold ${resultColor[result]}`}>
                  {resultText[result]}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Leaderboard */}
        <div className="mt-8 bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">🏆 排行榜 Leaderboard</h2>
            <button
              onClick={fetchLeaderboard}
              disabled={loadingLeaderboard}
              className="text-sm text-purple-300 hover:text-white transition-colors"
            >
              {loadingLeaderboard ? "載入中..." : "重新整理"}
            </button>
          </div>
          {leaderboard.length === 0 ? (
            <p className="text-center text-purple-300 py-4">
              尚無紀錄，快來挑戰吧！
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-purple-300 text-sm border-b border-white/20">
                    <th className="text-left py-2 px-3">排名</th>
                    <th className="text-left py-2 px-3">玩家</th>
                    <th className="text-right py-2 px-3 text-green-400">勝</th>
                    <th className="text-right py-2 px-3 text-yellow-400">平</th>
                    <th className="text-right py-2 px-3 text-red-400">敗</th>
                    <th className="text-right py-2 px-3">總場次</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((entry, index) => (
                    <tr
                      key={entry.id}
                      className={`border-b border-white/10 hover:bg-white/5 transition-colors ${
                        user && entry.username === user.username
                          ? "bg-purple-500/20"
                          : ""
                      }`}
                    >
                      <td className="py-3 px-3 font-bold">
                        {index === 0
                          ? "🥇"
                          : index === 1
                            ? "🥈"
                            : index === 2
                              ? "🥉"
                              : `#${index + 1}`}
                      </td>
                      <td className="py-3 px-3 font-semibold">
                        {entry.username}
                      </td>
                      <td className="py-3 px-3 text-right text-green-400 font-bold">
                        {entry.wins}
                      </td>
                      <td className="py-3 px-3 text-right text-yellow-400">
                        {entry.draws}
                      </td>
                      <td className="py-3 px-3 text-right text-red-400">
                        {entry.losses}
                      </td>
                      <td className="py-3 px-3 text-right text-purple-300">
                        {entry.total}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

export default Home
