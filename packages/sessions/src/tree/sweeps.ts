import type { StoredAgentSession } from "@antumbra/persistence";
import type { SessionAudit, SessionCensus } from "@antumbra/plugin-api";
import type { AgentEvent } from "@antumbra/vocabulary/session-events";
import { Effect, Option, Ref } from "effect";
import { makeSessionTreeAudits } from "#tree/audit.ts";
import { type Censused, settleCensusedWork } from "#tree/census.ts";
import { makeSessionTreeLedger } from "#tree/ledger.ts";
import { makeSessionTreeRows } from "#tree/rows.ts";

type RecordEvent = (event: AgentEvent) => Effect.Effect<boolean>;

// why: when the record audits. A node is audited as it closes, and again at the
// reconnect that follows a life where nothing was listening; the census that
// asks whether any node was missed entirely runs at both moments too.
export const makeSessionTreeSweeps = Effect.gen(function* () {
	const audits = yield* makeSessionTreeAudits;
	const ledger = yield* makeSessionTreeLedger;
	const rows = yield* makeSessionTreeRows;
	return (lane: SessionAudit, rootSessionId: string, censused: Censused) =>
		Effect.gen(function* () {
			const taking = yield* Ref.make(false);
			const said = yield* Ref.make<ReadonlySet<string>>(new Set());
			// why: a census is taken at every close and reads the same storage each
			// time, so the same finding would be written down once per node that
			// ended. What this life already said it does not say again — a later
			// life reads afresh, because by then the answer may have changed.
			const unsaid = (found: ReadonlyArray<AgentEvent>) =>
				Ref.modify(said, (before) => {
					const fresh = found.filter((event) => !before.has(event.raw.payload));
					return [
						fresh,
						new Set([...before, ...fresh.map((event) => event.raw.payload)]),
					] as const;
				});
			// why: a census admits nodes through the same path a frame takes, and
			// admitting one closes it — which would ask for a census again. The
			// second one has nothing left to find, so it is never taken: what a
			// census admitted is not itself a reason to take another.
			const once = (take: Effect.Effect<void>) =>
				Effect.gen(function* () {
					if (yield* Ref.get(taking)) {
						return;
					}
					yield* Ref.set(taking, true);
					yield* take.pipe(Effect.ensuring(Ref.set(taking, false)));
				});
			// why: the rows are read again rather than reused, because a child this
			// census just admitted has one now that it did not have when the reading
			// began — and that child is the whole reason a census is taken.
			const settled = (root: StoredAgentSession, found: SessionCensus) =>
				found.nodes.length === 0
					? Effect.void
					: Effect.flatMap(ledger.nodeRows(root.id), (rows) =>
							settleCensusedWork(rows, found.nodes, censused),
						);
			const take = (
				root: StoredAgentSession,
				rootRef: string,
				record: RecordEvent,
			) =>
				Effect.gen(function* () {
					const known = yield* ledger.nodeRows(root.id);
					const admitted = new Set(
						known.flatMap((row) =>
							row.nativeRef === null ? [] : [row.nativeRef],
						),
					);
					const found = yield* lane.census({
						admitted: (nodeRef) => admitted.has(nodeRef),
						cwd: root.cwd,
						rootRef,
					});
					yield* Effect.forEach(yield* unsaid(found.events), record, {
						concurrency: 1,
						discard: true,
					});
					yield* settled(root, found);
				});
			const census = (root: StoredAgentSession, record: RecordEvent) =>
				root.nativeRef === null
					? Effect.void
					: once(take(root, root.nativeRef, record));
			const root = () => rows.rootRow(rootSessionId);
			const closed = (sessionId: string, record: RecordEvent) =>
				Effect.gen(function* () {
					const found = yield* root();
					if (Option.isNone(found)) {
						return;
					}
					const nodes = yield* ledger.nodeRows(found.value.id);
					const node = nodes.find((row) => row.id === sessionId);
					if (node !== undefined) {
						yield* audits.audit(lane, found.value, node);
					}
					yield* census(found.value, record);
				});
			// why: a node that closed while nothing was listening never had its
			// close-time audit and still says "recording" for work that stopped long
			// ago. Reconnecting is the first moment the provider can be asked again.
			const reconnected = (record: RecordEvent) =>
				Effect.gen(function* () {
					const found = yield* root();
					if (Option.isNone(found)) {
						return;
					}
					yield* census(found.value, record);
					const nodes = yield* ledger.nodeRows(found.value.id);
					const stale = nodes.filter(
						(node) =>
							node.status === "closed" && node.completeness === "recording",
					);
					yield* Effect.forEach(
						stale,
						(node) => audits.audit(lane, found.value, node),
						{ concurrency: 1, discard: true },
					);
				});
			return { closed, reconnected };
		});
});
