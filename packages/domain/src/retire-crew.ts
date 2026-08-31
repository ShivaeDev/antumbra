import { type IntentKind, Kernel } from "@antumbra/kernel";
import { Database } from "@antumbra/persistence";
import { Effect } from "effect";
import type { RetireFields } from "#retire.ts";

export const retirePieceCrew = (retire: IntentKind<RetireFields>, pieceId: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const kernel = yield* Kernel;
		const claims = yield* db.PieceAgent.where({ pieceId }).all();
		yield* Effect.forEach(claims, (claim) => kernel.submit(retire, { agentId: claim.agentId }), { concurrency: 1, discard: true });
	});
