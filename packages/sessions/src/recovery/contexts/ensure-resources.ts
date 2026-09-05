import { Database } from "@antumbra/persistence";
import { decodeStoredBerthStatus, decodeStoredMoorageStatus } from "@antumbra/vocabulary/agent-runtime";
import { Effect, Option } from "effect";
import { recoveryHeld } from "#recovery/error.ts";

const heldInvalid = (failure: { readonly message: string }) => recoveryHeld(failure.message);

const ensureMoorage = Effect.fn("SessionRecoveryContexts.ensureMoorage")(function* (agentId: string, cwd: string, sessionId: string) {
	const db = yield* Database;
	const moorage = yield* db.Moorage.where({ agentId }).first();
	if (Option.isNone(moorage)) {
		return yield* recoveryHeld(`${sessionId} is waiting for its ready Moorage`);
	}
	const status = yield* Effect.fromResult(decodeStoredMoorageStatus(moorage.value.agentId, moorage.value.status)).pipe(Effect.mapError(heldInvalid));
	if (status !== "ready" || moorage.value.root !== cwd) {
		return yield* recoveryHeld(`${sessionId} is waiting for its ready Moorage`);
	}
});
const ensureBerths = Effect.fn("SessionRecoveryContexts.ensureBerths")(function* (agentId: string, sessionId: string) {
	const db = yield* Database;
	const berths = yield* db.Berth.where({ agentId }).all();
	const statuses = yield* Effect.forEach(berths, (berth) =>
		Effect.fromResult(decodeStoredBerthStatus(berth.id, berth.status)).pipe(Effect.mapError(heldInvalid)),
	);
	const notReady = statuses.some((status) => status !== "ready");
	if (notReady) {
		return yield* recoveryHeld(`${sessionId} is waiting for its ready Berths`);
	}
});

export const ensureResources = Effect.fn("SessionRecoveryContexts.ensureResources")(function* (agentId: string, cwd: string, sessionId: string) {
	yield* ensureMoorage(agentId, cwd, sessionId);
	yield* ensureBerths(agentId, sessionId);
});
