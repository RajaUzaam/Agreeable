'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getDatabase, ref, onValue, get, update } from 'firebase/database';
import { app } from '@/app/config/firebase';
import { QuitButton } from '@/components/quit';

export default function ResultsPage() {
  const { roomId } = useParams();
  const db = getDatabase(app);
  const router = useRouter();

  const [playerVotes, setPlayerVotes] = useState<Record<string, number>>({});
  const [isHost, setIsHost] = useState(false);
  const [loading, setLoading] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setPlayerName(localStorage.getItem('playerName') || '');
      setIsHost(localStorage.getItem('isHost') === 'true');
    }
  }, []);

  useEffect(() => {
    if (!roomId || initialized) return;

    const playersRef = ref(db, `rooms/${roomId}/players`);
    const unsub = onValue(playersRef, (snap) => {
      if (!snap.exists()) return;
      const data = snap.val() || {};
      const votesData: Record<string, number> = {};

      for (const player in data) {
        votesData[player] = data[player]?.votes || 0;
      }

      setPlayerVotes(votesData);
      setInitialized(true);
    });

    return () => unsub();
  }, [roomId, db, initialized]);

  const handleRestart = async () => {
    if (!roomId || !playerName) return;
    setLoading(true);

    try {
      await update(ref(db, `rooms/${roomId}`), {
        status: 'lobby',
        timeLeft: 30,
        players: {
          [playerName]: { votes: 0 }
        },
        currentRound: {},
        rounds: 1
      });

      router.push(`/room/${roomId}/lobby`);
    } catch (err) {
      alert(`Failed to restart the game. ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleTryAgain = async () => {
    const name = playerName;
    const code = localStorage.getItem('roomCode');

    if (!name || !code) {
      alert('Missing name or room code.');
      return;
    }

    try {
      const roomRef = ref(db, `rooms/${code}`);
      const snapshot = await get(roomRef);

      if (!snapshot.exists()) {
        alert('Room not found. Please check the code and try again.');
        return;
      }

      const room = snapshot.val();

      if (Object.keys(room.players || {}).length >= (room.roomSettings?.maxPlayers || 8)) {
        alert('Room is full. Please try another room.');
        return;
      }

      if (room.status !== 'lobby') {
        alert('Room not available. Please wait and try again.');
        return;
      }

      await update(ref(db, `rooms/${code}/players/${name}`), { votes: 0 });
      router.push(`/room/${code}/lobby`);
    } catch (err) {
      alert(`Something went wrong. Try again. ${err}`);
    }
  };

  return (
    <div className="min-h-screen p-6 flex flex-col items-center justify-center gap-6">
      <h1 className="text-4xl font-bold text-center">🏆 Final Results</h1>
      <QuitButton isHost={isHost} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl">
        {Object.entries(playerVotes)
          .sort((a, b) => b[1] - a[1])
          .map(([player, votes]) => (
            <div
              key={player}
              className="p-6 rounded-xl bg-[#69468d] text-[#f8f6fa] border-[#c8a2c8] border-2 text-center"
            >
              <h2 className="text-2xl font-semibold mb-2 break-all">{player}</h2>
              <hr className="border-black my-2" />
              <p className="text-lg font-medium">Total Votes: {votes}</p>
            </div>
          ))}
      </div>

      {isHost ? (
        <button
          onClick={handleRestart}
          disabled={loading}
          className="mt-8 bg-green-600 hover:bg-green-800 text-white px-6 py-3 rounded-xl"
        >
          {loading ? 'Restarting...' : 'Restart Game'}
        </button>
      ) : (
        <button
          onClick={handleTryAgain}
          className="mt-8 bg-blue-600 hover:bg-blue-800 text-white px-6 py-3 rounded-xl"
        >
          Try Again
        </button>
      )}
    </div>
  );
}
