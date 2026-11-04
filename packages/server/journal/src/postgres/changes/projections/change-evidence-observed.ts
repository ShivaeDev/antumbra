import type { ChangesEvent } from "@antumbra/platform-vocabulary/changes-event.ts";
import { Effect } from "effect";
import type { rows } from "#postgres/changes/rows.ts";

type Rows = Effect.Success<typeof rows>;
export const projectChangeEvidenceObserved = (rows: Rows) =>
	Effect.fn("ChangesHistory.projectChangeEvidenceObserved")(function* (
		fact: Extract<typeof ChangesEvent.Type, { readonly _tag: "ChangeEvidenceObserved" }>,
	) {
		yield* clear(rows)();
		yield* replace(rows)(fact);
		yield* replaceOwners(rows)(fact);
	});
const clear = (rows: Rows) =>
	Effect.fn("ChangesHistory.clearEvidence")(function* () {
		for (const row of yield* rows.agent.where({})) yield* rows.agent.delete(row.id);
		for (const row of yield* rows.berth.where({})) yield* rows.berth.delete(row.id);
		for (const row of yield* rows.moorage.where({})) yield* rows.moorage.delete(row.agentId);
		for (const row of yield* rows.session.where({})) yield* rows.session.delete(row.id);
		for (const row of yield* rows.pieceAgent.where({})) yield* rows.pieceAgent.delete(row.id);
		for (const row of yield* rows.voyageActivity.where({})) yield* rows.voyageActivity.delete(row.id);
		for (const row of yield* rows.voyageCaptainWork.where({})) yield* rows.voyageCaptainWork.delete(row.id);
	});
const replace = (rows: Rows) =>
	Effect.fn("ChangesHistory.replaceEvidence")(function* (fact: Extract<typeof ChangesEvent.Type, { readonly _tag: "ChangeEvidenceObserved" }>) {
		for (const row of fact.agents) yield* rows.agent.insert(row);
		for (const row of fact.berths) yield* rows.berth.insert(row);
		for (const row of fact.moorages) yield* rows.moorage.insert(row);
		for (const row of fact.sessions) yield* rows.session.insert(row);
		for (const row of fact.assignments) yield* rows.pieceAgent.insert(row);
		for (const row of fact.activities) yield* rows.voyageActivity.insert(row);
		for (const row of fact.captains) yield* rows.voyageCaptainWork.insert(row);
	});

const replaceOwners = (rows: Rows) =>
	Effect.fn("ChangesHistory.replaceOwners")(function* (fact: Extract<typeof ChangesEvent.Type, { readonly _tag: "ChangeEvidenceObserved" }>) {
		for (const owner of yield* rows.resourceOwner.where({})) yield* rows.resourceOwner.delete(owner.agentId);
		for (const owner of fact.owners) yield* rows.resourceOwner.insert(owner);
	});
