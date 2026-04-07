import { useState } from "react";

type Result = {
  result: "win" | "loss" | "tie";
  userMove: string;
  cpuMove: string;
  totals: { wins: number; losses: number; ties: number };
};

const MOVE_LABELS: Record<string, string> = {
  rock: "石頭 ✊",
  paper: "布 ✋",
  scissors: "剪刀 ✌️",
};

const RESULT_LABELS: Record<string, string> = {
  win: "勝利 🎉",
  loss: "落敗 😢",
  tie: "平手 🤝",
};

export default function Home() {
  const [username, setUsername] = useState("");
  const [last, setLast] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);

  async function play(move: "rock" | "paper" | "scissors") {
    if (!username.trim()) {
      alert("請先輸入使用者名稱");
      return;
    }
    setLoading(true);
    try {
      const r = await fetch("/api/play", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), move }),
      });
      const data: Result = await r.json();
      setLast(data);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ padding: 24, fontFamily: "Arial, sans-serif", maxWidth: 480 }}>
      <h1>猜拳小遊戲 ✊✋✌️</h1>

      <div style={{ marginBottom: 16 }}>
        <label>
          使用者名稱：
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="輸入名稱"
            style={{ marginLeft: 8, padding: "4px 8px" }}
          />
        </label>
      </div>

      <div style={{ marginBottom: 16, display: "flex", gap: 8 }}>
        {(["rock", "paper", "scissors"] as const).map((move) => (
          <button
            key={move}
            onClick={() => play(move)}
            disabled={loading}
            style={{ padding: "8px 16px", fontSize: 16, cursor: loading ? "not-allowed" : "pointer" }}
          >
            {MOVE_LABELS[move]}
          </button>
        ))}
      </div>

      {last && (
        <section
          style={{
            marginTop: 16,
            padding: 16,
            border: "1px solid #ccc",
            borderRadius: 8,
            background: last.result === "win" ? "#d4edda" : last.result === "loss" ? "#f8d7da" : "#fff3cd",
          }}
        >
          <h2 style={{ margin: "0 0 8px" }}>結果：{RESULT_LABELS[last.result]}</h2>
          <p style={{ margin: "4px 0" }}>
            你出：{MOVE_LABELS[last.userMove]} ／ 電腦出：{MOVE_LABELS[last.cpuMove]}
          </p>
          <hr style={{ margin: "12px 0" }} />
          <p style={{ margin: 0 }}>
            <strong>累計</strong> — 勝：{last.totals.wins}　敗：{last.totals.losses}　和：{last.totals.ties}
          </p>
        </section>
      )}
    </main>
  );
}
