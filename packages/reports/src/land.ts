import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import { verifyPieceExists } from "@antumbra/pieces";
import { Effect } from "effect";
import type { ReportInput } from "#model.ts";

export const landReport = Effect.fn("Reports.land")(function* (input: ReportInput) {
	const db = yield* Database;
	const feeds = yield* DomainFeeds;
	const row = {
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
