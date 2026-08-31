import type { StoredAgentSession } from "@antumbra/persistence";

export const rootSessions = { parentSessionId: null } as const;

export const rootSessionsOf = (agentId: string) => ({ agentId, parentSessionId: null }) as const;

export const isRootSession = (session: Pick<StoredAgentSession, "parentSessionId">): boolean => session.parentSessionId === null;

export const openSessions = { status: "open" } as const;

export const nodeSessionsOnly = <Expression>(session: { readonly parentSessionId: { readonly isNotNull: () => Expression } }): Expression =>
	session.parentSessionId.isNotNull();
