"use client";

import { useEffect } from "react";

/** Turns on the offline shell. Only on the live site, so it never gets in the way while developing. */
export function RegisterServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Not being able to install the offline shell is never worth interrupting someone for.
    });
  }, []);
  return null;
}
