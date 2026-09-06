import type { SessionSituation } from "@antumbra/contract";
import type { StoredAgentSession } from "@antumbra/persistence";
import { sessionAtRest, sessionRetirable } from "@antumbra/sessions";
import { decodeSessionExecutionStatus, decodeStoredAgentSessionStatus, sessionPresence } from "@antumbra/vocabulary/agent-runtime.ts";
import { Effect } from "effect";
import type { IntentAttribution } from "#sight-diagnostics.ts";

export interface FleetRuntime {
	readonly attached: ReadonlySet<string>;
	readonly delegating: ReadonlySet<string>;
}

export const sessionSummary = (
	session: StoredAgentSession,
	imageInputBackends: ReadonlySet<string>,
	runtime: FleetRuntime,
	attribution: IntentAttribution,
	pointers: ReadonlyMap<string, string | null>,
	situations: ReadonlyMap<string, ReadonlyArray<SessionSituation>>,
) =>
	Effect.all({
		executionStatus: Effect.fromResult(decodeSessionExecutionStatus(session.id, session.executionStatus)),
		status: Effect.fromResult(decodeStoredAgentSessionStatus(session.id, session.status)),
	}).pipe(
		Effect.map(({ executionStatus, status }) => {
			const running = status === "open" && executionStatus === "active";
			const presence = sessionPresence({
				attached: runtime.attached.has(session.id),
				executionStatus,
				open: status === "open",
			});
			return {
				addressable: status === "open" ? (situations.get(session.agentId) ?? []) : [],
				agentId: session.agentId,
				backend: session.backend,
				canAttachImages: imageInputBackends.has(session.backend),
				canInterrupt: running && runtime.attached.has(session.id),
				canSend: status === "open",
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
