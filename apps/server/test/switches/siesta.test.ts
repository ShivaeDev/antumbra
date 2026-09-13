import { answered, eventually, it } from "@antumbra/app-testing/entry.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { expect } from "vitest";
import { crewed } from "#test/switches/kit.ts";

const LONE = Request.make("lone");

it.app("an idle agent stays awake while the siesta switch is off, and is put to sleep when it goes back on", function* (app) {
	const { atWork } = yield* crewed(app);
	yield* app.api.settings.setCount({ key: "idleSiestaMinutes", count: 1 });
	yield* app.api.settings.setFlag({ key: "sendToSiesta", on: false });
	yield* app.api.agents.spawn({ requestId: LONE, role: "crew", backend: "claude", model: null, effort: null });
	const { sessionId } = yield* atWork(LONE, 0);
	yield* app.clock.advance(61_000);
	expect(yield* answered(app.api.sessions.operations({ sessionId }), "the session's operations to be listed")).toEqual([]);
	yield* app.api.settings.setFlag({ key: "sendToSiesta", on: true });
	const slept = yield* eventually(app.api.sessions.operations({ sessionId }), (operations) => operations.length === 1, "one operation");
	expect(slept).toMatchObject([{ kind: "sleep" }]);
});
