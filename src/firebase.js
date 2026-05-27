import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth, signInAnonymously } from 'firebase/auth'

const firebaseConfig = {
  apiKey: "AIzaSyBTlv_AMqJ4x20gdE3Xa1CAWqXhfU1ARDM",
  authDomain: "quiz-lendas.firebaseapp.com",
  projectId: "quiz-lendas",
  storageBucket: "quiz-lendas.firebasestorage.app",
  messagingSenderId: "745902094414",
  appId: "1:745902094414:web:a8b758829b7b7b8c17ab1f",
  measurementId: "G-CXL8L89X3F"
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
export const auth = getAuth(app)

export async function loginAnonymously() {
  const result = await signInAnonymously(auth)
  return result.user.uid
}
