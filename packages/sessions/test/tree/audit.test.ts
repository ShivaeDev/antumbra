import { acquireTemporaryPersistence } from "@antumbra/persistence/testing";
import type { AgentEvent } from "@antumbra/vocabulary/session-events";
import { expect, it } from "@effect/vitest";
import { Effect, Option } from "effect";
import {
	journalOf,
	scriptedLane,
	seedAgent,
	seedSession,
	sessionRow,
	treeLayer,
} from "#test/tree/fixture.ts";
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

const completenessOf = (id: string) =>
	sessionRow(id).pipe(Effect.map((row) => Option.getOrThrow(row).completeness));

it.live("a node whose ledger holds nothing reads complete", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		yield* Effect.gen(function* () {
			const lane = yield* scriptedLane([]);
			const audits = yield* makeSessionTreeAudits;
			yield* seedTree("recording");
			const tree = yield* rows;

			yield* audits.audit(lane.audit, tree.root, tree.node);

			// why: complete is not a judgement made at the close — it is what an
			// empty gap ledger projects to once the provider has been asked and
			// found nothing more to say.
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

			// why: the projection is a function of the gap ledger and nothing else,
			// so running it again on a row it already settled is allowed and lands
			// where it landed before. That is what makes a later repair possible: a
			// ledger whose gaps are resolved re-audits the node forward, and nothing
			// here has to remember what an earlier reading concluded.
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

			// why: a legacy row predates the gaps the projection reads, so an empty
			// ledger says nothing about it. Auditing it would assert evidence nobody
			// has — the provider is not even asked.
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
