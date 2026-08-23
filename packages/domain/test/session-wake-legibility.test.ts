import { SightSource } from "@antumbra/contract";
import { Kernel } from "@antumbra/kernel";
import { Database, Writer } from "@antumbra/persistence";
import { expect, it } from "@effect/vitest";
import { Effect, Ref } from "effect";
import { AgentDomain } from "#domain.ts";
import { acquireTemporaryPersistence } from "#test/harness.ts";
import {
	eventually,
	payload,
	refuseWhile,
	reportsNativeRef,
} from "#test/session-recovery-fixture.ts";
import {
	NATIVE,
	onlyRecovery,
	sessionRow,
	sleepingRoot,
	wakeChips,
	wakeLayer,
} from "#test/session-wake-fixture.ts";

// why: the live report the whole branch answers — the admiral sent to an asleep
// root, the mutation succeeded, and nothing observable happened. The wake that
// could not be taken now says why on its own row and shows up beside the
// Session it was for.
it.live("a wake that cannot be taken parks with its reason on the fleet", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const { recorded, scripted } = yield* sleepingRoot(temporary);
		const denied = yield* Ref.make(true);
		const refusing = refuseWhile(
			reportsNativeRef(scripted.backend, scripted, NATIVE),
			denied,
		);

		yield* Effect.gen(function* () {
			const sight = yield* SightSource;
			yield* sight.send(payload.sessionId, "steer for the reef");
			const parked = yield* eventually(
				Effect.gen(function* () {
					const row = yield* onlyRecovery;
					expect(row.status).toBe("waiting");
					return row;
				}),
			);
			expect(parked.detail).toContain("authentication is required");
			// why: the reason travels with the chip rather than staying on the row.
			// A state with no reason beside it is the generic parked note the
			// admiral could already see, and it sent them to the database to find
			// out what had actually stopped the wake.
			expect(wakeChips(yield* sight.fleet)).toEqual([
				{
					detail: parked.detail,
					id: parked.id,
					kind: "agent/recover",
					state: "waiting",
				},
			]);
			expect((yield* sessionRow).executionStatus).toBe("idle");
		}).pipe(Effect.provide(wakeLayer(temporary, refusing, recorded.runner)));
	}),
);

// why: an Agent with no way back to alive is refused rather than parked, and
// the refusal is the sentence a reader came for rather than a stack trace. The
// other reason a live fleet produces — the pointer aimed somewhere else — no
// longer reaches this shape: an Agent holds one open root at a time, so a
// pointer that has moved means the older root is closed, and a closed root is
// now refused on its own truth. That refusal is rehearsed beside the wake it
// settles, and the pointer's own sentence where the verdict is decided.
it.live("a wake into a retired Agent refuses with the reason it found", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const { recorded, scripted } = yield* sleepingRoot(temporary);
		const backend = reportsNativeRef(scripted.backend, scripted, NATIVE);
		const retire = Effect.gen(function* () {
			const db = yield* Database;
			const writer = yield* Writer;
			yield* writer.write(
				db.Agent.where({ id: payload.agentId }).update({ status: "retired" }),
			);
		});

		yield* Effect.gen(function* () {
			const domain = yield* AgentDomain;
			const kernel = yield* Kernel;
			yield* retire;
			yield* kernel.submit(domain.recover, { sessionId: payload.sessionId });
			const refused = yield* eventually(
				Effect.gen(function* () {
					const row = yield* onlyRecovery;
					expect(row.status).toBe("failed");
					return row;
				}),
			);
			expect(refused.detail).toContain("is retired");
		}).pipe(Effect.provide(wakeLayer(temporary, backend, recorded.runner)));
	}),
);
