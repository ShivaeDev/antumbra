import { SessionShutdown } from "#shutdown/service.ts";

export const drainActiveSessions = SessionShutdown.use((shutdown) => shutdown.drain());
