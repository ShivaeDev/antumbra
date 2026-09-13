import { answered, it } from "@antumbra/app-testing/entry.ts";
import { pending } from "@antumbra/domain-sessions/queries/pending.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { expect } from "vitest";
import { crewed, opened, VOYAGE } from "#test/switches/kit.ts";

const CAPTAIN = Request.make("captain");
const HAIL = Request.make("hail");

it.app("a hail from an agent waits on the hail-wake switch before the captain is told", function* (app) {
	const { atWork } = yield* crewed(app);
	yield* opened(app);
	yield* app.api.agents.hail({ by: "admiral", requestId: CAPTAIN, voyageId: VOYAGE });
	const { sessionId } = yield* atWork(CAPTAIN, 0);
	yield* app.api.settings.setFlag({ key: "wakeOnHail", on: false });
	const watching = yield* app.live(pending, {});
	yield* app.api.agents.hail({ by: "agent", requestId: HAIL, voyageId: VOYAGE });
	expect(yield* answered(app.api.sessions.operations({ sessionId }))).toMatchObject([{ kind: "wake", reason: "hail", status: "requested" }]);
	yield* app.settle();
	expect((yield* watching.seen).at(-1)).toEqual([]);
	expect((yield* answered(app.api.holds.queues({}))).queues).toMatchObject([{ setting: "wakeOnHail", held: true, waiting: [{ title: "captain" }] }]);
	yield* app.api.settings.setFlag({ key: "wakeOnHail", on: true });
	yield* app.settle();
	expect((yield* watching.seen).at(-1)).toMatchObject([{ kind: "wake", reason: "hail", gatedBy: "wakeOnHail" }]);
});
