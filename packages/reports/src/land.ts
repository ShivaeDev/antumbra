import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database, type PrismaError } from "@antumbra/persistence";
import { type PieceNotFound, verifyPieceExists } from "@antumbra/pieces";
import { type Context, Effect } from "effect";
import type { ReportInput, ReportRow } from "#model.ts";

export const landReport = Effect.fn("reports.landReport")(function* (
	input: ReportInput,
): Effect.fn.Return<
	ReportRow,
	PieceNotFound | PrismaError,
	Context.Service.Identifier<typeof Database> | Context.Service.Identifier<typeof DomainFeeds>
> {
	const db = yield* Database;
	const feeds = yield* DomainFeeds;
	const row: ReportRow = {
		authorAgentId: input.authorAgentId ?? null,
		body: input.body,
		id: crypto.randomUUID(),
		title: input.title,
	};
	yield* verifyPieceExists(input.pieceId);
	yield* db.Report.create({
		...row,
		pieces: (pieces) => pieces.create({ pieceId: input.pieceId }),
	});
	yield* feeds.publishVoyageRefresh();
	return row;
});
