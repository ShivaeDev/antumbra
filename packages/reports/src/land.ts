import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database, type PrismaError } from "@antumbra/persistence";
import { type PieceNotFound, verifyPieceExists } from "@antumbra/pieces";
import { type Context, Effect } from "effect";
import type { ReportInput, ReportRow } from "#model.ts";

const writeReport = (row: ReportRow, pieceId: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		// why: the precheck names a missing Piece, while the FK-backed nested create
		// commits the outcome and its Piece link together so neither an orphan nor
		// false done state can become durable.
		yield* verifyPieceExists(pieceId);
		yield* db.Report.create({
			...row,
			pieces: (pieces) => pieces.create({ pieceId }),
		});
	});

export const landReport = Effect.fn("reports.landReport")(function* (
	input: ReportInput,
): Effect.fn.Return<
	ReportRow,
	PieceNotFound | PrismaError,
	| Context.Service.Identifier<typeof Database>
	| Context.Service.Identifier<typeof DomainFeeds>
> {
	const feeds = yield* DomainFeeds;
	const row: ReportRow = {
		authorAgentId: input.authorAgentId ?? null,
		body: input.body,
		id: crypto.randomUUID(),
		title: input.title,
	};
	yield* writeReport(row, input.pieceId);
	yield* feeds.publishVoyageRefresh();
	return row;
});
