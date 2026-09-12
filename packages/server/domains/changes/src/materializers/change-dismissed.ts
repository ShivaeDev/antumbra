import { materializer } from "@antumbra/platform-feature/materializer.ts";
import { Effect } from "effect";
import { changeDismissed } from "#facts/change-dismissed.ts";
import { changeVerdict } from "#rows/change-verdict.ts";
export const changeDismissedMaterializer = materializer(changeDismissed, {
	writes: [changeVerdict],
	run: Effect.fn("changes.changeDismissed")(function* (fact, rows) {
		if (!(yield* rows.changeVerdict.exists(fact.changeId)))
			yield* rows.changeVerdict.insert({ changeId: fact.changeId, verdict: "dismissed", landedAt: new Date(fact.at).toISOString() });
	}),
});
