import { it } from "@antumbra/persistence/testing";
import type { AgentEvent } from "@antumbra/vocabulary/session-events";
import { expect } from "@effect/vitest";
import { Effect, Option } from "effect";
import { journalOf, scriptedLane, seedAgent, seedSession, sessionRow, treeLayer } from "#test/tree/fixture.ts";
import { SessionTreeAudits } from "#tree/audit/service.ts";
import { SessionTreeSweeps } from "#tree/sweeps/service.ts";

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

it.effectDB("a node whose ledger holds nothing reads complete", function* () {
	yield* Effect.gen(function* () {
		const lane = yield* scriptedLane([]);
		const audits = yield* SessionTreeAudits;
		yield* seedTree("recording");
		const tree = yield* rows;

		yield* audits.audit(lane.audit, tree.root, tree.node);

		expect(yield* completenessOf(NODE)).toBe("complete");
		expect(yield* lane.readings).toBe(1);
	}).pipe(Effect.provide(treeLayer));
});

it.effectDB("the same ledger read twice reaches the same verdict", function* () {
	yield* Effect.gen(function* () {
		const lane = yield* scriptedLane([missedLine]);
		const audits = yield* SessionTreeAudits;
		yield* seedTree("recording");
		const first = yield* rows;

		yield* audits.audit(lane.audit, first.root, first.node);

		const second = yield* rows;
		expect(second.node.completeness).toBe("incomplete");
		yield* audits.audit(lane.audit, second.root, second.node);

		expect(yield* completenessOf(NODE)).toBe("incomplete");
		expect(yield* lane.readings).toBe(2);
	}).pipe(Effect.provide(treeLayer));
});

it.effectDB("a row from before the record kept gaps is never audited", function* () {
	yield* Effect.gen(function* () {
		const lane = yield* scriptedLane([missedLine]);
		const audits = yield* SessionTreeAudits;
		yield* seedTree("unaudited");
		const tree = yield* rows;

		yield* audits.audit(lane.audit, tree.root, tree.node);

		expect(yield* completenessOf(NODE)).toBe("unaudited");
		expect(yield* lane.readings).toBe(0);
		expect(yield* journalOf(NODE)).toHaveLength(0);
	}).pipe(Effect.provide(treeLayer));
});

it.effectDB("a node still being written to has nothing to audit yet", function* () {
	yield* Effect.gen(function* () {
		const lane = yield* scriptedLane([missedLine]);
		const audits = yield* SessionTreeAudits;
		yield* seedTree("recording", "open");
		const tree = yield* rows;

		yield* audits.audit(lane.audit, tree.root, tree.node);

		expect(yield* completenessOf(NODE)).toBe("recording");
		expect(yield* lane.readings).toBe(0);
	}).pipe(Effect.provide(treeLayer));
});

it.effectDB("closure audits its node and reconnection finishes only its closed unfinished nodes", function* () {
	yield* Effect.gen(function* () {
		const lane = yield* scriptedLane([missedLine]);
		const treeSweeps = yield* SessionTreeSweeps;
		yield* seedTree("recording");
		yield* seedAgent("other-agent");
		yield* seedSession({ agentId: "other-agent", id: "other-root", nativeRef: "other-root", rootSessionId: "other-root" });
		for (const node of [
			{ id: "stale", rootSessionId: ROOT, status: "closed" },
			{ id: "writing", rootSessionId: ROOT, status: "open" },
			{ id: "foreign", rootSessionId: "other-root", status: "closed" },
		]) {
			yield* seedSession({
				...node,
				agentId: node.rootSessionId === ROOT ? AGENT : "other-agent",
				nativeRef: node.id,
				parentSessionId: node.rootSessionId,
			});
		}
		const sweeps = yield* treeSweeps.create(lane.audit, ROOT, () => Effect.void);
		const record = () => Effect.succeed(false);
		yield* sweeps.closed(NODE, record);
		expect(yield* completenessOf(NODE)).toBe("incomplete");
		expect(yield* completenessOf("stale")).toBe("recording");
		yield* sweeps.closed("foreign", record);
		yield* sweeps.reconnected(record);
		expect(yield* completenessOf("stale")).toBe("incomplete");
		expect(yield* completenessOf("writing")).toBe("recording");
		expect(yield* completenessOf("foreign")).toBe("recording");
		expect(yield* journalOf(NODE)).toHaveLength(1);
	}).pipe(Effect.provide(treeLayer));
});
