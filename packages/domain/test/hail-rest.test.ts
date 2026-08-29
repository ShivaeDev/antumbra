import { Kernel } from "@antumbra/kernel";
import { Database } from "@antumbra/persistence";
import { expect, it } from "@effect/vitest";
import { Effect, Option } from "effect";
import { AgentDomain } from "#domain.ts";
import { domainKernelLayer } from "#test/domain-layers.ts";
import {
	acquireTemporaryPersistence,
	callTool,
	makeScriptedBackend,
	rawOf,
	type ScriptedBackend,
	sessionFor,
} from "#test/harness.ts";
import {
	reportsNativeRef,
	untilTerminal,
	WAKE_INSTRUCTION,
} from "#test/session-recovery-fixture.ts";
import {
	aliveAgent,
	eventually,
	openReefVoyage,
} from "#test/voyage-fixtures.ts";

// why: both rehearsals need a captain that has said it has nothing left to do,
// and differ only in what has happened to its process by the time the second
// hail arrives.
const captainStoodDown = (scripted: ScriptedBackend) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const domain = yield* AgentDomain;
		const voyage = yield* openReefVoyage;
		const first = yield* domain.voyages.hail(voyage.id);
		yield* eventually(aliveAgent(first.agentId));
		const initial = yield* sessionFor(scripted, first.agentId);
		yield* initial.emit({
			nativeRef: "native-captain",
			raw: rawOf("session/opened"),
			type: "session.opened",
		});
		yield* eventually(
			Effect.gen(function* () {
				const session = (yield* db.AgentSession.where({
					agentId: first.agentId,
				}).all())[0];
				expect(session?.nativeRef).toBe("native-captain");
			}),
		);
		const session = Option.getOrThrow(
			Option.fromUndefinedOr(
				(yield* db.AgentSession.where({ agentId: first.agentId }).all())[0],
			),
		);
		yield* callTool(initial, "stand_down", undefined);
		yield* eventually(
			Effect.gen(function* () {
				expect(
					Option.getOrThrow(
						yield* db.AgentSession.where({ id: session.id }).first(),
					).executionStatus,
				).toBe("idle");
			}),
		);
		return { first, initial, session, voyage };
	});

const executionOf = (sessionId: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		return Option.getOrThrow(
			yield* db.AgentSession.where({ id: sessionId }).first(),
		).executionStatus;
	});

it.live(
	"hailing an idle captain reaches the Session it is already standing in",
	() =>
		Effect.gen(function* () {
			const temporary = yield* acquireTemporaryPersistence;
			const scripted = yield* makeScriptedBackend;
			const backend = reportsNativeRef(
				scripted.backend,
				scripted,
				"native-captain",
			);
			yield* Effect.gen(function* () {
				const db = yield* Database;
				const domain = yield* AgentDomain;
				const { first, initial, session, voyage } =
					yield* captainStoodDown(scripted);

				const sleeping = Option.getOrThrow(
					yield* domain.voyages.read(voyage.id),
				);
				expect(Option.getOrThrow(sleeping.captain)).toEqual({
					agentId: first.agentId,
					atWork: false,
					sessionId: session.id,
					status: "alive",
				});

				const resumed = yield* domain.voyages.hail(voyage.id);
				expect(resumed.agentId).toBe(first.agentId);
				yield* eventually(
					Effect.gen(function* () {
						expect(yield* initial.sent).toContain(WAKE_INSTRUCTION);
					}),
				);
				// why: an idle captain never left, so the hail reaches it where it
				// stands rather than opening a second conversation over the first.
				expect(yield* scripted.opened).toHaveLength(1);
				expect(yield* initial.closed).toBe(false);
				expect(yield* db.Agent.all()).toHaveLength(1);
				expect(yield* db.AgentSession.all()).toHaveLength(1);
				expect(yield* db.VoyageAgent.all()).toHaveLength(1);
				expect(yield* executionOf(session.id)).toBe("active");
			}).pipe(Effect.provide(domainKernelLayer(temporary, backend)));
		}),
);

// why: once the clock has taken the process away the captain is asleep, and the
// hail is what brings it back — into the same Session and the same provider
// thread, because a hail resumes a conversation rather than starting one.
it.live(
	"hailing an asleep captain resumes its exact Session and native thread",
	() =>
		Effect.gen(function* () {
			const temporary = yield* acquireTemporaryPersistence;
			const scripted = yield* makeScriptedBackend;
			const backend = reportsNativeRef(
				scripted.backend,
				scripted,
				"native-captain",
			);
			yield* Effect.gen(function* () {
				const db = yield* Database;
				const domain = yield* AgentDomain;
				const kernel = yield* Kernel;
				const { first, initial, session, voyage } =
					yield* captainStoodDown(scripted);
				// why: the siesta stands in for the hour the clock would otherwise
				// have to pass; the threshold itself is rehearsed where it lives.
				const siesta = yield* kernel.submit(domain.siesta, {
					sessionId: session.id,
				});
				expect(yield* untilTerminal(siesta.changes)).toBe("succeeded");
				yield* eventually(
					Effect.gen(function* () {
						expect(yield* initial.closed).toBe(true);
					}),
				);

				const resumed = yield* domain.voyages.hail(voyage.id);
				expect(resumed.agentId).toBe(first.agentId);
				yield* eventually(
					Effect.gen(function* () {
						expect(yield* scripted.opened).toHaveLength(2);
						const current = yield* sessionFor(scripted, first.agentId);
						expect(yield* current.sent).toEqual([WAKE_INSTRUCTION]);
					}),
				);
				const reopened = (yield* scripted.opened)[1];
				expect(reopened?.sessionId).toBe(session.id);
				expect(reopened?.resume).toEqual(Option.some("native-captain"));
				expect(yield* db.Agent.all()).toHaveLength(1);
				expect(yield* db.AgentSession.all()).toHaveLength(1);
				expect(yield* db.VoyageAgent.all()).toHaveLength(1);
				// why: a resume hands over its words before it confirms the opening,
				// so the provider having heard them is not yet the resume being over.
				// The row that says this Session is working is written once the
				// attachment stands, which is a moment later.
				yield* eventually(
					Effect.gen(function* () {
						expect(yield* executionOf(session.id)).toBe("active");
					}),
				);
			}).pipe(Effect.provide(domainKernelLayer(temporary, backend)));
		}),
);
