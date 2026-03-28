"use client";

import { Toaster } from "react-hot-toast";

export default function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 3000,
        style: {
          border: "1px solid #908974",
          color: "#1c424f",
          background: "#ffffff",
        },
        success: {
          iconTheme: {
            primary: "#1c424f",
            secondary: "#ffffff",
          },
        },
        error: {
          iconTheme: {
            primary: "#ce9233",
            secondary: "#ffffff",
          },
        },
      }}
    />
  );
}
