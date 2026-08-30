import { acquireTemporaryPersistence } from "@antumbra/persistence/testing";
import type { AgentEvent } from "@antumbra/vocabulary/session-events";
import { expect, it } from "@effect/vitest";
import { Effect, Option } from "effect";
import { journalOf, scriptedLane, seedAgent, seedSession, sessionRow, treeLayer } from "#test/tree/fixture.ts";
import { makeSessionTreeAudits } from "#tree/audit.ts";

const AGENT = "agent-audited";
const ROOT = "session-root";
const NODE = "session-node";

const missedLine: AgentEvent = {
	detail: "a line the provider stored never reached the record",
	gapKind: "unknown",
	raw: { kind: "audit/rehearsal", payload: "{}", source: "scripted" },
	type: "subsession.gap",
};

const seedTree = (completeness: string, status = "closed") =>
	seedAgent(AGENT).pipe(
		Effect.andThen(
			seedSession({
				agentId: AGENT,
				id: ROOT,
				nativeRef: "native-root",
				rootSessionId: ROOT,
			}),
		),
		Effect.andThen(
			seedSession({
				agentId: AGENT,
				completeness,
				id: NODE,
				nativeRef: "native-node",
				parentSessionId: ROOT,
				rootSessionId: ROOT,
				status,
			}),
		),
	);

const rows = Effect.gen(function* () {
	const root = Option.getOrThrow(yield* sessionRow(ROOT));
	const node = Option.getOrThrow(yield* sessionRow(NODE));
	return { node, root };
});

const completenessOf = (id: string) => sessionRow(id).pipe(Effect.map((row) => Option.getOrThrow(row).completeness));

it.live("a node whose ledger holds nothing reads complete", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		yield* Effect.gen(function* () {
			const lane = yield* scriptedLane([]);
			const audits = yield* makeSessionTreeAudits;
			yield* seedTree("recording");
			const tree = yield* rows;

			yield* audits.audit(lane.audit, tree.root, tree.node);

			expect(yield* completenessOf(NODE)).toBe("complete");
			expect(yield* lane.readings).toBe(1);
		}).pipe(Effect.provide(treeLayer(temporary)));
	}),
);

it.live("the same ledger read twice reaches the same verdict", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		yield* Effect.gen(function* () {
			const lane = yield* scriptedLane([missedLine]);
			const audits = yield* makeSessionTreeAudits;
			yield* seedTree("recording");
			const first = yield* rows;

			yield* audits.audit(lane.audit, first.root, first.node);
			expect(yield* completenessOf(NODE)).toBe("incomplete");

			const second = yield* rows;
			expect(second.node.completeness).toBe("incomplete");
			yield* audits.audit(lane.audit, second.root, second.node);

			expect(yield* completenessOf(NODE)).toBe("incomplete");
			expect(yield* lane.readings).toBe(2);
		}).pipe(Effect.provide(treeLayer(temporary)));
	}),
);

it.live("a row from before the record kept gaps is never audited", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		yield* Effect.gen(function* () {
			const lane = yield* scriptedLane([missedLine]);
			const audits = yield* makeSessionTreeAudits;
			yield* seedTree("unaudited");
			const tree = yield* rows;

			yield* audits.audit(lane.audit, tree.root, tree.node);

			expect(yield* completenessOf(NODE)).toBe("unaudited");
			expect(yield* lane.readings).toBe(0);
			expect(yield* journalOf(NODE)).toHaveLength(0);
		}).pipe(Effect.provide(treeLayer(temporary)));
	}),
);

it.live("a node still being written to has nothing to audit yet", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		yield* Effect.gen(function* () {
			const lane = yield* scriptedLane([missedLine]);
			const audits = yield* makeSessionTreeAudits;
			yield* seedTree("recording", "open");
			const tree = yield* rows;

			yield* audits.audit(lane.audit, tree.root, tree.node);

			expect(yield* completenessOf(NODE)).toBe("recording");
			expect(yield* lane.readings).toBe(0);
		}).pipe(Effect.provide(treeLayer(temporary)));
	}),
);
