import { Effect, Option } from "effect";
import { SessionId } from "#ids.ts";
import type { Observation, Rows, Session } from "#materializers/observation-types.ts";

const open = Effect.fn("Sessions.openNode")(function* (fact: Observation, rows: Rows, current: Session, nodes: readonly Session[]) {
	const evidence = fact.evidence;
	if (evidence.type !== "opened") return;
	const at = new Date(fact.at).toISOString();
	const indexed = yield* rows.sessionNode.where({ rootSessionId: current.rootSessionId });
	const node =
		indexed.find((node) => node.nativeRef === evidence.nativeRef) ?? indexed.find((node) => !node.announced && node.spawnedBy === evidence.spawnedBy);
	const calls = yield* rows.sessionToolCall.where({});
	const caller = calls.find((call) => call.callId === evidence.spawnedBy);
	const parent = nodes.find((node) => node.id === caller?.sessionId) ?? nodes.find((node) => node.nativeRef === evidence.parentRef) ?? current;
	if (node !== undefined) {
		const stored = yield* rows.session.get(node.id);
		yield* rows.sessionNode.update(node.id, { announced: true, nativeRef: evidence.nativeRef, spawnedBy: evidence.spawnedBy });
		yield* rows.session.update(node.id, {
			...(fact.live ? { status: "open", executionStatus: "active", attached: true, outcome: null, completeness: "recording" } : {}),
			parentSessionId: node.announced ? stored.parentSessionId : parent.id,
			nativeRef: evidence.nativeRef,
			label: evidence.label ?? stored.label,
			kind: evidence.kind ?? stored.kind,
		});
		if (!node.announced)
			yield* rows.sessionGap.insert({
				id: `${fact.seq}:adopted`,
				sessionId: node.id,
				kind: "adopted-late",
				detail: "The node was recorded before its opening was announced",
				observedAt: at,
			});
		return;
	}
	const id = SessionId.make(`${current.rootSessionId}:${evidence.nativeRef}`);
	yield* rows.session.insert({
		...current,
		id,
		nativeRef: evidence.nativeRef,
		parentSessionId: parent.id,
		label: evidence.label,
		kind: evidence.kind,
		executionStatus: fact.live ? "active" : "idle",
		status: "open",
		completeness: "recording",
		outcome: null,
		createdAt: at,
		idleSince: null,
		toolCalls: 0,
		openDelegations: 0,
		attached: fact.live,
		charterDeliveredAt: null,
	});
	yield* rows.sessionNode.insert({
		id,
		rootSessionId: current.rootSessionId,
		nativeRef: evidence.nativeRef,
		spawnedBy: evidence.spawnedBy,
		announced: true,
	});
});

export const tree = Effect.fn("Sessions.treeEvidence")(function* (fact: Observation, rows: Rows, current: Session, nodes: readonly Session[]) {
	yield* open(fact, rows, current, nodes);
	const evidence = fact.evidence;
	if (evidence.type !== "closed" && evidence.type !== "node-audited") return;
	const indexed = yield* rows.sessionNode.where({ rootSessionId: current.rootSessionId, nativeRef: evidence.nativeRef });
	const id = indexed[0]?.id ?? nodes.find((node) => node.nativeRef === evidence.nativeRef)?.id;
	if (id === undefined) return;
	const node = yield* rows.session.find(id);
	if (Option.isNone(node)) return;
	const gaps = yield* rows.sessionGap.count({ sessionId: id });
	if (evidence.type === "node-audited") {
		if (node.value.completeness !== "unaudited") yield* rows.session.update(id, { completeness: gaps > 0 ? "incomplete" : "complete" });
		return;
	}
	yield* rows.session.update(id, {
		status: "closed",
		executionStatus: "idle",
		attached: false,
		outcome: evidence.outcome,
		completeness: gaps > 0 ? "incomplete" : "recording",
		idleSince: new Date(fact.at).toISOString(),
	});
});
