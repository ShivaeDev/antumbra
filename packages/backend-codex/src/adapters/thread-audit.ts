import type {
	BackendFailure,
	SessionAudit,
	SessionCensus,
} from "@antumbra/plugin-api";
import { Effect, RcRef } from "effect";
import { openAuditConnection } from "#adapters/audit-connection.ts";
import type { LineProcess } from "#adapters/process.ts";
import type { CodexServer } from "#server.ts";
import { censusOf, censusUnreadable } from "#thread-census.ts";
import { type CensusSweep, sweepSpawnedDescendants } from "#thread-sweep.ts";

// why: a thread the sweep names as this root's descendant belongs to this root
// whether or not the census admits it — claiming is what keeps another session
// from reading it as its own and what keeps every attach seam refusing it.
// Admission is the narrower question the census answers afterwards, and the
// claim is made on the live connection because that is where the sessions that
// could otherwise take the thread are running.
const claimAll = (
	server: RcRef.RcRef<CodexServer, BackendFailure>,
	rootRef: string,
	sweep: CensusSweep,
) =>
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

// why: the sweep runs on a connection of its own, opened for the question and
// closed with it. Its scope is the audit, so a child cannot outlive the reading
// it was spawned for however the reading ends.
const sweepOn = (spawn: () => LineProcess, rootRef: string) =>
	Effect.scoped(
		openAuditConnection(spawn).pipe(
			Effect.flatMap((connection) =>
				sweepSpawnedDescendants(connection.request, rootRef),
			),
		),
	);

// why: the sweep spawns a process of its own and waits on it. The reconnect
// census runs inside the attachment a resume is opening, so one that never
// comes back holds the admiral's words behind it. A census that could not be
// taken in time is the same fact as one that could not be taken, and it is
// said the same way — as a gap, never as an empty reading.
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
				}).pipe(
					Effect.as(censusUnreadable(rootRef, "codex did not answer in time")),
				),
		}),
	);

export const codexAudit = (
	server: RcRef.RcRef<CodexServer, BackendFailure>,
	spawn: () => LineProcess,
): SessionAudit => ({
	census: (request) => census(server, spawn, request.rootRef, request.admitted),
	// why: codex keeps no second account of one thread's own lines that this
	// lane may read passively — the thread's stream was the account, and asking
	// for it again would mean resuming the thread, which is the one thing an
	// audit never does. There is nothing to compare, so a node's completeness
	// rests on the gaps its journal already carries.
	node: () => Effect.succeed([]),
});
