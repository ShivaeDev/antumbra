import { command } from "@antumbra/platform-feature/command.ts";
import { fact } from "@antumbra/platform-feature/fact.ts";
import { materializer } from "@antumbra/platform-feature/materializer.ts";
import { row } from "@antumbra/platform-feature/row.ts";
import { ChangeRefresh } from "@antumbra/platform-vocabulary/changes.ts";
import { ChangeRefreshRequestedPayload } from "@antumbra/platform-vocabulary/changes-event.ts";
import { Effect } from "effect";
export const changeRefresh = row("changeRefresh", ChangeRefresh.fields, { key: "id" });
export const refreshRequested = fact("ChangeRefreshRequested", ChangeRefreshRequestedPayload.fields);
export const refresh = command("refresh", {
	input: {},
	reads: [],
	emits: refreshRequested,
	rejections: {},
	run: (input) => Effect.succeed({ request: input.requestId }),
});
export const refreshRequestedMaterializer = materializer(refreshRequested, {
	writes: [changeRefresh],
	run: Effect.fn("changes.refreshRequested")(function* (fact, rows) {
		if (yield* rows.changeRefresh.exists("changes")) yield* rows.changeRefresh.update("changes", { request: fact.request });
		else yield* rows.changeRefresh.insert({ id: "changes", request: fact.request });
	}),
});
