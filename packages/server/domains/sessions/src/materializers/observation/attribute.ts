import { Effect, Option } from "effect";
import { SessionId } from "#ids.ts";
import type { Observation, Rows, Session } from "#materializers/observation/types.ts";

export const attribute = Effect.fn("Sessions.attribute")(function* (fact: Observation, rows: Rows, root: Session, nodes: readonly Session[]) {
	const origin = fact.origin;
	if (origin === null) return root;
	const indexed = yield* rows.sessionNode.where({ rootSessionId: root.rootSessionId });
	const known =
		origin.node === undefined ? indexed.find((node) => node.spawnedBy === origin.spawnedBy) : indexed.find((node) => node.nativeRef === origin.node);
	if (known !== undefined) return yield* rows.session.get(known.id);
	const nativeRef = origin.node ?? origin.spawnedBy;
	const id = SessionId.make(`${root.rootSessionId}:${nativeRef}`);
	const parent = nodes.find((node) => node.nativeRef === origin.parentNode) ?? root;
	const held = yield* rows.session.find(id);
	if (Option.isSome(held)) return held.value;
	const value: Session = {
		...root,
		id,
		nativeRef,
		parentSessionId: parent.id,
		status: "open",
		executionStatus: "active",
		completeness: "recording",
		outcome: null,
		label: null,
		kind: null,
		charterDeliveredAt: null,
		attached: true,
		toolCalls: 0,
		openDelegations: 0,
		idleSince: null,
		createdAt: new Date(fact.at).toISOString(),
	};
	yield* rows.session.insert(value);
	yield* rows.sessionNode.insert({ id, rootSessionId: root.rootSessionId, nativeRef, spawnedBy: origin.spawnedBy, announced: false });
	return value;
});
