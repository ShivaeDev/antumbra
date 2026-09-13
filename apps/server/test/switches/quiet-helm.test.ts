import { answered, eventually, it } from "@antumbra/app-testing/entry.ts";
import { pendingOperations } from "@antumbra/domain-agents/queries/pending-operations.ts";
import { hailWords } from "@antumbra/platform-prompts/hail.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { expect } from "vitest";
import { chartered, crewed, opened, PIECE, VOYAGE } from "#test/switches/kit.ts";
import { hailCaptain } from "#tools/voyages/hail.ts";

const CREW = Request.make("crew");
const CAPTAIN = Request.make("captain");
const MAIL = Request.make("mail");
const PARKED = Request.make("parked");
const STOPPING = Request.make("stopping");
const HAND = { agentId: "hand", sessionId: "hand-root", callId: "hail" };

it.app("an agent's hail to a quieted voyage's captain lands as mail", function* (app) {
	const { atWork } = yield* crewed(app);
	yield* opened(app);
	yield* app.api.agents.hail({ by: "admiral", requestId: CAPTAIN, voyageId: VOYAGE });
	const captain = yield* atWork(CAPTAIN, 0);
	yield* app.api.voyages.quiet({ id: VOYAGE });
	const answer = yield* hailCaptain.invoke(HAND, { voyageId: VOYAGE });
	expect(answer.ok).toBe(true);
	expect(yield* answered(app.api.mail.mailbox({ agentId: captain.agentId }), "the captain's mailbox")).toMatchObject([{ body: hailWords }]);
	yield* app.settle();
	expect(yield* answered(app.api.sessions.operations({ sessionId: captain.sessionId }), "the captain's operations")).toEqual([]);
});

it.app("the admiral's hail wakes a quieted voyage's captain and leaves the voyage quiet", function* (app) {
	const { atWork } = yield* crewed(app);
	yield* opened(app);
	yield* app.api.agents.hail({ by: "admiral", requestId: CAPTAIN, voyageId: VOYAGE });
	const captain = yield* atWork(CAPTAIN, 0);
	yield* app.api.voyages.quiet({ id: VOYAGE });
	yield* app.api.agents.hail({ by: "admiral", requestId: Request.make("second"), voyageId: VOYAGE });
	const woken = yield* eventually(app.api.sessions.operations({ sessionId: captain.sessionId }), (held) => held.length === 1, "the admiral's wake");
	expect(woken).toMatchObject([{ kind: "wake", reason: "hail" }]);
	expect(yield* answered(app.api.voyages.byId({ id: VOYAGE }), "the voyage to be read")).toMatchObject({ quietedAt: expect.any(String) });
});

it.app("a hail parked behind its switch stays parked when the voyage goes quiet", function* (app) {
	const { atWork } = yield* crewed(app);
	yield* opened(app);
	yield* app.api.agents.hail({ by: "admiral", requestId: CAPTAIN, voyageId: VOYAGE });
	const captain = yield* atWork(CAPTAIN, 0);
	yield* app.api.settings.setFlag({ key: "wakeOnHail", on: false });
	const watching = yield* app.live(pendingOperations, {});
	yield* app.api.agents.hail({ by: "agent", requestId: PARKED, voyageId: VOYAGE });
	yield* app.api.voyages.quiet({ id: VOYAGE });
	yield* app.api.settings.setFlag({ key: "wakeOnHail", on: true });
	yield* app.settle();
	expect((yield* watching.seen).at(-1)).toEqual([]);
	expect(yield* answered(app.api.sessions.operations({ sessionId: captain.sessionId }), "the captain's operations")).toMatchObject([
		{ kind: "wake", reason: "hail", status: "requested" },
	]);

	yield* app.api.voyages.resume({ id: VOYAGE });
	yield* app.settle();
	expect((yield* watching.seen).at(-1)).toMatchObject([{ kind: "wake", reason: "hail", gatedBy: "wakeOnHail" }]);
});

it.app("the admiral's hail spawns a captain for a quiet voyage that has none", function* (app) {
	const { atWork } = yield* crewed(app);
	yield* opened(app);
	yield* app.api.voyages.quiet({ id: VOYAGE });
	yield* app.api.agents.hail({ by: "admiral", requestId: CAPTAIN, voyageId: VOYAGE });
	yield* atWork(CAPTAIN, 0);
	const births = yield* answered(app.api.agents.births({}), "the births to be listed");
	expect(births.filter((born) => born.voyageId === VOYAGE)).toMatchObject([{ role: "captain", source: "direct", admittedAt: expect.any(String) }]);
	expect(yield* answered(app.api.voyages.byId({ id: VOYAGE }), "the voyage to be read")).toMatchObject({ quietedAt: expect.any(String) });
});

it.app("resuming a voyage leaves a session the admiral stopped stopped", function* (app) {
	const { atWork } = yield* crewed(app);
	yield* opened(app);
	yield* chartered(app);
	yield* app.api.agents.workNow({ requestId: CREW, pieceId: PIECE });
	const crew = yield* atWork(CREW, 0);
	yield* app.api.sessions.stop({
		requestId: STOPPING,
		sessionId: crew.sessionId,
		reason: "the reef is closed",
		requestedAt: new Date(0).toISOString(),
	});
	yield* app.api.voyages.quiet({ id: VOYAGE });
	yield* app.api.mail.send({
		authorAgentId: null,
		body: "the bar has shifted",
		precedence: "priority",
		requestId: MAIL,
		toAgentId: crew.agentId,
	});
	yield* app.api.voyages.resume({ id: VOYAGE });
	yield* app.settle();
	expect(yield* answered(app.api.sessions.reading({ id: crew.sessionId }), "the session to be read")).toMatchObject({
		stoppedAt: expect.any(String),
	});
	const operations = yield* answered(app.api.sessions.operations({ sessionId: crew.sessionId }), "the stopped session's operations");
	expect(operations.filter((operation) => operation.kind === "wake")).toEqual([]);
});
