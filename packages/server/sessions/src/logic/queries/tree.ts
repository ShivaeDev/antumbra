import type * as Source from "@antumbra/domain-sessions/queries/tree.ts";
import { session } from "@antumbra/domain-sessions/rows/session.ts";
import { selection as sessionSelection } from "@antumbra/server-storage/records/session.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, Schema } from "effect";

const Node = Schema.Struct({ ...session.fields, depth: Schema.Number, displayName: Schema.String });
const displayName = (stored: typeof session.Row.Type): string => {
	if (stored.label !== null && stored.label !== "") return stored.label;
	if (stored.kind === null || stored.kind === "") return "Unnamed subsession";
	if (!stored.kind.includes("/")) return stored.kind;
	const leaf = stored.kind.slice(stored.kind.lastIndexOf("/") + 1);
	const stem = leaf.includes(".") ? leaf.slice(0, leaf.lastIndexOf(".")) : leaf;
	return stem || stored.kind;
};
export const tree = Effect.fn("Sessions.tree")(function* (
	input: Schema.Struct.Type<typeof Source.tree.input>,
): Effect.fn.Return<typeof Source.tree.output.Type, never, Records> {
	const rows = yield* Records;

	const stored = (yield* rows.session
		.findMany({ where: { rootSessionId: input.rootSessionId }, orderBy: { field: "storage_order", direction: "asc" }, select: sessionSelection })
		.pipe(Effect.orDie)).toSorted((left, right) => left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id));
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
});
