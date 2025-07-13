'use client';

import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase, ref, set, get, update } from 'firebase/database';
import { app } from '@/app/config/firebase';
import { auth } from '@/app/config/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { useEffect, useState } from 'react';

export default function Home() {
  const [rounds, setRounds] = useState(2);
  const [maxPlayers, setMaxPlayers] = useState(8);
  const [subTime, setSubTime] = useState(30);
  const [voteTime, setVoteTime] = useState(30);
  const [selectedGameType, setSelectedGameType] = useState("Quote");
  const [roomCode, setRoomCode] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [uid, setUid] = useState<string | null>(null);

  const router = useRouter();
  const db = getDatabase(app);
  
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) router.push('/');
      else setUid(user.uid);
    });
    return () => unsub();
  }, [router]);

  const gameTypes = ["Meme", "Quote", "Hot-Take", "Joke"];
  const gameOptions = [
    { name: "Max Rounds", value: rounds, setter: setRounds },
    { name: "Max Players", value: maxPlayers, setter: setMaxPlayers },
    { name: "Submission Time", value: subTime, setter: setSubTime },
    { name: "Vote Time", value: voteTime, setter: setVoteTime }
  ];

  const validateSettings = () =>
    rounds >= 1 &&
    rounds <= 10 &&
    maxPlayers >= 3 &&
    maxPlayers <= 10 &&
    subTime >= 10 &&
    subTime <= 120 &&
    voteTime >= 10 &&
    voteTime <= 120;

  const handleCreateRoom = async () => {
    if (!uid) return alert("User not authenticated.");
    if (!playerName.trim()) return alert("Please enter a username.");
    if (!validateSettings()) return alert("Please set valid game options.");

    const roomId = uuidv4().slice(0, 6);
    localStorage.setItem("roomCode", roomId);

    await set(ref(db, `rooms/${roomId}`), {
      createdAt: Date.now(),
      host: uid,
      status: "lobby",
      rounds: 1,
      roomSettings: {
        gameType: selectedGameType,
        maxPlayers,
        maxRounds: rounds,
        subTime,
        voteTime
      },
      players: {
        [uid]: { name: playerName.trim(), votes: 0 }
      },
      currentRound: {}
    });

    localStorage.setItem("playerName", playerName.trim());
    localStorage.setItem("isHost", "true");
    router.push(`/room/${roomId}/lobby`);
  };

  const handleJoinRoom = async () => {
    if (!uid) return alert("User not authenticated.");
    if (!playerName.trim()) return alert("Please enter a username.");

    const code = roomCode.trim();
    localStorage.setItem("roomCode", code);

    const roomRef = ref(db, `rooms/${code}`);
    const snapshot = await get(roomRef);
    if (!snapshot.exists()) return alert("Room not found.");

    const room = snapshot.val();
    const players = room.players || {};
    const max = room.roomSettings?.maxPlayers || 8;

    if (Object.keys(players).length >= max) return alert("Room is full.");
    if (room.status !== "lobby") return alert("Game already started.");

    await update(ref(db, `rooms/${code}/players/${uid}`), {
      name: playerName.trim(),
      votes: 0
    });

    localStorage.setItem("playerName", playerName.trim());
    localStorage.setItem("isHost", "false");
    router.push(`/room/${code}/lobby`);
  };

  return (
    <div className="w-full min-h-screen flex flex-col items-center justify-center px-4 py-8 gap-6">
      <h1 className="text-4xl sm:text-5xl md:text-6xl text-center font-bold">AGREEABLE</h1>
      <p className="text-lg sm:text-xl md:text-2xl text-gray-400 text-center">[Join or Create a room]</p>

      <div className="w-full max-w-md flex flex-col gap-4">
        <input
          type="text"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          placeholder="Username..."
          className="border-2 border-gray-300 text-base sm:text-xl rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
        />

        <hr />

        {gameOptions.map(({ name, value, setter }, i) => (
          <label key={i} className="text-md sm:text-xl w-full">
            {name}:
            <input
              type="number"
              value={value}
              onChange={(e) => setter(Number(e.target.value))}
              className="w-full border-2 border-gray-300 text-base sm:text-xl rounded-lg px-4 py-2 mt-1 focus:outline-none focus:border-blue-500"
            />
          </label>
        ))}

        <p className="text-md sm:text-xl">Game Type:</p>
        <div className="flex flex-wrap gap-2 items-center justify-center">
          {gameTypes.map((type) => (
            <button
              key={type}
              onClick={() => setSelectedGameType(type)}
              className={`px-4 py-2 rounded-lg text-base sm:text-xl transition-colors ${
                selectedGameType === type
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-800 hover:bg-blue-500 hover:text-white"
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        <button
          onClick={handleCreateRoom}
          className="bg-emerald-600 text-white text-base sm:text-xl px-4 py-2 rounded-md hover:bg-emerald-800 transition"
        >
          Create Room
        </button>

        <hr />

        <input
          type="text"
          value={roomCode}
          onChange={(e) => setRoomCode(e.target.value)}
          placeholder="Enter Room Code"
          className="border-2 border-gray-300 text-base sm:text-xl rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
        />

        <button
          onClick={handleJoinRoom}
          className="bg-red-600 text-white text-base sm:text-xl px-4 py-2 rounded-md hover:bg-red-800 transition"
        >
          Join Room
        </button>
      </div>
    </div>
  );
}
