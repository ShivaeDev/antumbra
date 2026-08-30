import { type SessionTree, type SessionTreeNode, subsessionDisplayName } from "@antumbra/contract";
import type { AgentSessionCompleteness, AgentSessionStatus } from "@antumbra/vocabulary/agent-runtime";

// why: the reader's half of the roots discipline. Roots say which Sessions the
// fleet may name; this says how the rest of a tree is read back — one home, so
// the walk, the counts and the display rule cannot disagree across callers.
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

// why: the walk is iterative and carries its own visited set, so a parent edge
// that points back at an ancestor — or at a row outside this tree — costs the
// reader nothing. Recursive SQL or recursive TypeScript would hang or blow the
// stack on the same malformed edge, and a reader would see a spinner instead
// of a record.
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

// why: alive and total are read off the rows the one scan already returned —
// the [rootSessionId, status] index answers that scan, and both counts fall
// out of it rather than out of a count query per status per tree.
export const assembleSessionTree = (rootSessionId: string, rows: ReadonlyArray<SessionTreeRow>): SessionTree => {
	const root = rows.find((row) => row.id === rootSessionId);
	const visited = new Set<string>();
	const walked = root === undefined ? [] : walk(root, childrenByParent(rows), visited);
	// why: a row the walk never reached belongs to this tree all the same — its
	// edge is broken, not its membership. Listing it directly under the root
	// keeps the record whole; dropping it would hide work the Session did.
	const stranded = rows.filter((row) => !visited.has(row.id)).map((row) => nodeOf(row, 1));
	return {
		alive: rows.filter((row) => row.status === "open").length,
		nodes: [...walked, ...stranded],
		rootSessionId,
		total: rows.length,
	};
};
