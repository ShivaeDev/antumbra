import type { BackendFailure, SessionAudit, SessionCensus } from "@antumbra/plugin-api";
import { Effect, RcRef } from "effect";
import type { CodexServer } from "#server.ts";
import { censusOf, censusUnreadable } from "#thread-census.ts";
import { sweepSpawnedDescendants } from "#thread-sweep.ts";

const sweepOn = (server: RcRef.RcRef<CodexServer, BackendFailure>, rootRef: string) =>
	Effect.scoped(
		Effect.gen(function* () {
			const live = yield* RcRef.get(server);
			const sweep = yield* sweepSpawnedDescendants(live.request, rootRef);
			for (const child of sweep) {
				live.threads.claim(rootRef, child.threadId);
			}
			return sweep;
		}),
	);

// Reconnect waits on provider-storage reads; bound them so a stalled read cannot
// hold message delivery indefinitely. A timeout is unreadable, never an empty census.
const CENSUS_PATIENCE_MILLIS = 20_000;

const census = (
	server: RcRef.RcRef<CodexServer, BackendFailure>,
	rootRef: string,
	admitted: (nodeRef: string) => boolean,
): Effect.Effect<SessionCensus> =>
	sweepOn(server, rootRef).pipe(
		Effect.map((sweep) => censusOf(admitted, sweep)),
		Effect.catch((failure: BackendFailure) =>
			Effect.logWarning("codex could not be asked for a census", {
				detail: failure.detail,
			}).pipe(Effect.as(censusUnreadable(rootRef, failure.detail))),
		),
		Effect.timeoutOrElse({
			duration: CENSUS_PATIENCE_MILLIS,
			orElse: () =>
				Effect.logWarning("codex did not answer a census in time", {
					rootRef,
				}).pipe(Effect.as(censusUnreadable(rootRef, "codex did not answer in time"))),
		}),
	);

export const codexAudit = (server: RcRef.RcRef<CodexServer, BackendFailure>): SessionAudit => ({
	census: (request) => census(server, request.rootRef, request.admitted),
	// Codex has no passive second transcript; rereading resumes and mutates the
	// thread, so node completeness comes from the journal's existing gaps.
	node: () => Effect.succeed([]),
});
