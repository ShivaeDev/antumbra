import { SightSource } from "@antumbra/contract";
import { Database } from "@antumbra/persistence";
import { SessionFabric, SessionFabricLive } from "@antumbra/session-fabric";
import {
	IDLE_SIESTA_AFTER_MILLIS,
	makeSessionTurnRests,
} from "@antumbra/sessions";
import type { AgentEvent } from "@antumbra/vocabulary/session-events";
import { expect, it } from "@effect/vitest";
import { Effect, Layer } from "effect";
import { SightSourceLive } from "#sight.ts";
import { domainKernelLayer } from "#test/domain-layers.ts";
import {
	acquireTemporaryPersistence,
	makeScriptedBackend,
	rawOf,
	type ScriptedBackend,
} from "#test/harness.ts";
import {
	HAND,
	openedNatively,
	passedAt,
	presenceOf,
	sessionRow,
	spawned,
} from "#test/session-idle-fixture.ts";
import {
	eventually,
	reportsNativeRef,
} from "#test/session-recovery-fixture.ts";

const spoke: AgentEvent = {
	raw: rawOf("agent/message"),
	role: "agent",
	text: "on it",
	type: "message",
};

const completed: AgentEvent = {
	durationMs: 1200,
	raw: rawOf("turn/completed"),
	status: "completed",
	type: "turn.completed",
};

// why: the fabric has to be reachable from the rehearsal, because taking the
// attachment away is how a process dying is staged — the domain's own layer
// keeps it to itself.
const strandLayer = (
	temporary: Parameters<typeof domainKernelLayer>[0],
	scripted: ScriptedBackend,
) =>
	SightSourceLive.pipe(
		Layer.provideMerge(SessionFabricLive),
		Layer.provideMerge(
			domainKernelLayer(
				temporary,
				reportsNativeRef(scripted.backend, scripted, "native-idle"),
			),
		),
	);

const wakes = Effect.gen(function* () {
	const db = yield* Database;
	return yield* db.Intent.where({ tag: "agent/wake" }).all();
});

// why: the whole ruling in one rehearsal. A Session whose process is taken
// mid-turn is shown as stranded and left there — the clock's pass comes round
// and asks for nothing, because a resume nobody asked for is exactly what was
// costing money and telling the record a story it could not check.
it.live(
	"a session whose process went mid-turn strands and stays stranded",
	() =>
		Effect.gen(function* () {
			const temporary = yield* acquireTemporaryPersistence;
			const scripted = yield* makeScriptedBackend;
			yield* Effect.gen(function* () {
				const fabric = yield* SessionFabric;
				yield* spawned;
				yield* openedNatively(scripted);
				expect((yield* presenceOf).presence).toBe("working");

				yield* fabric.stop(HAND.sessionId);
				const lost = yield* presenceOf;
				expect(lost.presence).toBe("stranded");
				// why: stranded is a report, never a refusal — speaking to it is the
				// one way it comes back.
				expect(lost.canSend).toBe(true);
				expect((yield* sessionRow).executionStatus).toBe("active");

				yield* passedAt(IDLE_SIESTA_AFTER_MILLIS + 60_000);
				expect(yield* wakes).toEqual([]);
				expect((yield* sessionRow).executionStatus).toBe("active");
				expect((yield* presenceOf).presence).toBe("stranded");
			}).pipe(Effect.provide(strandLayer(temporary, scripted)));
		}),
);

// why: the settle used to read a missing attachment as a mismatch, because an
// absent entry answered zero to a question about a count. An ending nobody is
// racing is nobody's to refuse, so it settles the row it belongs to and the
// record stops claiming a turn that ended.
it.live("an ending that lands after the attachment went still settles", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const fabric = yield* SessionFabric;
			const turnRestFor = yield* makeSessionTurnRests;
			yield* spawned;
			const turns = yield* turnRestFor(HAND.sessionId);
			yield* turns.observed(spoke);

			yield* fabric.stop(HAND.sessionId);
			yield* turns.observed(completed);
			expect((yield* sessionRow).executionStatus).toBe("idle");
		}).pipe(Effect.provide(strandLayer(temporary, scripted)));
	}),
);

// why: and the guard it replaces still holds. An ending left behind by an
// attachment that is gone must not settle a row a later attachment has since
// taken, because that Session is working again on somebody's word.
it.live("an ending is refused when a newer attachment holds the session", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const fabric = yield* SessionFabric;
			const sight = yield* SightSource;
			const turnRestFor = yield* makeSessionTurnRests;
			yield* spawned;
			yield* openedNatively(scripted);
			const turns = yield* turnRestFor(HAND.sessionId);
			yield* turns.observed(spoke);

			yield* fabric.stop(HAND.sessionId);
			yield* sight.send(HAND.sessionId, "take it back up");
			yield* eventually(
				Effect.gen(function* () {
					expect(yield* fabric.holds(HAND.sessionId)).toBe(true);
				}),
			);

			yield* turns.observed(completed);
			expect((yield* sessionRow).executionStatus).toBe("active");
		}).pipe(Effect.provide(strandLayer(temporary, scripted)));
	}),
);
