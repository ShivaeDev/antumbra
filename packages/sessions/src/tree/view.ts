import { type SessionTree, type SessionTreeNode, subsessionDisplayName } from "@antumbra/contract";
import type { AgentSessionCompleteness, AgentSessionStatus } from "@antumbra/vocabulary/agent-runtime";

export interface SessionTreeRow {
	readonly completeness: AgentSessionCompleteness;
	readonly id: string;
	readonly kind: string | null;
	readonly label: string | null;
	readonly nativeRef: string | null;
	readonly outcome: SessionTreeNode["outcome"];
	readonly parentSessionId: string | null;
	readonly status: AgentSessionStatus;
}

interface Frame {
	readonly depth: number;
	readonly row: SessionTreeRow;
}

const nodeOf = (row: SessionTreeRow, depth: number): SessionTreeNode => ({
	completeness: row.completeness,
	depth,
	displayName: subsessionDisplayName(row),
	id: row.id,
	nativeRef: row.nativeRef,
	outcome: row.outcome,
	status: row.status,
});

const childrenByParent = (rows: ReadonlyArray<SessionTreeRow>): ReadonlyMap<string, ReadonlyArray<SessionTreeRow>> => {
	const byParent = new Map<string, SessionTreeRow[]>();
	for (const row of rows) {
		const parent = row.parentSessionId;
		if (parent === null) {
			continue;
		}
		const siblings = byParent.get(parent);
		if (siblings === undefined) {
			byParent.set(parent, [row]);
		} else {
			siblings.push(row);
		}
	}
	return byParent;
};

const childFrames = (parent: Frame, byParent: ReadonlyMap<string, ReadonlyArray<SessionTreeRow>>): ReadonlyArray<Frame> =>
	[...(byParent.get(parent.row.id) ?? [])].reverse().map((row) => ({ depth: parent.depth + 1, row }));

const walk = (
	root: SessionTreeRow,
	byParent: ReadonlyMap<string, ReadonlyArray<SessionTreeRow>>,
	visited: Set<string>,
): ReadonlyArray<SessionTreeNode> => {
	const nodes: SessionTreeNode[] = [];
	const pending: Frame[] = [{ depth: 0, row: root }];
	while (pending.length > 0) {
		const next = pending.pop();
		if (next === undefined || visited.has(next.row.id)) {
			continue;
		}
		visited.add(next.row.id);
		nodes.push(nodeOf(next.row, next.depth));
		pending.push(...childFrames(next, byParent));
	}
	return nodes;
};

export const assembleSessionTree = (rootSessionId: string, rows: ReadonlyArray<SessionTreeRow>): SessionTree => {
	const root = rows.find((row) => row.id === rootSessionId);
	const visited = new Set<string>();
	const walked = root === undefined ? [] : walk(root, childrenByParent(rows), visited);
	const stranded = rows.filter((row) => !visited.has(row.id)).map((row) => nodeOf(row, 1));
	return {
		alive: rows.filter((row) => row.status === "open").length,
		nodes: [...walked, ...stranded],
		rootSessionId,
		total: rows.length,
	};
};
