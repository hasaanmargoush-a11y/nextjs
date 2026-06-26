"use client";

import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      position="top-center"
      toastOptions={{
        style: {
          fontFamily: "Tajawal, sans-serif",
          direction: "rtl",
        },
      }}
    />
  );
}
