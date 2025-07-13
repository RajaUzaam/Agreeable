import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { app } from "@/app/config/firebase";

const auth = getAuth(app);

signInAnonymously(auth)
  .then(() => {
    console.log("Anonymous login success");
  })
  .catch((error) => {
    console.error("Anonymous login error:", error);
  });

onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("Current UID:", user.uid);
    localStorage.setItem("uid", user.uid);
  }
});

export { auth };
