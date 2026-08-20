import type { StoredAgentSession } from "@antumbra/persistence";

// why: a Session is a tree, and only its root is the unit the fleet lists, the
// reconciler owns, recovery resumes, shutdown drains, and retirement stops. A
// subsession is part of its root's record — never separately addressable, and
// never a resume target, because resuming a child would re-enter a conversation
// its parent is still holding. Every whole-table and Agent-scoped reader
// therefore asks for roots, and it asks through here so the rule has one home
// rather than a `parentSessionId` literal repeated at each query.
export const rootSessions = { parentSessionId: null } as const;

export const rootSessionsOf = (agentId: string) =>
	({ agentId, parentSessionId: null }) as const;

export const isRootSession = (
	session: Pick<StoredAgentSession, "parentSessionId">,
): boolean => session.parentSessionId === null;

export const openSessions = { status: "open" } as const;

// why: the one selection that asks for subsessions rather than roots, sanctioned
// for the reconciler that has to find nodes nobody is listening to any more. It
// lives beside the roots rule so both readings of `parentSessionId` are stated
// in one place, and neither is a literal repeated at a query.
export const nodeSessionsOnly = <Expression>(session: {
	readonly parentSessionId: { readonly isNotNull: () => Expression };
}): Expression => session.parentSessionId.isNotNull();
