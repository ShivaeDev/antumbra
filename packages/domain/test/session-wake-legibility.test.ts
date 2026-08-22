import { type Fleet, SightSource } from "@antumbra/contract";
import { Kernel } from "@antumbra/kernel";
import { Database, type NewAgentSession, Writer } from "@antumbra/persistence";
import type { TemporaryPersistence } from "@antumbra/persistence/testing";
import type { AgentBackend, Runner } from "@antumbra/plugin-api";
import { SessionFabric, SessionFabricLive } from "@antumbra/session-fabric";
import { expect, it } from "@effect/vitest";
import { Effect, Fiber, Layer, Option, Ref, Stream } from "effect";
import { AgentDomain } from "#domain.ts";
import { SessionWakePatience } from "#session-wake-patience.ts";
import { SightSourceLive } from "#sight.ts";
import {
	acquireTemporaryPersistence,
	domainKernelLayer,
	makeScriptedBackend,
	makeScriptedRunner,
	type ScriptedBackend,
} from "#test/harness.ts";
import {
	eventually,
	payload,
	refuseWhile,
	reportsNativeRef,
	seedResumableAgent,
} from "#test/session-recovery-fixture.ts";

const NATIVE = "native-durable";

// why: the reconnect census is the one thing a resume does that a scripted
// backend cannot stand in for, and it only ever announces itself through the
// opening frame. Withholding that frame on demand is how a rehearsal reaches
// the shape production hit: a provider that answered the open and then went
// quiet about who it was.
const confirmsWhen = (
	backend: AgentBackend,
	scripted: ScriptedBackend,
	allowed: Ref.Ref<boolean>,
): AgentBackend => ({
	...backend,
	openSession: (options) =>
		Ref.get(allowed).pipe(
			Effect.flatMap((isAllowed) =>
				isAllowed
					? reportsNativeRef(backend, scripted, NATIVE).openSession(options)
					: backend.openSession(options),
			),
		),
});

const wakeLayer = (
	temporary: TemporaryPersistence,
	backend: AgentBackend,
	runner: Runner,
	patienceMillis?: number,
) => {
	const base = SightSourceLive.pipe(
		Layer.provideMerge(SessionFabricLive),
		Layer.provideMerge(domainKernelLayer(temporary, backend, {}, runner)),
	);
	return patienceMillis === undefined
		? base
		: base.pipe(
				Layer.provide(Layer.succeed(SessionWakePatience)(patienceMillis)),
			);
};

const sessionRow = Effect.gen(function* () {
	const db = yield* Database;
	return Option.getOrThrow(
		yield* db.AgentSession.where({ id: payload.sessionId }).first(),
	);
});

const recoveries = Effect.gen(function* () {
	const db = yield* Database;
	return yield* db.Intent.where({ tag: "agent/recover" }).all();
});

const onlyRecovery = Effect.gen(function* () {
	const rows = yield* recoveries;
	expect(rows).toHaveLength(1);
	return Option.getOrThrow(Option.fromUndefinedOr(rows[0]));
});

const wakeChips = (fleet: Fleet) =>
	fleet.agents
		.flatMap((agent) => agent.sessions)
		.filter((session) => session.id === payload.sessionId)
		.flatMap((session) => session.diag.intents)
		.filter((intent) => intent.kind === "agent/recover");

// why: boot recovery resumes a Session the rows still call active, which is a
// different act from the admiral speaking to one that went to sleep while the
// application watched. Putting the row to idle first is how the rehearsal gets
// the second: an asleep root nothing is already reaching for.
const asleep = Effect.gen(function* () {
	const db = yield* Database;
	const writer = yield* Writer;
	yield* writer.write(
		db.AgentSession.where({ id: payload.sessionId }).update({
			executionStatus: "idle",
		}),
	);
});

const sleepingRoot = (temporary: TemporaryPersistence) =>
	Effect.gen(function* () {
		const scripted = yield* makeScriptedBackend;
		const recorded = yield* makeScriptedRunner;
		yield* seedResumableAgent(
			temporary,
			scripted.backend,
			recorded.runner,
			scripted,
		);
		yield* asleep.pipe(Effect.provide(temporary.layer));
		return { recorded, scripted };
	});

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
			expect(wakeChips(yield* sight.fleet)).toEqual([
				{ id: parked.id, kind: "agent/recover", state: "waiting" },
			]);
			expect((yield* sessionRow).executionStatus).toBe("idle");
		}).pipe(Effect.provide(wakeLayer(temporary, refusing, recorded.runner)));
	}),
);

