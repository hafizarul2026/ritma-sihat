"use client";

import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCsH6_VNnLCzbaWmN_ad1dGeRWfsFpZ1NQ",
  authDomain: "ritma-93283.firebaseapp.com",
  projectId: "ritma-93283",
  storageBucket: "ritma-93283.firebasestorage.app",
  messagingSenderId: "909402332617",
  appId: "1:909402332617:web:2d6b04d7ce43274dd55c18",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const firebaseAuth = getAuth(app);
export const firebaseDb = getFirestore(app);
