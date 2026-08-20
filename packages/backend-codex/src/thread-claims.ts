// why: one app-server child hosts every session's thread, so the frames of one
// session's delegated work arrive on the same connection as another's. A
// descendant is therefore claimed for the root that owns it — on evidence, and
// only once — so no session can read another's tree as its own, and no caller
// can hand a claimed child to a path that only roots may take.
export interface ThreadClaims {
	readonly claim: (rootThreadId: string, threadId: string) => void;
	readonly isNode: (threadId: string) => boolean;
	readonly ownerOf: (threadId: string) => string | undefined;
	readonly release: (rootThreadId: string) => void;
}

export const openThreadClaims = (): ThreadClaims => {
	const owners = new Map<string, string>();
	return {
		claim: (rootThreadId, threadId) => {
			if (!owners.has(threadId)) {
				owners.set(threadId, rootThreadId);
			}
		},
		isNode: (threadId) => owners.has(threadId),
		ownerOf: (threadId) => owners.get(threadId),
		release: (rootThreadId) => {
			for (const [threadId, owner] of [...owners]) {
				if (owner === rootThreadId) {
					owners.delete(threadId);
				}
			}
		},
	};
};
