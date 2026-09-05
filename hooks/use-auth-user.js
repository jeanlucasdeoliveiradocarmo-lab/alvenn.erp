"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";

export function useAuthUser() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, (authenticatedUser) => {
      if (!authenticatedUser) {
        setUser(null);
        setAuthLoading(false);
        router.replace("/login");
        return;
      }

      setUser(authenticatedUser);
      setAuthLoading(false);
    });
  }, [router]);

  return { user, authLoading };
}
