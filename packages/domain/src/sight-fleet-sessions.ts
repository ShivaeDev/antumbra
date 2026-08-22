import type { SessionSituation } from "@antumbra/contract";
import type { StoredAgentSession } from "@antumbra/persistence";
import {
	decodeSessionExecutionStatus,
	decodeStoredAgentSessionStatus,
	sessionPresence,
} from "@antumbra/vocabulary/agent-runtime";
import { Effect } from "effect";
import { sessionAtRest, sessionRetirable } from "#session-at-rest.ts";
import type { IntentAttribution } from "#sight-diagnostics.ts";

// why: what this process is holding and what those holdings are carrying. Both
// are read once for the whole pass and handed in, so every Session in one
// snapshot is judged against the same moment.
export interface FleetRuntime {
	readonly attached: ReadonlySet<string>;
	readonly delegating: ReadonlySet<string>;
}

// why: how one root Session reads — its capabilities, its presence and the
// diagnostics beside them. It is its own file because it answers about a single
// Session, while the snapshot around it answers about the roster; the two are
// read together but they are not the same question.
export const sessionSummary = (
	session: StoredAgentSession,
	runtime: FleetRuntime,
	attribution: IntentAttribution,
	pointers: ReadonlyMap<string, string | null>,
	situations: ReadonlyMap<string, ReadonlyArray<SessionSituation>>,
) =>
	Effect.all({
		executionStatus: Effect.fromResult(
			decodeSessionExecutionStatus(session.id, session.executionStatus),
		),
		status: Effect.fromResult(
			decodeStoredAgentSessionStatus(session.id, session.status),
		),
	}).pipe(
		Effect.map(({ executionStatus, status }) => {
			const running = status === "open" && executionStatus === "active";
			const presence = sessionPresence({
				attached: runtime.attached.has(session.id),
				executionStatus,
				open: status === "open",
			});
			return {
				// why: a situation is only addressable if the words can get there,
				// so it rides the same condition as `canSend` — offering a control
				// on a Session nothing can reach would be a button that fails.
				addressable:
					status === "open" ? (situations.get(session.agentId) ?? []) : [],
				agentId: session.agentId,
				backend: session.backend,
				canInterrupt: running && runtime.attached.has(session.id),
				// why: words reach every Session that has not ended — one that is
				// listening takes them now, one whose process was reclaimed is woken
				// by them — so the only Session the admiral cannot speak to is one
				// there is nothing left to wake.
				canSend: status === "open",
				// why: rest is offered only to a Session that is genuinely at rest,
				// and the act is withheld rather than shown disabled — there is
				// nothing the admiral could do about a tree still at work, so an
				// unavailable control would only be a question with no answer.
				canSleep: sessionAtRest({
					delegating: runtime.delegating.has(session.id),
					presence,
				}),
				cwd: session.cwd,
				diag: {
					current: pointers.get(session.agentId) === session.id,
					execution: executionStatus,
					intents: attribution.sessions.get(session.id) ?? [],
				},
				id: session.id,
				presence,
				retirable: sessionRetirable(presence),
				status,
			};
		}),
	);
