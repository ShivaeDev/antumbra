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
