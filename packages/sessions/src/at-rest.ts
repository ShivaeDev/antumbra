import type { SessionPresence } from "@antumbra/vocabulary/agent-runtime";

// Live delegation comes from the acquisition; durable child rows may remain open indefinitely.
export const sessionAtRest = (input: { readonly delegating: boolean; readonly presence: SessionPresence }): boolean =>
	input.presence === "idle" && !input.delegating;

// Retirement remains available for stuck delegated trees, but never during active work.
export const sessionRetirable = (presence: SessionPresence): boolean => presence !== "working";
