import { materializer } from "@antumbra/platform-feature/materializer.ts";
import { Effect, Option } from "effect";
import { observed } from "#facts/observed.ts";
import { activity } from "#materializers/observation-activity.ts";
import { attribute } from "#materializers/observation-attribute.ts";
import { settle } from "#materializers/observation-settle.ts";
import { start } from "#materializers/observation-start.ts";
import { tools } from "#materializers/observation-tools.ts";
import { tree } from "#materializers/observation-tree.ts";
import { writes } from "#materializers/observation-types.ts";
export const observedMaterializer = materializer(observed, {
	writes,
	run: Effect.fn("sessions.observed")(function* (fact, rows) {
		yield* start(fact, rows);
		if (fact.evidence.type === "started") return;
		const root = yield* rows.session.find(fact.sessionId);
		if (Option.isNone(root)) return;
		const nodes = yield* rows.session.where({ rootSessionId: root.value.rootSessionId });
		const current = yield* attribute(fact, rows, root.value, nodes);
		yield* tree(fact, rows, current, nodes);
		yield* activity(fact, rows, current, nodes);
		yield* tools(fact, rows, current);
		yield* settle(fact, rows, current);
	}),
});
