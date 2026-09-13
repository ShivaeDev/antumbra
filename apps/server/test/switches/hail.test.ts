import { answered, eventually, it } from "@antumbra/app-testing/entry.ts";
import { pending } from "@antumbra/domain-sessions/queries/pending.ts";
import { mailWords } from "@antumbra/platform-prompts/mail.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { expect } from "vitest";
import { crewed, opened, VOYAGE } from "#test/switches/kit.ts";

const CAPTAIN = Request.make("captain");
const HAIL = Request.make("hail");
const MAIL = Request.make("mail");

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

it.app("a hail waiting on its switch does not keep the captain from its mail", function* (app) {
	const { atWork } = yield* crewed(app);
	yield* opened(app);
	yield* app.api.agents.hail({ by: "admiral", requestId: CAPTAIN, voyageId: VOYAGE });
	const { agentId, sessionId } = yield* atWork(CAPTAIN, 0);
	yield* app.api.settings.setFlag({ key: "wakeOnHail", on: false });
	yield* app.api.agents.hail({ by: "agent", requestId: HAIL, voyageId: VOYAGE });
	yield* app.api.mail.send({
		authorAgentId: null,
		body: "the reef is closed to deep draught",
		precedence: "priority",
		requestId: MAIL,
		toAgentId: agentId,
	});
	const operations = yield* eventually(app.api.sessions.operations({ sessionId }), (held) => held.length === 2);
	expect(operations.filter((operation) => operation.gatedBy === null)).toMatchObject([
		{ kind: "wake", reason: mailWords({ count: 1, precedence: "priority" }) },
	]);
});
