'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getDatabase, ref, onValue, get, update } from 'firebase/database';
import { app } from '@/app/config/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/app/config/auth';
import { QuitButton } from '@/components/quit';

export default function ResultsPage() {
  const { roomId } = useParams();
  const db = getDatabase(app);
  const router = useRouter();

  const [uid, setUid] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [loading, setLoading] = useState(false);

  const [playerVotes, setPlayerVotes] = useState<Record<string, number>>({});
  const [nameMap, setNameMap] = useState<Record<string, string>>({});

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) return router.push('/');
      setUid(user.uid);
      setPlayerName(localStorage.getItem('playerName') || '');
    });
    return () => unsub();
  }, [router]);

  useEffect(() => {
    if (!roomId) return;

    const playersRef = ref(db, `rooms/${roomId}/players`);
    const unsub = onValue(playersRef, (snap) => {
      const data = snap.val();
      if (!data) return;
      if (playerVotes && Object.keys(playerVotes).length > 0) return;

      const votes: Record<string, number> = {};
      const names: Record<string, string> = {};

      for (const playerId in data) {
        const p = data[playerId];
        names[playerId] = p.name || 'Unknown';
        votes[playerId] = p.votes || 0;
      }

      setNameMap(names);
      setPlayerVotes(votes);
    });

    return () => unsub();
  }, [roomId, db, playerVotes]);

  useEffect(() => {
    if (!uid || !roomId) return;
    const hostRef = ref(db, `rooms/${roomId}/host`);
    return onValue(hostRef, (snap) => {
      setIsHost(snap.val() === uid);
    });
  }, [uid, roomId, db]);

  const handleRestart = async () => {
    if (!uid || !roomId || !playerName) return;
    setLoading(true);

    try {
      // Just reset room status, keep all players
      await update(ref(db, `rooms/${roomId}`), {
        status: 'lobby',
        timeLeft: 30,
        rounds: 1,
        players: {
          [uid]: { name: playerName, votes: 0 }
        },
        currentRound: {}
      });
      router.push(`/room/${roomId}/lobby`);

    } catch (err) {
      alert(`Failed to restart game: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleTryAgain = async () => {
    if (!uid || !roomId || !playerName) return;

    try {
      const snapshot = await get(ref(db, `rooms/${roomId}`));
      if (!snapshot.exists()) {
        alert('Room not found.');
        return;
      }

      const room = snapshot.val();

      if (room.status !== 'lobby') {
        alert('Room not available.');
        return;
      }

      if ((Object.keys(room.players || {}).length || 0) >= (room.roomSettings?.maxPlayers || 8)) {
        alert('Room is full.');
        return;
      }

      // Add player if not already present
      await update(ref(db, `rooms/${roomId}/players/${uid}`), {
        name: playerName,
        votes: 0
      });
      router.push(`/room/${roomId}/lobby`);

    } catch (err) {
      alert(`Error joining room: ${err}`);
    }
  };

  return (
    <div className="min-h-screen p-6 flex flex-col items-center justify-center gap-6">
      <h1 className="text-4xl font-bold text-center">🏆 Final Results</h1>
      <QuitButton isHost={isHost} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl">
        {Object.entries(playerVotes)
          .sort((a, b) => b[1] - a[1])
          .map(([playerId, votes]) => (
            <div
              key={playerId}
              className="p-6 rounded-xl bg-[#69468d] text-[#f8f6fa] border-[#c8a2c8] border-2 text-center"
            >
              <h2 className="text-2xl font-semibold mb-2 break-all">
                {nameMap[playerId] || 'Unknown'}
              </h2>
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
