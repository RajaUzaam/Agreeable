import { useRouter, useParams } from "next/navigation";
import { getDatabase, ref, remove } from "firebase/database";
import { app } from "@/app/config/firebase";

export const QuitButton = ({ isHost }: {isHost: boolean}) => {
  const router = useRouter();
  const db = getDatabase(app);
  const roomId = useParams().roomId as string;

  const handleQuit = async () => {
    if (isHost) {
        await remove(ref(db, `rooms/${roomId}`));
        router.push("/");
        return;
    } else {
    if (!roomId) return;
    const playerName = localStorage.getItem("playerName");
    if (playerName) {
      await remove(ref(db, `rooms/${roomId}/players/${playerName}`));
      await remove(ref(db, `rooms/${roomId}/currentRound/submissions/${playerName}`));
    }
    router.push("/");
}
  };

  return (
    <button onClick={handleQuit} className="bg-red-500 text-white px-4 py-2 rounded">
      Quit Game
    </button>
  );
}