'use client';

import { useRouter, useParams } from 'next/navigation';
import { ref, getDatabase, set, onValue, update, get } from 'firebase/database';
import { useEffect, useState } from 'react';
import { app } from '@/app/config/firebase';
import { auth } from '@/app/config/auth';
import { onAuthStateChanged } from 'firebase/auth';
import Image from 'next/image';
import { QuitButton } from '@/components/quit';

export default function GameRoom() {
  const db = getDatabase(app);
  const router = useRouter();
  const { roomId } = useParams();

  const [uid, setUid] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState('');
  const [memeTemplate, setMemeTemplate] = useState('https://i.imgflip.com/30b1gx.jpg');
  const [templateId, setTemplateId] = useState('');
  const [boxes, setBoxes] = useState<string[]>([]);
  const [nonMemeText, setNonMemeText] = useState('');
  const [timeLeft, setTimeLeft] = useState(30);
  const [isSubmittied, setIsSubmitted] = useState(false);
  const [roomSettings, setRoomSettings] = useState({
    gameType: 'Quote',
    maxPlayers: 8,
    maxRounds: 2,
    subTime: 30,
    voteTime: 30,
  });

  const [isHost, setIsHost] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push('/');
      } else {
        setUid(user.uid);

        const nameSnap = await get(ref(db, `rooms/${roomId}/players/${user.uid}/name`));
        if (nameSnap.exists()) {
          setPlayerName(nameSnap.val());
        }
      }
    });

    return () => unsub();
  }, [router, db, roomId]);

  useEffect(() => {
    const settingsRef = ref(db, `rooms/${roomId}/roomSettings`);
    return onValue(settingsRef, (snapshot) => {
      if (snapshot.exists()) {
        setRoomSettings(snapshot.val());
      }
    });
  }, [db, roomId]);

  useEffect(() => {
    if (!uid) return;
    const roomRef = ref(db, `rooms/${roomId}/host`);
    return onValue(roomRef, (snap) => {
      setIsHost(snap.val() === uid);
    });
  }, [uid, roomId, db]);

  useEffect(() => {
    if (!roomId || roomSettings.gameType !== 'Meme') return;
    const templateRef = ref(db, `rooms/${roomId}/currentRound/template`);

    const initTemplate = async () => {
      try {
        const snap = await get(templateRef);
        if (!snap.exists() && isHost) {
          const res = await fetch('https://api.imgflip.com/get_memes');
          const data = await res.json();
          if (!data.success || !data.data?.memes?.length) return;

          const random = data.data.memes[Math.floor(Math.random() * data.data.memes.length)];
          await set(templateRef, {
            url: random.url,
            id: random.id,
            boxCount: random.box_count,
          });

          setMemeTemplate(random.url);
          setTemplateId(random.id);
          setBoxes(Array(random.box_count).fill(''));
        } else if (snap.exists()) {
          const val = snap.val();
          setMemeTemplate(val.url);
          setTemplateId(val.id);
          setBoxes(Array(val.boxCount).fill(''));
        }
      } catch (err) {
        console.error('Template fetch error:', err);
      }
    };

    if (isHost) {
      initTemplate();
    } else {
      return onValue(templateRef, (snap) => {
        const val = snap.val();
        if (val) {
          setMemeTemplate(val.url);
          setTemplateId(val.id);
          setBoxes(Array(val.boxCount).fill(''));
        }
      });
    }
  }, [isHost, roomId, db, roomSettings.gameType]);

  useEffect(() => {
    if (!isHost || !roomId) return;
    const timeRef = ref(db, `rooms/${roomId}/timeLeft`);
    let countdown = roomSettings.subTime;

    const interval = setInterval(async () => {
      countdown--;
      try {
        await set(timeRef, countdown);
        if (countdown <= 0) {
          clearInterval(interval);
          await update(ref(db, `rooms/${roomId}`), {
            status: 'voting',
            timeLeft: roomSettings.voteTime,
            'currentRound/voted': {},
          });
        }
      } catch (err) {
        console.error('Countdown update failed:', err);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isHost, roomId, db, roomSettings.subTime, roomSettings.voteTime]);

  useEffect(() => {
    const timeRef = ref(db, `rooms/${roomId}/timeLeft`);
    return onValue(timeRef, (snap) => {
      const val = snap.val();
      if (typeof val === 'number') setTimeLeft(val);
    });
  }, [roomId, db]);

  useEffect(() => {
    const statusRef = ref(db, `rooms/${roomId}/status`);
    return onValue(statusRef, (snap) => {
      if (snap.val() === 'voting') {
        router.push(`/room/${roomId}/vote`);
      }
    });
  }, [roomId, router, db]);

  const handleSubmit = async () => {
    if (!uid) return alert('Not logged in.');

    try {
      const subRef = ref(db, `rooms/${roomId}/currentRound/submissions/${uid}`);
      const payload =
        roomSettings.gameType === 'Meme'
          ? {
              template: memeTemplate,
              templateId,
              boxes,
              votes: 0,
              timestamp: Date.now(),
            }
          : {
              text: nonMemeText,
              votes: 0,
              timestamp: Date.now(),
            };

      await set(subRef, payload);
      setIsSubmitted(true);
    } catch (err) {
      console.error('Submission failed:', err);
      alert('Submission error. Try again.');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 p-4">
      <h1 className="text-3xl font-bold">Room: {roomId}</h1>
      <QuitButton isHost={isHost} />
      <p className="text-xl text-gray-600">Player: {playerName || 'Unknown'}</p>

      {roomSettings.gameType === 'Meme' ? (
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-[300px]">
            <Image src={memeTemplate} alt="Meme Template" width={200} height={200} className="w-full h-full object-cover rounded-lg" />
          </div>
          {boxes.map((text, index) => (
            <input
              key={index}
              type="text"
              value={text}
              placeholder={`Text #${index + 1}`}
              onChange={(e) => {
                const copy = [...boxes];
                copy[index] = e.target.value;
                setBoxes(copy);
              }}
              className="border px-4 py-2 rounded-lg w-full max-w-sm"
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <h1 className="text-white text-2xl text-center p-4 border-white rounded-md border-2">
            <span className="font-black">&quot;</span>{nonMemeText}<span className="font-black">&quot;</span>
          </h1>
          <input
            type="text"
            placeholder={roomSettings.gameType}
            value={nonMemeText}
            onChange={(e) => setNonMemeText(e.target.value)}
            className="border px-4 py-2 rounded-lg w-full max-w-sm"
          />
        </div>
      )}

      <h1 className="text-white text-xl">Time left: {timeLeft} seconds</h1>

      <button
        onClick={handleSubmit}
        className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-800"
      >
        Submit
      </button>
      {isSubmittied && <p className="text-green-500">Submission successful!</p>}
    </div>
  );
}
