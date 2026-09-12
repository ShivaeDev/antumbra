import { query } from "@antumbra/platform-feature/query.ts";
import { Effect, Schema } from "effect";
import { BoardId } from "#ids.ts";
import { boardEntry } from "#rows/board-entry.ts";

type Entry = typeof boardEntry.Row.Type;
interface EncodedNode {
	readonly children: readonly EncodedNode[];
	readonly entry: typeof boardEntry.Row.Encoded;
}
export interface BoardNode {
	readonly children: readonly BoardNode[];
	readonly entry: Entry;
}
const node: Schema.Codec<BoardNode, EncodedNode> = Schema.Struct({
	entry: boardEntry.Row,
	children: Schema.Array(Schema.suspend(() => node)),
});
type Summary = Entry & { readonly coversFrom: number; readonly coversTo: number };
const isSummary = (entry: Entry): entry is Summary => entry.kind === "summary" && entry.coversFrom !== null && entry.coversTo !== null;
const coveringSummary = (summaries: readonly Summary[], entry: Entry): Summary | undefined => {
	if (entry.register !== "rough" && entry.kind !== "summary") return undefined;
	return summaries
		.filter((summary) => entry.id !== summary.id && entry.seq >= summary.coversFrom && entry.seq <= summary.coversTo)
		.toSorted((left, right) => left.coversTo - left.coversFrom - (right.coversTo - right.coversFrom))[0];
};
const standsAt = (entry: Entry): number => (isSummary(entry) ? entry.coversTo : entry.seq);
const tree = (entries: readonly Entry[]): readonly BoardNode[] => {
	const summaries = entries.filter(isSummary);
	const covered = new Map<string, readonly Entry[]>();
	const loose: Entry[] = [];
	for (const entry of entries) {
		const summary = coveringSummary(summaries, entry);
		if (summary === undefined) loose.push(entry);
		else covered.set(summary.id, [...(covered.get(summary.id) ?? []), entry]);
	}
	const nodesOf = (members: readonly Entry[]): readonly BoardNode[] =>
		members
			.map((entry) => ({ children: nodesOf(covered.get(entry.id) ?? []), entry }))
			.toSorted((left, right) => standsAt(right.entry) - standsAt(left.entry));
	return nodesOf(loose);
};
export const display = query("display", {
	input: { board: BoardId },
	output: Schema.Array(node),
	reads: [boardEntry],
	scope: (input) => input.board,
	run: Effect.fn("boards.display")(function* (input, rows) {
		return tree(yield* rows.boardEntry.where({ board: input.board }));
	}),
});