// why: a second send to a Session whose wake is already parked has one honest
// meaning — push the wake that is there. Submitting another would leave two
// durable demands for one act, and the admiral would be told a fresh attempt
// was under way while the parked one still owned the words.
it.live("a later send pushes the parked wake instead of opening a second", () =>
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
					expect((yield* onlyRecovery).status).toBe("waiting");
					return yield* onlyRecovery;
				}),
			);

			yield* Ref.set(denied, false);
			yield* sight.send(payload.sessionId, "and mind the shallows");
			const settled = yield* eventually(
				Effect.gen(function* () {
					const row = yield* onlyRecovery;
					expect(row.status).toBe("succeeded");
					return row;
				}),
			);
			expect(settled.id).toBe(parked.id);
			expect((yield* sessionRow).executionStatus).toBe("active");
			const resumed = yield* scripted.session(payload.sessionId);
			// why: the push carries the parked Intent's own words, because that is
			// what a retry is. Queueing the newer message behind an undeliverable
			// one is a different capability and this branch does not have it, so
			// nothing here may read as though it does.
			expect(resumed === undefined ? [] : yield* resumed.sent).toEqual([
				"steer for the reef",
			]);
		}).pipe(Effect.provide(wakeLayer(temporary, refusing, recorded.runner)));
	}),
);

