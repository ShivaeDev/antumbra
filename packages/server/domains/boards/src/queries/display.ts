import { query } from "@antumbra/platform-feature/query.ts";
import { BoardId } from "@antumbra/platform-vocabulary/board-ids.ts";
import { Schema } from "effect";
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
export const display = query("display", {
	input: { board: BoardId },
	output: Schema.Array(node),
	reads: [boardEntry],
	scope: (input) => input.board,
});
