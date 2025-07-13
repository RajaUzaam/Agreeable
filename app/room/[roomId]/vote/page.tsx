'use client';

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  getDatabase,
  ref,
  onValue,
  get,
  set,
  update,
  onDisconnect,
} from "firebase/database";
import { app } from "@/app/config/firebase";
import { auth } from "@/app/config/auth";
import { onAuthStateChanged } from "firebase/auth";
import Image from "next/image";
import { QuitButton } from "@/components/quit";

type MemeSubmission = {
  template?: string;
  templateId?: string;
  boxes?: string[];
  text?: string;
  votes: number;
};

export default function VotePage() {
  const { roomId } = useParams();
  const router = useRouter();
  const db = getDatabase(app);

  const [uid, setUid] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<Record<string, MemeSubmission>>({});
  const [captionedMemes, setCaptionedMemes] = useState<Record<string, string>>({});
  const [hasVoted, setHasVoted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(45);
  const [isHost, setIsHost] = useState(false);

  const [roomSettings, setRoomSettings] = useState({
    gameType: "Quote",
    maxPlayers: 8,
    maxRounds: 2,
    subTime: 30,
    voteTime: 30,
  });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) return router.push("/");
      setUid(user.uid);

      const hostSnap = await get(ref(db, `rooms/${roomId}/host`));
      if (!hostSnap.exists()) return router.push("/");

      setIsHost(hostSnap.val() === user.uid);

      const votedRef = ref(db, `rooms/${roomId}/currentRound/voted/${user.uid}`);
      onValue(votedRef, (snap) => setHasVoted(snap.exists()));

      if (roomId) {
        const playerRef = ref(db, `rooms/${roomId}/players/${user.uid}`);
        onDisconnect(playerRef).remove();
      }
    });

    return () => unsub();
  }, [router, db, roomId]);

  useEffect(() => {
    const settingsRef = ref(db, `rooms/${roomId}/roomSettings`);
    return onValue(settingsRef, (snapshot) => {
      if (snapshot.exists()) setRoomSettings(snapshot.val());
    });
  }, [db, roomId]);

  useEffect(() => {
    const subsRef = ref(db, `rooms/${roomId}/currentRound/submissions`);
    return onValue(subsRef, (snap) => {
      if (snap.exists()) setSubmissions(snap.val());
    });
  }, [roomId, db]);

  useEffect(() => {
    if (roomSettings.gameType !== "Meme") return;

    const generateMemes = async () => {
      const newMemes: Record<string, string> = {};

      for (const [user, submission] of Object.entries(submissions)) {
        if (!submission?.templateId || !submission?.boxes) continue;

        try {
          const res = await fetch("/api/caption", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ template_id: submission.templateId, boxes: submission.boxes }),
          });

          const data = await res.json();
          if (data.success) newMemes[user] = data.data.url;
          else console.error(`Imgflip error for ${user}:`, data.error_message);
        } catch (err) {
          console.error(`Imgflip fetch failed for ${user}:`, err);
        }
      }

      setCaptionedMemes(newMemes);
    };

    generateMemes();
  }, [submissions, roomSettings.gameType]);

  useEffect(() => {
    if (!isHost) return;

    let countdown = roomSettings.voteTime;
    const timeRef = ref(db, `rooms/${roomId}/timeLeft`);

    const advanceRound = async () => {
      const roundSnap = await get(ref(db, `rooms/${roomId}/rounds`));
      const rounds = roundSnap.exists() ? roundSnap.val() : 0;

      if (rounds >= roomSettings.maxRounds) {
        await update(ref(db, `rooms/${roomId}`), {
          status: "results",
          currentRound: {},
        });
      } else {
        await update(ref(db, `rooms/${roomId}`), {
          status: "submission",
          rounds: rounds + 1,
          timeLeft: roomSettings.subTime,
          currentRound: {},
        });
      }
    };

    const interval = setInterval(async () => {
      countdown--;
      await set(timeRef, countdown);
      if (countdown <= 0) {
        clearInterval(interval);
        advanceRound();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isHost, roomId, db, roomSettings]);

  useEffect(() => {
    const timeRef = ref(db, `rooms/${roomId}/timeLeft`);
    return onValue(timeRef, (snap) => {
      const val = snap.val();
      if (typeof val === "number") setTimeLeft(val);
    });
  }, [roomId, db]);

  useEffect(() => {
    const statusRef = ref(db, `rooms/${roomId}/status`);
    return onValue(statusRef, (snap) => {
      const status = snap.val();
      if (status === "results") router.push(`/room/${roomId}/results`);
      else if (status === "submission") router.push(`/room/${roomId}`);
    });
  }, [roomId, db, router]);

  const voteFor = async (target: string) => {
    if (!uid || hasVoted || target === uid) return;

    const votesRef = ref(db, `rooms/${roomId}/currentRound/submissions/${target}/votes`);
    const totalVotesRef = ref(db, `rooms/${roomId}/players/${target}/votes`);
    const votedRef = ref(db, `rooms/${roomId}/currentRound/voted/${uid}`);

    const [votesSnap, totalVotesSnap] = await Promise.all([
      get(votesRef),
      get(totalVotesRef),
    ]);

    await Promise.all([
      set(votesRef, (votesSnap.val() || 0) + 1),
      set(totalVotesRef, (totalVotesSnap.val() || 0) + 1),
      set(votedRef, true),
    ]);

    setHasVoted(true);
  };

  return (
    <div className="min-h-screen p-6 flex flex-col items-center">
      <h1 className="text-3xl font-bold mb-1">Voting Time!</h1>
      <QuitButton isHost={isHost} />
      <p className="text-gray-600 mb-3">You have {timeLeft} seconds to vote.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
        {Object.entries(submissions).map(([uidKey, meme]) => (
          <div key={uidKey} className="p-4 rounded-xl bg-[#69468d] text-[#f8f6fa] border-[#c8a2c8] border-2 text-center">
            <h3 className="font-semibold mb-2">{uidKey === uid ? "You" : "Player"}</h3>
            {roomSettings.gameType === "Meme" ? (
              <div className="relative w-full aspect-square">
                {captionedMemes[uidKey] ? (
                  <Image
                    src={captionedMemes[uidKey]}
                    alt="Meme"
                    width={300}
                    height={300}
                    className="w-full h-full object-cover rounded-lg"
                  />
                ) : (
                  <p className="text-white">Generating meme...</p>
                )}
              </div>
            ) : (
              <div className="p-2 bg-gray-200 rounded-lg text-black">
                <span className="font-black">&quot;</span>{meme.text}<span className="font-black">&quot;</span>
              </div>
            )}
            <h1 className="text-lg mt-2">Votes: {meme.votes || 0}</h1>
            <button
              onClick={() => voteFor(uidKey)}
              disabled={hasVoted || uidKey === uid}
              className={`mt-3 px-4 py-2 rounded ${
                hasVoted || uidKey === uid
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-800 text-white"
              }`}
            >
              {uidKey === uid ? "Your Submission" : "Vote"}
            </button>
          </div>
        ))}
      </div>

      {hasVoted && <p className="text-green-600 mt-4 font-medium">Vote submitted!</p>}
    </div>
  );
}
