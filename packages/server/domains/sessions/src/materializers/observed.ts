import { materializer } from "@antumbra/platform-feature/materializer.ts";
import { Effect, Option } from "effect";
import { observed } from "#facts/observed.ts";
import { SessionId, SessionOperationId } from "#ids.ts";
import { session } from "#rows/session.ts";
import { sessionOperation } from "#rows/session-operation.ts";
import { sessionStartResult } from "#rows/session-start-result.ts";
import { sessionToolCall } from "#rows/session-tool-call.ts";

export const observedMaterializer = materializer(observed, {
	writes: [session, sessionOperation, sessionToolCall, sessionStartResult],
	run: Effect.fn("sessions.observed")(function* (fact, rows) {
		const evidence = fact.evidence;
		const at = new Date(fact.at).toISOString();
		if (evidence.type === "started" || evidence.type === "failed") {
			const requestId = fact.operationId ?? fact.requestId;
			const result = { requestId, sessionId: fact.sessionId, status: evidence.type, reason: evidence.type === "failed" ? evidence.reason : null };
			if (yield* rows.sessionStartResult.exists(requestId)) yield* rows.sessionStartResult.update(requestId, result);
			else yield* rows.sessionStartResult.insert(result);
		}
		if (evidence.type === "started") {
			yield* rows.session.insert({
				id: fact.sessionId,
				agentId: evidence.agentId,
				backend: evidence.backend,
				cwd: evidence.cwd,
				nativeRef: evidence.nativeRef,
				status: "open",
				executionStatus: "idle",
				completeness: "recording",
				outcome: null,
				label: null,
				kind: null,
				parentSessionId: null,
				rootSessionId: fact.sessionId,
				runnerId: evidence.runnerId,
				toolSetVersion: evidence.toolSetVersion,
				startRequestId: fact.operationId ?? fact.requestId,
				charterDeliveredAt: null,
				attached: true,
				idleSince: at,
				openDelegations: 0,
				toolCalls: 0,
				createdAt: at,
			});
			return;
		}
		const root = yield* rows.session.find(fact.sessionId);
		if (Option.isNone(root)) return;
		const nodes = yield* rows.session.where({ rootSessionId: root.value.rootSessionId });
		const current = fact.nodeRef === null ? root.value : (nodes.find((node) => node.nativeRef === fact.nodeRef) ?? root.value);
		if (evidence.type === "opened") {
			const existing = nodes.find((node) => node.nativeRef === evidence.nativeRef);
			if (existing !== undefined) {
				yield* rows.session.update(existing.id, { status: "open", executionStatus: "active", attached: true, outcome: null });
			} else {
				const parent = nodes.find((node) => node.nativeRef === evidence.parentRef) ?? current;
				yield* rows.session.insert({
					...root.value,
					id: SessionId.make(`${root.value.id}:${evidence.nativeRef}`),
					nativeRef: evidence.nativeRef,
					parentSessionId: parent.id,
					label: evidence.label,
					kind: evidence.kind,
					executionStatus: "active",
					status: "open",
					completeness: "recording",
					outcome: null,
					createdAt: at,
					idleSince: null,
					toolCalls: 0,
					openDelegations: 0,
					attached: true,
				});
			}
			return;
		}
		if (evidence.type === "closed") {
			const node = nodes.find((value) => value.nativeRef === evidence.nativeRef);
			if (node !== undefined)
				yield* rows.session.update(node.id, {
					status: "closed",
					executionStatus: "idle",
					attached: false,
					outcome: evidence.outcome,
					completeness: node.completeness === "recording" ? "complete" : node.completeness,
					idleSince: at,
				});
			return;
		}
		if (evidence.type === "native") yield* rows.session.update(current.id, { nativeRef: evidence.nativeRef });
		if (evidence.type === "activity")
			yield* rows.session.update(current.id, { executionStatus: evidence.state, idleSince: evidence.state === "idle" ? at : null });
		if (evidence.type === "background") yield* rows.session.update(current.id, { openDelegations: evidence.count });
		if (evidence.type === "gap") yield* rows.session.update(current.id, { completeness: "incomplete" });
		if (evidence.type === "woke")
			yield* rows.session.update(current.id, { attached: true, runnerId: evidence.runnerId, executionStatus: "active", idleSince: null });
		if (evidence.type === "slept") yield* rows.session.update(current.id, { attached: false, executionStatus: "idle", idleSince: at });
		if (evidence.type === "ended") {
			for (const node of nodes) yield* rows.session.update(node.id, { attached: false, status: "closed", executionStatus: "idle", idleSince: at });
		}
		if (evidence.type === "tool-called") {
			const id = `${current.id}:${evidence.callId}`;
			if (!(yield* rows.sessionToolCall.exists(id))) {
				yield* rows.sessionToolCall.insert({ id, sessionId: current.id, name: evidence.name, input: evidence.input, answeredAt: null, calledAt: at });
				yield* rows.session.update(current.id, { toolCalls: current.toolCalls + 1 });
			}
		}
		if (evidence.type === "tool-answered") {
			const id = `${current.id}:${evidence.callId}`;
			const call = yield* rows.sessionToolCall.find(id);
			if (Option.isSome(call) && call.value.answeredAt === null) {
				yield* rows.sessionToolCall.update(id, { answeredAt: at });
				yield* rows.session.update(current.id, { toolCalls: Math.max(0, current.toolCalls - 1) });
			}
		}
		if (evidence.type === "input-accepted") {
			yield* rows.session.update(current.id, {
				executionStatus: "active",
				idleSince: null,
				...(fact.operationId === current.startRequestId ? { charterDeliveredAt: at } : {}),
			});
		}
		if (fact.operationId !== null && ["woke", "slept", "ended", "failed", "input-accepted"].includes(evidence.type)) {
			const id = SessionOperationId.make(fact.operationId);
			if (yield* rows.sessionOperation.exists(id))
				yield* rows.sessionOperation.update(id, {
					status: evidence.type === "failed" ? "waiting" : "accepted",
					detail: evidence.type === "failed" ? evidence.reason : null,
				});
		}
	}),
});
