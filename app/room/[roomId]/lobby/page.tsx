'use client';

import { useRouter, useParams } from "next/navigation";
import { getDatabase, ref, onValue, update } from "firebase/database";
import { useEffect, useState } from "react";
import { app } from "@/app/config/firebase";
import { QuitButton } from "@/components/quit";

export default function LobbyPage() {
  const db = getDatabase(app);
  const router = useRouter();
  const { roomId } = useParams();
  const [players, setPlayers] = useState<string[]>([]);
  const [isHost, setIsHost] = useState(false);
  const [roomSettings, setRoomSettings] = useState({
    gameType: "Quote",
    maxPlayers: 8,
    maxRounds: 2,
    subTime: 30,
    voteTime: 30
  });

  useEffect(() => {
    const name = localStorage.getItem("playerName");
    if (!name) {
      router.push("/");
      return;
    }

    const roomRef = ref(db, `rooms/${roomId}`);
    const unsub = onValue(roomRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        router.push("/");
        return;
      }

      const allPlayers = Object.keys(data.players || {});
      setPlayers(allPlayers);

      const isRoomHost = data.host === name;
      setIsHost(isRoomHost);
      localStorage.setItem("isHost", JSON.stringify(isRoomHost));

      if (data.status === "submission") {
        router.push(`/room/${roomId}`);
      }
    });

    return () => unsub();
  }, [db, roomId, router]);

  useEffect(() => {
    const settingsRef = ref(db, `rooms/${roomId}/roomSettings`);
    const unsub = onValue(settingsRef, (snapshot) => {
      if (snapshot.exists()) {
        setRoomSettings(snapshot.val());
      }
    });

    return () => unsub();
  }, [db, roomId]);

  const handleStartGame = async () => {
    await update(ref(db, `rooms/${roomId}`), {
      status: "submission",
      timerStart: Date.now(),
      timeLeft: roomSettings.subTime,
      rounds: 1,
      currentRound: {}
    });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <h1 className="text-3xl font-bold">Room: {roomId}</h1>
      <QuitButton isHost={isHost} />
      <p className="text-red-100">⚠ Max {roomSettings.maxPlayers} players allowed!</p>

      <h2 className="text-xl">Lobby</h2>
      <p className="text-gray-500">Players joined:</p>
      <ul className="bg-indigo-900 p-4 rounded-lg w-64 text-center">
        {players.map((name) => (
          <li key={name} className="text-lg py-1">{name}</li>
        ))}
      </ul>

      {isHost && players.length >= 2 && players.length <= roomSettings.maxPlayers && (
        <button
          onClick={handleStartGame}
          className="bg-green-600 text-white px-6 py-3 rounded-xl hover:bg-green-800 mt-4"
        >
          Start Game
        </button>
      )}

      {players.length > roomSettings.maxPlayers && (
        <p className="text-red-500">⚠ Too many players! Max {roomSettings.maxPlayers} allowed.</p>
      )}

      {!isHost && (
        <p className="text-gray-400 italic">Waiting for host to start...</p>
      )}
    </div>
  );
}
