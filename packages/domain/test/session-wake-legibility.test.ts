import { SightSource } from "@antumbra/contract";
import { Kernel } from "@antumbra/kernel";
import { Database, type NewAgentSession, Writer } from "@antumbra/persistence";
import { expect, it } from "@effect/vitest";
import { Effect, Option, Ref } from "effect";
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

// why: the two halves of the ruling, on the two reasons a live fleet actually
// produces. A pointer that moved can move back while both Sessions are open, so
// the Intent waits with the sentence on it; an Agent with no way back to alive
// is refused, and the refusal is the sentence rather than a stack trace.
it.live("a wake with nothing to resume waits or refuses by what it found", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const { recorded, scripted } = yield* sleepingRoot(temporary);
		const backend = reportsNativeRef(scripted.backend, scripted, NATIVE);
		// why: the pointer moves when a newer Session takes over, and for the
		// moment before reconciliation catches up both are open. That moment is
		// the only one "not-current" can honestly be reached from — once the older
		// row is closed the wake is refused on that instead, because a closed
		// Session is not a pointer that can come back.
		const succeeded = Effect.gen(function* () {
			const db = yield* Database;
			const writer = yield* Writer;
			yield* writer.write(
				Effect.gen(function* () {
					yield* db.AgentSession.create({
						agentId: payload.agentId,
						backend: "scripted",
						charterDeliveredAt: new Date(1),
						createdAt: new Date(2),
						cwd: "/somewhere/session-resume",
						executionStatus: "idle",
						id: "session-elsewhere",
						nativeRef: "native-elsewhere",
						parentSessionId: null,
						rootSessionId: "session-elsewhere",
						status: "open",
					} satisfies NewAgentSession);
				}),
			);
		});
		const point = (currentSessionId: string | null) =>
			Effect.gen(function* () {
				const db = yield* Database;
				const writer = yield* Writer;
				yield* writer.write(
					db.Agent.where({ id: payload.agentId }).update({ currentSessionId }),
				);
			});
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
			yield* succeeded;
			yield* point("session-elsewhere");
			const moved = yield* kernel.submit(domain.recover, {
				sessionId: payload.sessionId,
			});
			const waited = yield* eventually(
				Effect.gen(function* () {
					const row = Option.getOrThrow(
						yield* Database.use((db) =>
							db.Intent.where({ id: moved.id }).first(),
						),
					);
					expect(row.status).toBe("waiting");
					return row;
				}),
			);
			expect(waited.detail).toContain("the Agent is on session-elsewhere");

			yield* retire;
			const gone = yield* kernel.submit(domain.recover, {
				sessionId: "session-elsewhere",
			});
			const refused = yield* eventually(
				Effect.gen(function* () {
					const row = Option.getOrThrow(
						yield* Database.use((db) =>
							db.Intent.where({ id: gone.id }).first(),
						),
					);
					expect(row.status).toBe("failed");
					return row;
				}),
			);
			expect(refused.detail).toContain("is retired");
		}).pipe(Effect.provide(wakeLayer(temporary, backend, recorded.runner)));
	}),
);
