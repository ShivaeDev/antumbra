import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database, type PrismaError, Writer } from "@antumbra/persistence";
import { type PieceNotFound, verifyPieceExists } from "@antumbra/pieces";
import { Effect, PubSub } from "effect";
import type { ReportInput, ReportRow } from "#model.ts";
import type { ReportsReturn } from "#requirements.ts";

const writeReport = (row: ReportRow, pieceId: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		// why: an outcome and its piece link are one transaction, with existence
		// checked inside that transaction, so neither an orphan nor false done state
		// can become durable.
		yield* verifyPieceExists(pieceId);
		yield* db.Report.create({
			...row,
			pieces: (pieces) => pieces.create({ pieceId }),
		});
	});

export const landReport = Effect.fn("reports.landReport")(function* (
	input: ReportInput,
): ReportsReturn<ReportRow, PieceNotFound | PrismaError> {
	const feeds = yield* DomainFeeds;
	const writer = yield* Writer;
	const row: ReportRow = {
		authorAgentId: input.authorAgentId ?? null,
		body: input.body,
		id: crypto.randomUUID(),
		title: input.title,
	};
	yield* writer.write(writeReport(row, input.pieceId));
	yield* PubSub.publish(feeds.voyages, undefined);
	return row;
});
