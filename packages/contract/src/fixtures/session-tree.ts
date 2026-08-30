import type { SessionTree } from "#session-tree.ts";

export const sessionTree: SessionTree = {
	alive: 2,
	nodes: [
		{
			completeness: "recording",
			depth: 0,
			displayName: "navigator",
			id: "session-1",
			nativeRef: "thread-9f2c",
			outcome: null,
			status: "open",
		},
		{
			completeness: "complete",
			depth: 1,
			displayName: "Map the quay grouping",
			id: "session-1-node-1",
			nativeRef: "task-4a1b",
			outcome: "completed",
			status: "closed",
		},
		{
			completeness: "incomplete",
			depth: 2,
			displayName: "reef-surveyor",
			id: "session-1-node-2",
			nativeRef: "task-77c0",
			outcome: null,
			status: "open",
		},
		{
			completeness: "unaudited",
			depth: 1,
			displayName: "Unnamed subsession",
			id: "session-1-node-3",
			nativeRef: "task-0e93",
			outcome: "unknown",
			status: "closed",
		},
	],
	rootSessionId: "session-1",
	total: 4,
};
