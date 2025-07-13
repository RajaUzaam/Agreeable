'use client';

import { useRouter, useParams } from "next/navigation";
import { getDatabase, ref, onValue, update, onDisconnect } from "firebase/database";
import { useEffect, useState } from "react";
import { app } from "@/app/config/firebase";
import { auth } from "@/app/config/auth";
import { onAuthStateChanged } from "firebase/auth";
import { QuitButton } from "@/components/quit";

export default function LobbyPage() {
  const db = getDatabase(app);
  const router = useRouter();
  const { roomId } = useParams();

  const [uid, setUid] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [players, setPlayers] = useState<{ [uid: string]: { name: string } }>({});
  const [roomSettings, setRoomSettings] = useState({
    gameType: "Quote",
    maxPlayers: 8,
    maxRounds: 2,
    subTime: 30,
    voteTime: 30,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push("/");
      } else {
        setUid(user.uid);
        setIsHost(localStorage.getItem("isHost") === "true");

        if (roomId) {
          const playerRef = ref(db, `rooms/${roomId}/players/${user.uid}`);
          onDisconnect(playerRef).remove();
        }
      }
    });

    return () => unsubscribe();
  }, [router, roomId, db]);

  useEffect(() => {
    if (!uid) return;

    const roomRef = ref(db, `rooms/${roomId}`);
    const unsub = onValue(roomRef, (snapshot) => {
      const data = snapshot.val();
      if (!data || !data.host) {
        router.push("/");
        return;
      }

      setIsHost(data.host === uid);
      setPlayers(data.players || {});

      if (data.status === "submission") {
        router.push(`/room/${roomId}`);
      }
    });

    return () => unsub();
  }, [db, roomId, uid, router]);

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
      currentRound: {},
    });
  };

  const playerCount = Object.keys(players).length;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <h1 className="text-3xl font-bold">Room: {roomId}</h1>
      <QuitButton isHost={isHost} />
      <p className="text-red-100">⚠ Max {roomSettings.maxPlayers} players allowed!</p>

      <h2 className="text-xl">Lobby</h2>
      <p className="text-gray-500">Players joined:</p>

      <ul className="bg-indigo-900 p-4 rounded-lg w-64 text-center">
        {Object.entries(players).map(([uid, { name }]) => (
          <li key={uid} className="text-lg py-1">{name}</li>
        ))}
      </ul>

      {isHost && playerCount >= 2 && playerCount <= roomSettings.maxPlayers && (
        <button
          onClick={handleStartGame}
          className="bg-green-600 text-white px-6 py-3 rounded-xl hover:bg-green-800 mt-4"
        >
          Start Game
        </button>
      )}

      {playerCount > roomSettings.maxPlayers && (
        <p className="text-red-500">⚠ Too many players! Max {roomSettings.maxPlayers} allowed.</p>
      )}

      {!isHost && (
        <p className="text-gray-400 italic">Waiting for host to start...</p>
      )}
    </div>
  );
}
