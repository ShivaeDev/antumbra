import { query } from "@antumbra/platform-feature/query.ts";
import { Effect, Schema } from "effect";
import { SessionId } from "#ids.ts";
import { session } from "#rows/session.ts";

const Node = Schema.Struct({ ...session.fields, depth: Schema.Number, displayName: Schema.String });
const displayName = (stored: typeof session.Row.Type): string => {
	if (stored.label !== null && stored.label !== "") return stored.label;
	if (stored.kind === null || stored.kind === "") return "Unnamed subsession";
	if (!stored.kind.includes("/")) return stored.kind;
	const leaf = stored.kind.slice(stored.kind.lastIndexOf("/") + 1);
	const stem = leaf.includes(".") ? leaf.slice(0, leaf.lastIndexOf(".")) : leaf;
	return stem || stored.kind;
};
export const tree = query("tree", {
	input: { rootSessionId: SessionId },
	output: Schema.Array(Node),
	reads: [session],
	run: Effect.fn("Sessions.tree")(function* (input, rows) {
		const stored = (yield* rows.session.where({ rootSessionId: input.rootSessionId })).toSorted(
			(left, right) => left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id),
		);
		const root = stored.find((node) => node.id === input.rootSessionId);
		if (root === undefined) return [];
		const nodes: (typeof Node.Type)[] = [];
		const pending = [{ row: root, depth: 0 }];
		while (pending.length > 0) {
			const frame = pending.pop();
			if (frame === undefined) break;
			nodes.push({ ...frame.row, depth: frame.depth, displayName: displayName(frame.row) });
			for (const child of stored.filter((node) => node.parentSessionId === frame.row.id).reverse())
				pending.push({ row: child, depth: frame.depth + 1 });
		}
		return nodes;
	}),
});
