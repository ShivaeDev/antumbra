import type { FactValue } from "@antumbra/platform-feature/fact.ts";
import { fact } from "@antumbra/platform-feature/fact.ts";
import { row } from "@antumbra/platform-feature/row.ts";
import { ChangeRefresh } from "@antumbra/platform-vocabulary/changes.ts";
import { ChangeRefreshRequestedPayload } from "@antumbra/platform-vocabulary/changes-event.ts";
import { Effect } from "effect";
import { Records } from "#records.ts";
export const changeRefresh = row("changeRefresh", ChangeRefresh.fields, { key: "id" });
export const refreshRequested = fact("ChangeRefreshRequested", ChangeRefreshRequestedPayload.fields);
export const refreshRequestedMaterializer = Effect.fn("changes.refreshRequested")(function* (
	fact: FactValue<typeof refreshRequested>,
): Effect.fn.Return<void, never, Records> {
	const rows = yield* Records;

	if (
		yield* rows.changeRefresh.count({ where: { id: "changes" } }).pipe(
			Effect.map((count) => count > 0),
			Effect.orDie,
		)
	)
		yield* rows.changeRefresh.updateVoid({ ...{ request: fact.request }, id: "changes" }).pipe(Effect.orDie);
	else yield* rows.changeRefresh.insertVoid({ id: "changes", request: fact.request }).pipe(Effect.orDie);
});
