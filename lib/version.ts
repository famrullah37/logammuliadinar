// Versi aplikasi, disematkan saat build (lihat next.config.ts).
export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0";
export const APP_COMMIT = process.env.NEXT_PUBLIC_APP_COMMIT ?? "";
export const versionLabel = () => `v${APP_VERSION}${APP_COMMIT ? ` (${APP_COMMIT})` : ""}`;