// why: the two halves of the ruling, on the two reasons a live fleet actually
// produces. A pointer that moved can move back, so the Intent waits with the
// sentence on it; an Agent with no way back to alive is refused, and the
// refusal is the sentence rather than a stack trace.
it.live("a wake with nothing to resume waits or refuses by what it found", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const { recorded, scripted } = yield* sleepingRoot(temporary);
		const backend = reportsNativeRef(scripted.backend, scripted, NATIVE);
		// why: an Agent holds one open Session at a time, so the pointer only ever
		// moves by the old one closing and a new one taking its place. That is the
		// state a stale send meets, and the only one "not-current" can be reached
		// from — a pointer aimed at nothing is a different fault with its own
		// repair, and the rehearsal would be watching that instead.
		const succeeded = Effect.gen(function* () {
			const db = yield* Database;
			const writer = yield* Writer;
			yield* writer.write(
				Effect.gen(function* () {
					yield* db.AgentSession.where({ id: payload.sessionId }).update({
						status: "closed",
					});
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
				sessionId: payload.sessionId,
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

// why: a drain the previous process never finished leaves a row saying the
// Session is mid-siesta with nothing draining it, and every later wake reads
// that as a reason to wait. Boot settles it, and the proof it settled truthfully
// is that speaking to the Session then works end to end.
it.live("boot settles a drain whose process is gone, and a send wakes it", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const { recorded, scripted } = yield* sleepingRoot(temporary);
		yield* Effect.gen(function* () {
			const db = yield* Database;
			const writer = yield* Writer;
			yield* writer.write(
				db.AgentSession.where({ id: payload.sessionId }).update({
					executionStatus: "draining",
				}),
			);
		}).pipe(Effect.provide(temporary.layer));
		const backend = reportsNativeRef(scripted.backend, scripted, NATIVE);

		yield* Effect.gen(function* () {
			const sight = yield* SightSource;
			expect((yield* sessionRow).executionStatus).toBe("idle");
			yield* sight.send(payload.sessionId, "carry on");
			yield* eventually(
				Effect.gen(function* () {
					expect((yield* onlyRecovery).status).toBe("succeeded");
					expect((yield* sessionRow).executionStatus).toBe("active");
				}),
			);
			const resumed = yield* scripted.session(payload.sessionId);
			expect(resumed === undefined ? [] : yield* resumed.sent).toEqual([
				"carry on",
			]);
		}).pipe(Effect.provide(wakeLayer(temporary, backend, recorded.runner)));
	}),
);

// why: a resume that opens and then says nothing about who it is was the
// production hang — the Intent sat in "running" with no reason and the
// half-built attachment answered "held" to every later send. The bound turns it
// into a reason a second send can push, and the registry lets go on the way out.
it.live(
	"a resume that never confirms its opening stops holding the Session",
	() =>
		Effect.gen(function* () {
			const temporary = yield* acquireTemporaryPersistence;
			const { recorded, scripted } = yield* sleepingRoot(temporary);
			const allowed = yield* Ref.make(false);
			const backend = confirmsWhen(scripted.backend, scripted, allowed);

			yield* Effect.gen(function* () {
				const fabric = yield* SessionFabric;
				const sight = yield* SightSource;
				yield* sight.send(payload.sessionId, "are you there");
				const parked = yield* eventually(
					Effect.gen(function* () {
						const row = yield* onlyRecovery;
						expect(row.status).toBe("waiting");
						return row;
					}),
				);
				expect(parked.detail).toContain("did not reach a live attachment");
				expect(yield* fabric.holds(payload.sessionId)).toBe(false);
				expect((yield* sessionRow).executionStatus).toBe("idle");

				yield* Ref.set(allowed, true);
				yield* sight.send(payload.sessionId, "still asking");
				yield* eventually(
					Effect.gen(function* () {
						const row = yield* onlyRecovery;
						expect(row.id).toBe(parked.id);
						expect(row.status).toBe("succeeded");
						expect((yield* sessionRow).executionStatus).toBe("active");
					}),
				);
				expect(yield* fabric.holds(payload.sessionId)).toBe(true);
			}).pipe(
				Effect.provide(wakeLayer(temporary, backend, recorded.runner, 250)),
			);
		}),
);

// why: agent/recover is requeued by reclaim, so an Intent the old process left
// running comes back carrying words that were never said. It must say them
// once, to the Session it now reaches, and not leave a second demand behind.
it.live("a wake requeued after a restart says its words once", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const { recorded, scripted } = yield* sleepingRoot(temporary);
		const allowed = yield* Ref.make(false);
		const silent = confirmsWhen(scripted.backend, scripted, allowed);

		const running = yield* Effect.gen(function* () {
			const sight = yield* SightSource;
			yield* sight.send(payload.sessionId, "come about");
			return yield* eventually(
				Effect.gen(function* () {
					const row = yield* onlyRecovery;
					expect(row.status).toBe("running");
					return row;
				}),
			);
		}).pipe(Effect.provide(wakeLayer(temporary, silent, recorded.runner)));

		yield* Ref.set(allowed, true);
		yield* Effect.gen(function* () {
			yield* eventually(
				Effect.gen(function* () {
					const row = yield* onlyRecovery;
					expect(row.id).toBe(running.id);
					expect(row.status).toBe("succeeded");
				}),
			);
			const resumed = yield* scripted.session(payload.sessionId);
			expect(resumed === undefined ? [] : yield* resumed.sent).toEqual([
				"come about",
			]);
		}).pipe(
			Effect.provide(
				wakeLayer(
					temporary,
					reportsNativeRef(scripted.backend, scripted, NATIVE),
					recorded.runner,
				),
			),
		);
	}),
);

// why: the chips read the Intent table, and nothing wrote to it when a wake
// moved — so a parked wake appeared only when some unrelated act happened to
// ring the feed. A refused recover writes no Agent, Session or Piece row, which
// makes it the cleanest proof that the ring came from the Intent alone.
it.live("an Intent moving is enough to ring the fleet feed", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		const recorded = yield* makeScriptedRunner;
		yield* Effect.gen(function* () {
			const domain = yield* AgentDomain;
			const kernel = yield* Kernel;
			const sight = yield* SightSource;
			// why: the feed opens with the snapshot as it stands, so a second one
			// is the only evidence of a ring — and between the two the fleet is
			// touched by nothing but an Intent that never reaches a row.
			const rings = yield* Effect.forkChild(
				sight.fleetFeed.pipe(
					Stream.take(2),
					Stream.runCollect,
					Effect.timeoutOrElse({
						duration: 5000,
						orElse: () =>
							Effect.die("the fleet feed did not ring for an Intent"),
					}),
				),
			);
			const ghost = yield* kernel.submit(domain.recover, {
				sessionId: "session-ghost",
			});
			const row = yield* eventually(
				Effect.gen(function* () {
					const found = Option.getOrThrow(
						yield* Database.use((db) =>
							db.Intent.where({ id: ghost.id }).first(),
						),
					);
					expect(found.status).toBe("failed");
					return found;
				}),
			);
			expect(row.detail).toContain("no root Session session-ghost");
			expect(yield* Fiber.join(rings)).toHaveLength(2);
		}).pipe(
			Effect.provide(wakeLayer(temporary, scripted.backend, recorded.runner)),
		);
	}),
);
