import type { StoredAgentSession } from "@antumbra/persistence";
import type { SessionAudit, SessionCensus } from "@antumbra/plugin-api";
import type { AgentEvent } from "@antumbra/vocabulary/session-events";
import { Effect, Option, Ref } from "effect";
import { SessionTreeAudits } from "#tree/audit/service.ts";
import { type Censused, settleCensusedWork } from "#tree/census.ts";
import { SessionTreeLedger } from "#tree/ledger/service.ts";
import { SessionTreeRows } from "#tree/rows/service.ts";

type RecordEvent = (event: AgentEvent) => Effect.Effect<boolean, unknown>;

export const makeSessionTreeSweeps = Effect.gen(function* () {
	const audits = yield* SessionTreeAudits;
	const ledger = yield* SessionTreeLedger;
	const rows = yield* SessionTreeRows;
	return (lane: SessionAudit, rootSessionId: string, censused: Censused) =>
		Effect.gen(function* () {
			const taking = yield* Ref.make(false);
			const said = yield* Ref.make<ReadonlySet<string>>(new Set());
			const unsaid = (found: ReadonlyArray<AgentEvent>) =>
				Ref.modify(said, (before) => {
					const fresh = found.filter((event) => !before.has(event.raw.payload));
					return [fresh, new Set([...before, ...fresh.map((event) => event.raw.payload)])] as const;
				});
			const once = <E>(take: Effect.Effect<void, E>) =>
				Effect.gen(function* () {
					if (yield* Ref.get(taking)) {
						return;
					}
					yield* Ref.set(taking, true);
					yield* take.pipe(Effect.ensuring(Ref.set(taking, false)));
				});
			const settled = (root: StoredAgentSession, found: SessionCensus) =>
				found.nodes.length === 0 ? Effect.void : Effect.flatMap(ledger.nodeRows(root.id), (rows) => settleCensusedWork(rows, found.nodes, censused));
			const take = (root: StoredAgentSession, rootRef: string, record: RecordEvent) =>
				Effect.gen(function* () {
					const known = yield* ledger.nodeRows(root.id);
					const admitted = new Set(known.flatMap((row) => (row.nativeRef === null ? [] : [row.nativeRef])));
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
				root.nativeRef === null ? Effect.void : once(take(root, root.nativeRef, record));
			const root = () => rows.rootRow(rootSessionId);
			const closed = (sessionId: string, record: RecordEvent) =>
				Effect.gen(function* () {
					const found = yield* root();
					if (Option.isNone(found)) {
						return;
					}
					const node = yield* ledger.nodeById(found.value.id, sessionId);
					if (Option.isSome(node)) {
						yield* audits.audit(lane, found.value, node.value);
					}
					yield* census(found.value, record);
				});
			const reconnected = (record: RecordEvent) =>
				Effect.gen(function* () {
					const found = yield* root();
					if (Option.isNone(found)) {
						return;
					}
					yield* census(found.value, record);
					const stale = yield* ledger.awaitingAudit(found.value.id);
					yield* Effect.forEach(stale, (node) => audits.audit(lane, found.value, node), { concurrency: 1, discard: true });
				});
			return { closed, reconnected };
		});
});
