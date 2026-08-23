import { type IntentKind, Kernel } from "@antumbra/kernel";
import { Database } from "@antumbra/persistence";
import { Effect } from "effect";
import type { RetireFields } from "#retire.ts";

// why: the act acknowledges what the projection already said and declares
// nothing — the piece was done before the button existed, and pressing it only
// releases the hands that finished it. Nothing is checked here: a capability
// read off the last snapshot speaks for a moment that has passed, and the
// Intent is where the question is asked of the present, exactly as the
// admiral's own retire asks it.
//
// why: the claims are what is retired, one Intent each. A captain holds no
// claim on a piece, so it is never among them — the immunity is the shape of
// the table rather than a name this code has to know.
export const retirePieceCrew = (
	retire: IntentKind<RetireFields>,
	pieceId: string,
) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const kernel = yield* Kernel;
		const claims = yield* db.PieceAgent.where({ pieceId }).all();
		yield* Effect.forEach(
			claims,
			(claim) => kernel.submit(retire, { agentId: claim.agentId }),
			{ concurrency: 1, discard: true },
		);
	});
