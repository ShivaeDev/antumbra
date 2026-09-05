import { Effect } from "effect";
import { SessionTreeLedger } from "#tree/ledger/service.ts";

export const project = Effect.fn("SessionTreeAudits.project")(function* (sessionId: string) {
	const ledger = yield* SessionTreeLedger;
	const gaps = yield* ledger.gapKinds(sessionId);
	yield* ledger.settle(sessionId, gaps.length === 0 ? "complete" : "incomplete");
});
