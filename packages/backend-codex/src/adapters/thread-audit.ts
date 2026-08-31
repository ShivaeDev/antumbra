import type { BackendFailure, SessionAudit, SessionCensus } from "@antumbra/plugin-api";
import { Effect, RcRef } from "effect";
import { openAuditConnection } from "#adapters/audit-connection.ts";
import type { LineProcess } from "#adapters/process.ts";
import type { CodexServer } from "#server.ts";
import { censusOf, censusUnreadable } from "#thread-census.ts";
import { type CensusSweep, sweepSpawnedDescendants } from "#thread-sweep.ts";

const claimAll = (server: RcRef.RcRef<CodexServer, BackendFailure>, rootRef: string, sweep: CensusSweep) =>
	Effect.scoped(
		RcRef.get(server).pipe(
			Effect.flatMap((live) =>
				Effect.sync(() => {
					for (const child of sweep) {
						live.threads.claim(rootRef, child.threadId);
					}
				}),
			),
		),
	).pipe(
		Effect.catch((failure: BackendFailure) =>
			Effect.logWarning("the threads a census found could not be claimed", {
				detail: failure.detail,
			}),
		),
	);

const sweepOn = (spawn: () => LineProcess, rootRef: string) =>
	Effect.scoped(openAuditConnection(spawn).pipe(Effect.flatMap((connection) => sweepSpawnedDescendants(connection.request, rootRef))));

// Reconnect waits on provider-storage reads; bound them so a stalled read cannot
// hold message delivery indefinitely. A timeout is unreadable, never an empty census.
const CENSUS_PATIENCE_MILLIS = 20_000;

const census = (
	server: RcRef.RcRef<CodexServer, BackendFailure>,
	spawn: () => LineProcess,
	rootRef: string,
	admitted: (nodeRef: string) => boolean,
): Effect.Effect<SessionCensus> =>
	sweepOn(spawn, rootRef).pipe(
		Effect.tap((sweep) => claimAll(server, rootRef, sweep)),
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

export const codexAudit = (server: RcRef.RcRef<CodexServer, BackendFailure>, spawn: () => LineProcess): SessionAudit => ({
	census: (request) => census(server, spawn, request.rootRef, request.admitted),
	// Codex has no passive second transcript; rereading resumes and mutates the
	// thread, so node completeness comes from the journal's existing gaps.
	node: () => Effect.succeed([]),
});
