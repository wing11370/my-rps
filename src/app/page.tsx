"use client";

import React, { useState, useEffect, useCallback, useRef, type FC } from "react";
import styled from "styled-components";
import { io, type Socket } from "socket.io-client";

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

interface Opponent {
  id: number;
  username: string;
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

const getComputerMove = (): Move => moves[Math.floor(Math.random() * 3)];

const determineResult = (player: Move, cpu: Move): Result => {
  if (player === cpu) return "draw";
  if (
    (player === "rock" && cpu === "scissors") ||
    (player === "paper" && cpu === "rock") ||
    (player === "scissors" && cpu === "paper")
  ) {
    return "win";
  }
  return "loss";
};

// Styled components
const Main = styled.main`
  min-height: 100vh;
  background: linear-gradient(135deg, #1e293b 0%, #4c1d95 50%, #be185d 100%);
  color: #fff;
`;

const Container = styled.div`
  max-width: 64rem;
  margin: 0 auto;
  padding: 2rem 1rem;
`;

const Header = styled.header`
  text-align: center;
  margin-bottom: 2rem;
`;

const Title = styled.h1`
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
  font-weight: 800;
`;

const Subtitle = styled.p`
  color: rgba(192, 132, 252, 0.9);
  font-size: 1.125rem;
`;

const GlassCard = styled.div`
  background: rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 1.5rem;
  border: 1px solid rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
`;

const Center = styled.div`
  display: flex;
  justify-content: center;
`;

const LoginCard = styled(GlassCard)`
  width: 100%;
  max-width: 28rem;
`;

const Form = styled.form`
  display: grid;
  gap: 1rem;
`;

const TextInput = styled.input`
  width: 100%;
  padding: 0.75rem 1rem;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.09);
  border: 1px solid rgba(255, 255, 255, 0.14);
  color: #fff;
  font-size: 1rem;
  &:focus {
    outline: none;
    box-shadow: 0 0 0 6px rgba(124, 58, 237, 0.085);
  }
`;

const PrimaryButton = styled.button<{ $small?: boolean }>`
  width: ${(p) => (p.$small ? "auto" : "100%")};
  padding: ${(p) => (p.$small ? "0.5rem 0.75rem" : "0.75rem 1rem")};
  border-radius: 12px;
  border: none;
  background: linear-gradient(180deg, #8b5cf6, #7c3aed);
  color: #fff;
  font-weight: 700;
  cursor: pointer;
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

const FlexBetween = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const MovesWrapper = styled(GlassCard)`
  padding: 1.25rem;
`;

const MovesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
`;

const MoveButton = styled.button`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1.25rem;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  cursor: pointer;
  transition: transform 160ms ease, background 160ms ease, border-color 160ms ease;
  &:hover {
    transform: scale(1.03);
    background: rgba(255, 255, 255, 0.12);
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

const ScoreGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
`;

const ScoreCard = styled.div<{ $bg?: string; $border?: string; $text?: string }>`
  background: ${(p) => p.$bg || "rgba(255,255,255,0.06)"};
  border: 1px solid ${(p) => p.$border || "rgba(255,255,255,0.08)"};
  border-radius: 12px;
  padding: 0.75rem;
  text-align: center;
  color: ${(p) => p.$text || "#fff"};
`;

const ResultCard = styled(GlassCard)`
  text-align: center;
`;

const LeaderboardCard = styled(GlassCard)`
  margin-top: 1.25rem;
`;

const LeaderboardTable = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const LeaderboardRow = styled.tr<{ $highlighted?: boolean }>`
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  transition: background 160ms ease;
  background: ${(p) => (p.$highlighted ? "rgba(124,58,237,0.12)" : "transparent")};
  &:hover {
    background: rgba(255, 255, 255, 0.03);
  }
`;

const LeaderboardHead = styled.th`
  text-align: left;
  padding: 0.5rem 0.75rem;
  color: rgba(192, 132, 252, 0.95);
  font-weight: 600;
`;

const Cell = styled.td`
  padding: 0.5rem 0.75rem;
`;

const RankCell = styled(Cell)`
  font-weight: 700;
`;

const Centered = styled.div`
  text-align: center;
`;

const LoginTitle = styled.h2`
  font-size: 1.25rem;
  font-weight: 700;
  margin-bottom: 0.75rem;
  text-align: center;
`;

const ErrorText = styled.p`
  color: #fb7185;
  margin-top: 0.5rem;
  font-size: 0.875rem;
`;

const ContentGrid = styled.div`
  display: grid;
  gap: 1rem;
`;

const UserBar = styled(GlassCard)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
`;

const UserName = styled.span`
  font-weight: 700;
  font-size: 1rem;
`;

const MovesTitle = styled.h3`
  text-align: center;
  font-size: 1rem;
  font-weight: 700;
  margin-bottom: 0.75rem;
  color: rgba(192,132,252,0.9);
`;

const EmojiSpan = styled.span`
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
`;

const MoveLabel = styled.span`
  font-weight: 700;
`;

const MoveMeta = styled.span`
  font-size: 0.75rem;
  color: rgba(192,132,252,0.8);
  margin-top: 0.25rem;
  text-transform: capitalize;
`;

const ScoreValue = styled.div`
  font-size: 1.5rem;
  font-weight: 800;
`;

const ScoreLabel = styled.div<{ $labelColor?: string }>`
  color: ${(p) => p.$labelColor || "inherit"};
  margin-top: 0.25rem;
  font-size: 0.875rem;
`;

const ResultInner = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 2rem;
  margin-bottom: 0.75rem;
`;

const ResultBlock = styled.div`
  text-align: center;
`;

const ResultEmoji = styled.div`
  font-size: 3rem;
  margin-bottom: 0.25rem;
`;

const ResultUserLabel = styled.div`
  color: rgba(192,132,252,0.9);
`;

const VSLabel = styled.div`
  font-size: 1.25rem;
  font-weight: 800;
  color: rgba(255,255,255,0.6);
`;

const ResultTextStyled = styled.div<{ $color?: string }>`
  font-size: 1.5rem;
  font-weight: 800;
  color: ${(p) => p.$color || "#fff"};
`;

const SectionHeader = styled(FlexBetween)`
  margin-bottom: 0.5rem;
`;

const SectionTitle = styled.h2`
  font-size: 1.125rem;
  font-weight: 800;
`;

const EmptyState = styled(Centered)`
  color: rgba(192,132,252,0.9);
  padding: 1rem 0;
`;

const OverflowContainer = styled.div`
  overflow-x: auto;
`;

const LeaderboardHeadRight = styled(LeaderboardHead)`
  text-align: right;
`;

const UsernameCell = styled(Cell)`
  font-weight: 700;
`;

const RightCell = styled(Cell)<{ $color?: string; $bold?: boolean }>`
  text-align: right;
  color: ${(p) => p.$color || "inherit"};
  font-weight: ${(p) => (p.$bold ? "800" : "normal")};
`;

const ButtonsRow = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
`;

const MultiplayerCard = styled(GlassCard)`
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const InputRow = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
`;

const CountdownBadge = styled.div`
  font-size: 1.25rem;
  font-weight: 800;
  color: #111827;
  background: rgba(249,115,22,0.95);
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  display: inline-block;
`;

const DangerButton = styled.button<{ $small?: boolean }>`
  width: ${(p) => (p.$small ? "auto" : "100%")};
  padding: ${(p) => (p.$small ? "0.5rem 0.75rem" : "0.75rem 1rem")};
  border-radius: 12px;
  border: none;
  background: linear-gradient(180deg, #ef4444, #dc2626);
  color: #fff;
  font-weight: 700;
  cursor: pointer;
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

const Home: FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [usernameInput, setUsernameInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [score, setScore] = useState<Score>({ wins: 0, losses: 0, draws: 0 });
  const [playerMove, setPlayerMove] = useState<Move | null>(null);
  const [cpuMove, setCpuMove] = useState<Move | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [resetting, setResetting] = useState(false);

  const [countdown, setCountdown] = useState<number | null>(null);

  // Multiplayer socket state
  const socketRef = useRef<Socket | null>(null);
  const [roomInput, setRoomInput] = useState("");
  const [currentRoom, setCurrentRoom] = useState<string | null>(null);
  const [opponent, setOpponent] = useState<Opponent | null>(null);
  const [inRoom, setInRoom] = useState(false);

  const SOCKET_URL = (process.env.NEXT_PUBLIC_SOCKET_URL as string) || "http://localhost:4000";

  const fetchLeaderboard = useCallback(async () => {
    setLoadingLeaderboard(true);
    try {
      const res = await fetch("/api/leaderboard");
      const data: LeaderboardEntry[] = await res.json();
      setLeaderboard(data);

      // If a user is logged in, sync their score from the leaderboard
      if (user) {
        const myEntry = data.find((e) => e.id === user.id);
        if (myEntry) {
          setScore({ wins: myEntry.wins, losses: myEntry.losses, draws: myEntry.draws });
        } else {
          // no entry -> zeroed scores
          setScore({ wins: 0, losses: 0, draws: 0 });
        }
      }
    } catch (err) {
      console.error("Failed to fetch leaderboard", err);
    } finally {
      setLoadingLeaderboard(false);
    }
  }, [user]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  // cleanup socket on unmount
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        try {
          socketRef.current.disconnect();
        } catch (e) {
          // ignore
        }
        socketRef.current = null;
      }
    };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    const trimmed = usernameInput.trim();
    if (!trimmed) {
      setLoginError("請輸入用戶名");
      return;
    }
    if (!passwordInput || passwordInput.length < 6) {
      setLoginError('請輸入至少 6 字元的密碼');
      return;
    }
    try {
      const res = await fetch("/api/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: trimmed, password: passwordInput }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 404) {
          setLoginError('用戶不存在，請先註冊');
        } else if (res.status === 401) {
          setLoginError('密碼錯誤');
        } else {
          setLoginError(data.error || '登入失敗');
        }
        return;
      }
      const data = await res.json();
      setUser(data);
    } catch (err) {
      console.error(err);
      setLoginError("網路錯誤，請稍後再試");
    }
  };

  const handleRegister = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoginError("");
    const trimmed = usernameInput.trim();
    if (!trimmed) {
      setLoginError("請輸入用戶名");
      return;
    }
    if (!passwordInput || passwordInput.length < 6) {
      setLoginError('請輸入至少 6 字元的密碼');
      return;
    }

    try {
      const res = await fetch('/api/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: trimmed, password: passwordInput }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setLoginError(data.error || '註冊失敗');
        return;
      }
      const data = await res.json();
      setUser(data);
    } catch (err) {
      console.error('register error', err);
      setLoginError('網路錯誤，請稍後再試');
    }
  }

  const handleResetScores = async () => {
    if (!confirm('你確定要清空所有分數？此動作無法復原。')) return;
    setResetting(true);
    try {
      const res = await fetch('/api/admin/reset-scores', { method: 'POST' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || '重設失敗');
        return;
      }
      fetchLeaderboard();
    } catch (err) {
      console.error('Failed to reset scores', err);
      alert('網路錯誤，請稍後再試');
    } finally {
      setResetting(false);
    }
  };

  // Socket helpers
  const connectSocket = () => {
    if (socketRef.current) return socketRef.current;
    const s = io(SOCKET_URL, { transports: ["websocket"] });
    socketRef.current = s;

    s.on("connect", () => {
      console.log("socket connected", s.id);
    });

    s.on("room_joined", (data: any) => {
      setInRoom(true);
      setOpponent(data?.opponent || null);
    });

    s.on("room_ready", (data: any) => {
      setOpponent(data?.opponent || null);
    });

    s.on("countdown", (payload: any) => {
      if (!payload) return;
      const { seconds } = payload;
      setCountdown(typeof seconds === 'number' ? seconds : null);
    });

    s.on("countdown_cancel", () => {
      setCountdown(null);
    });

    s.on("match_result", (payload: any) => {
      if (!payload) return;
      const { myMove, opponentMove, myResult } = payload;
      setPlayerMove(myMove);
      setCpuMove(opponentMove);
      setResult(myResult);
      setScore((prev) => ({
        wins: prev.wins + (myResult === "win" ? 1 : 0),
        losses: prev.losses + (myResult === "loss" ? 1 : 0),
        draws: prev.draws + (myResult === "draw" ? 1 : 0),
      }));

      // persist multiplayer result via existing API
      fetch("/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user?.id,
          playerMove: myMove,
          cpuMove: opponentMove,
          result: myResult,
        }),
      })
        .then(() => fetchLeaderboard())
        .catch((err) => console.error("Failed to save multiplayer game", err));

      // clear any countdown UI
      setCountdown(null);

      setIsAnimating(false);
    });

    s.on("opponent_left", () => {
      setOpponent(null);
      setInRoom(false);
      setCurrentRoom(null);
      setCountdown(null);
      // notify user
    });

    s.on("disconnect", () => {
      setInRoom(false);
      setOpponent(null);
      setCurrentRoom(null);
      setCountdown(null);
      socketRef.current = null;
    });

    return s;
  };

  const joinRoom = (roomId: string) => {
    if (!user) {
      alert("請先登入");
      return;
    }
    const s = connectSocket();
    s.emit("join", { roomId, userId: user.id, username: user.username });
    setCurrentRoom(roomId);
    setRoomInput(roomId);
  };

  const leaveRoom = () => {
    if (!socketRef.current || !currentRoom || !user) return;
    socketRef.current.emit("leave", { roomId: currentRoom, userId: user.id });
    socketRef.current.disconnect();
    socketRef.current = null;
    setCurrentRoom(null);
    setInRoom(false);
    setOpponent(null);
  };

  const handleMove = async (move: Move) => {
    if (isAnimating || !user) return;

    // If in a multiplayer room, send move to server and wait for match_result
    if (socketRef.current && inRoom && currentRoom) {
      setIsAnimating(true);
      setResult(null);
      setPlayerMove(null);
      setCpuMove(null);
      socketRef.current.emit("move", { roomId: currentRoom, userId: user.id, move });
      return;
    }

    // single-player flow (vs computer)
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
    win: "#34d399",
    loss: "#f87171",
    draw: "#f59e0b",
  };

  return (
    <Main>
      <Container>
        <Header>
          <Title>✊ 猜拳遊戲</Title>
          <Subtitle>Rock Paper Scissors</Subtitle>
        </Header>

        {!user ? (
          <Center>
            <LoginCard>
              <LoginTitle>歡迎！請輸入你的名字</LoginTitle>
              <Form onSubmit={handleLogin}>
                <div>
                  <TextInput
                    type="text"
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    placeholder="輸入用戶名..."
                    maxLength={20}
                  />
                  <TextInput
                    type="password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="密碼 (至少 6 字元)"
                    maxLength={64}
                    style={{ marginTop: '0.5rem' }}
                  />
                  {loginError && (
                    <ErrorText>{loginError}</ErrorText>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <PrimaryButton type="submit">登入</PrimaryButton>
                  <PrimaryButton type="button" onClick={handleRegister}>註冊</PrimaryButton>
                </div>
              </Form>
            </LoginCard>
          </Center>
        ) : (
          <ContentGrid>
            <UserBar>
              <UserName>👤 {user.username}</UserName>
              <PrimaryButton $small onClick={handleLogout}>換人 / 登出</PrimaryButton>
            </UserBar>

            <MultiplayerCard>
              <SectionHeader>
                <SectionTitle>🔗 即時對戰</SectionTitle>
                <ButtonsRow>
                  {!inRoom ? (
                    <>
                      <PrimaryButton $small onClick={() => { const id = Math.random().toString(36).slice(2, 8).toUpperCase(); joinRoom(id); }}>建立房間</PrimaryButton>
                      <PrimaryButton $small onClick={() => { if (!roomInput) return alert('請輸入房間代碼或建立房間'); joinRoom(roomInput); }}>加入房間</PrimaryButton>
                    </>
                  ) : (
                    <DangerButton $small onClick={leaveRoom}>離開房間</DangerButton>
                  )}
                </ButtonsRow>
              </SectionHeader>

              <InputRow>
                <TextInput value={roomInput} onChange={(e) => setRoomInput(e.target.value)} placeholder="房間代碼 (留空以自動建立)" />
              </InputRow>

              {inRoom && (
                <div>
                  目前房間: <strong>{currentRoom}</strong> — {opponent ? `對手：${opponent.username}` : '等待對手加入...'}
                </div>
              )}
              {countdown !== null && (
                <div>
                  <CountdownBadge>剩餘時間：{countdown}s</CountdownBadge>
                </div>
              )}
            </MultiplayerCard>

            <MovesWrapper>
              <MovesTitle>選擇你的出拳！</MovesTitle>
              <MovesGrid>
                {moves.map((move) => (
                  <MoveButton key={move} onClick={() => handleMove(move)} disabled={isAnimating}>
                    <EmojiSpan>{moveEmoji[move]}</EmojiSpan>
                    <MoveLabel>{moveName[move]}</MoveLabel>
                    <MoveMeta>{move}</MoveMeta>
                  </MoveButton>
                ))}
              </MovesGrid>
            </MovesWrapper>

            <ScoreGrid>
              <ScoreCard $bg="rgba(16,185,129,0.12)" $border="rgba(16,185,129,0.25)" $text="#34d399">
                <ScoreValue>{score.wins}</ScoreValue>
                <ScoreLabel $labelColor="rgba(16,185,129,0.7)">勝利 Wins</ScoreLabel>
              </ScoreCard>
              <ScoreCard $bg="rgba(234,179,8,0.12)" $border="rgba(234,179,8,0.25)" $text="#f59e0b">
                <ScoreValue>{score.draws}</ScoreValue>
                <ScoreLabel $labelColor="rgba(234,179,8,0.7)">平局 Draws</ScoreLabel>
              </ScoreCard>
              <ScoreCard $bg="rgba(239,68,68,0.12)" $border="rgba(239,68,68,0.25)" $text="#f87171">
                <ScoreValue>{score.losses}</ScoreValue>
                <ScoreLabel $labelColor="rgba(239,68,68,0.7)">失敗 Losses</ScoreLabel>
              </ScoreCard>
            </ScoreGrid>

            {result && playerMove && cpuMove && (
              <ResultCard>
                <ResultInner>
                  <ResultBlock>
                    <ResultEmoji>{moveEmoji[playerMove]}</ResultEmoji>
                    <ResultUserLabel>你：{moveName[playerMove]}</ResultUserLabel>
                  </ResultBlock>
                  <VSLabel>VS</VSLabel>
                  <ResultBlock>
                    <ResultEmoji>{moveEmoji[cpuMove]}</ResultEmoji>
                    <ResultUserLabel>電腦：{moveName[cpuMove]}</ResultUserLabel>
                  </ResultBlock>
                </ResultInner>
                <ResultTextStyled $color={resultColor[result]}>{resultText[result]}</ResultTextStyled>
              </ResultCard>
            )}
          </ContentGrid>
        )}

        <LeaderboardCard>
          <SectionHeader>
            <SectionTitle>🏆 排行榜 Leaderboard</SectionTitle>
            <ButtonsRow>
              <PrimaryButton $small onClick={fetchLeaderboard} disabled={loadingLeaderboard}>{loadingLeaderboard ? "載入中..." : "重新整理"}</PrimaryButton>
              <DangerButton $small onClick={handleResetScores} disabled={loadingLeaderboard || resetting}>清空所有分數</DangerButton>
            </ButtonsRow>
          </SectionHeader>

          {leaderboard.length === 0 ? (
            <EmptyState>尚無紀錄，快來挑戰吧！</EmptyState>
          ) : (
            <OverflowContainer>
              <LeaderboardTable>
                <thead>
                  <tr>
                    <LeaderboardHead>排名</LeaderboardHead>
                    <LeaderboardHead>玩家</LeaderboardHead>
                    <LeaderboardHeadRight>勝</LeaderboardHeadRight>
                    <LeaderboardHeadRight>平</LeaderboardHeadRight>
                    <LeaderboardHeadRight>敗</LeaderboardHeadRight>
                    <LeaderboardHeadRight>總場次</LeaderboardHeadRight>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((entry, index) => (
                    <LeaderboardRow key={entry.id} $highlighted={!!user && entry.username === user.username}>
                      <RankCell>{index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `#${index + 1}`}</RankCell>
                      <UsernameCell>{entry.username}</UsernameCell>
                      <RightCell $color="#34d399" $bold>{entry.wins}</RightCell>
                      <RightCell $color="#f59e0b">{entry.draws}</RightCell>
                      <RightCell $color="#f87171">{entry.losses}</RightCell>
                      <RightCell $color="rgba(192,132,252,0.9)">{entry.total}</RightCell>
                    </LeaderboardRow>
                  ))}
                </tbody>
              </LeaderboardTable>
            </OverflowContainer>
          )}
        </LeaderboardCard>
      </Container>
    </Main>
  );
};

export default Home;
