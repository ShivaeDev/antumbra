import { type App, it } from "@antumbra/app-testing/entry.ts";
import { ScriptedHost } from "@antumbra/app-testing/host.ts";
import { connectRunner } from "@antumbra/app-testing/runner.ts";
import { PieceId } from "@antumbra/domain-pieces/ids.ts";
import { RepoId } from "@antumbra/domain-repos/ids.ts";
import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import type { Observation } from "@antumbra/platform-vocabulary/change-host.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Effect, Fiber } from "effect";
import { expect } from "vitest";

const voyageId = VoyageId.make("voyage:reef");
const pieceId = PieceId.make("piece:reef");
const repoId = RepoId.make("repo:reef");
const source = "https://github.com/example/reef.git";
const proposal = { repo: "reef", title: "Soundings reach the chart", body: "Why?\n\nThe eastern shoal is uncharted." };
const seen = (branch: string, headSha: string): Observation => ({
	repoId,
	externalId: "41",
	activityAt: 2000,
	baseRef: "main",
	headRef: branch,
	headSha,
	isDraft: false,
	checks: "green",
	review: "approved",
	mergeable: "clean",
	stage: "open",
	raw: { state: "open" },
	title: proposal.title,
	url: "https://github.com/example/reef/pull/41",
});

const berthed = Effect.fn("test.berthed")(function* (app: App) {
	yield* app.api.voyages.open({
		captainBackend: null,
		captainEffort: null,
		captainModel: null,
		context: "Sound the reef",
		crewBackend: "claude",
		crewEffort: null,
		crewModel: null,
		kind: "voyage",
		name: "Reef",
		northStar: "Every shoal is known",
		requestId: Request.make(voyageId),
	});
	yield* app.api.pieces.charter({
		charter: "Sound the reef",
		dependsOn: [],
		expectation: "Soundings",
		requestId: Request.make(pieceId),
		role: "crew",
		title: "Soundings",
		voyageId,
	});
	yield* app.api.repos.register({ requestId: Request.make(repoId), source, defaultRef: "main" });
	const runner = yield* connectRunner({ runnerId: "runner", logId: "log", backends: ["claude"], imageInputBackends: [] });
	yield* app.api.pieces.launch({ id: pieceId });
	const planning = yield* runner.next;
	if (planning.type !== "Plan") return yield* Effect.die(`the crew asked for ${planning.type} instead of a moorage plan`);
	const branch = `work/${planning.agentId}/reef`;
	yield* runner.reply(planning.requestId, {
		type: "MooragePlanned",
		plan: { root: "/moorage", berths: [{ slug: "reef", source, ref: "main", branch, path: "/moorage/reef" }] },
	});
	const provisioning = yield* runner.next;
	if (provisioning.type !== "Provision") return yield* Effect.die(`the crew asked for ${provisioning.type} instead of provisioning`);
	yield* runner.reply(provisioning.requestId, { type: "Accepted" });
	const starting = yield* runner.next;
	if (starting.type !== "Start") return yield* Effect.die(`the crew asked for ${starting.type} instead of a session start`);
	yield* runner.reply(starting.requestId, { type: "Accepted" });
	const logged = { requestId: starting.requestId, sessionId: starting.sessionId };
	yield* runner.append([
		{
			logId: "log",
			cursor: 0,
			at: 0,
			event: {
				type: "SessionStarted",
				...logged,
				agentId: starting.options.agentId,
				backend: starting.options.backend,
				cwd: starting.options.cwd,
				nativeRef: "native",
				runnerId: "runner",
				toolSetVersion: starting.options.toolSet.version,
			},
		},
		{ logId: "log", cursor: 1, at: 0, event: { type: "InputAccepted", ...logged, inputId: starting.charter.id } },
	]);
	return {
		branch,
		evidence: { branch, headSha: "sha-1", workingDiff: "", workingTreeStatus: "", worktreePath: "/moorage/reef" },
		runner,
		sessionId: starting.sessionId,
	};
});

it.app("refuses to open a change once the berth has left its work branch", function* (app) {
	const { branch, evidence, runner, sessionId } = yield* berthed(app);
	const submitting = yield* Effect.forkChild(runner.tool({ sessionId, callId: "submit", name: "submit_change", input: { repo: "reef" } }));
	const first = yield* runner.next;
	expect(first.type).toBe("CaptureChange");
	yield* runner.reply(first.requestId, { type: "ChangeCaptured", evidence });
	expect(yield* Fiber.join(submitting)).toMatchObject({ ok: true });
	const opening = yield* Effect.forkChild(runner.tool({ sessionId, callId: "open", name: "open_change", input: proposal }));
	const second = yield* runner.next;
	expect(second.type).toBe("CaptureChange");
	yield* runner.reply(second.requestId, { type: "ChangeCaptured", evidence: { ...evidence, branch: "soundings" } });
	const answer = yield* Fiber.join(opening);
	expect(answer.ok).toBe(false);
	expect(answer.text).toContain(
		`This berth is on soundings, but Antumbra provisioned it on ${branch} and opens the change from there. Check out ${branch}, bring your commits over, and try again.`,
	);
});

it.app("signs the body it opens with one trailer line", function* (app) {
	const { branch, evidence, runner, sessionId } = yield* berthed(app);
	const host = yield* ScriptedHost;
	const opening = yield* Effect.forkChild(runner.tool({ sessionId, callId: "open", name: "open_change", input: proposal }));
	const capture = yield* runner.next;
	yield* runner.reply(capture.requestId, { type: "ChangeCaptured", evidence });
	const push = yield* runner.next;
	expect(push.type).toBe("PushChange");
	yield* runner.reply(push.requestId, { type: "Accepted" });
	const pending = yield* host.nextOpen;
	expect(pending.request.body).toBe(`${proposal.body}\n\nOpened through Antumbra`);
	yield* pending.accept(seen(branch, "sha-1"));
	expect(yield* Fiber.join(opening)).toMatchObject({ ok: true });
});

it.app("publishes the commits the berth gained after the change was first submitted", function* (app) {
	const { branch, evidence, runner, sessionId } = yield* berthed(app);
	const host = yield* ScriptedHost;
	const submitting = yield* Effect.forkChild(runner.tool({ sessionId, callId: "submit", name: "submit_change", input: { repo: "reef" } }));
	const first = yield* runner.next;
	yield* runner.reply(first.requestId, { type: "ChangeCaptured", evidence });
	expect(yield* Fiber.join(submitting)).toMatchObject({ ok: true });
	const opening = yield* Effect.forkChild(runner.tool({ sessionId, callId: "open", name: "open_change", input: proposal }));
	const second = yield* runner.next;
	yield* runner.reply(second.requestId, { type: "ChangeCaptured", evidence: { ...evidence, headSha: "sha-2" } });
	const push = yield* runner.next;
	expect(push).toMatchObject({ type: "PushChange", headSha: "sha-2" });
	yield* runner.reply(push.requestId, { type: "Accepted" });
	const pending = yield* host.nextOpen;
	expect(pending.request.headSha).toBe("sha-2");
	yield* pending.accept(seen(branch, "sha-2"));
	expect(yield* Fiber.join(opening)).toMatchObject({ ok: true });
});

it.app("leaves the body unsigned when the fleet turns the signature off", function* (app) {
	const { branch, evidence, runner, sessionId } = yield* berthed(app);
	const host = yield* ScriptedHost;
	yield* app.api.settings.setFlag({ key: "signChanges", on: false });
	const opening = yield* Effect.forkChild(runner.tool({ sessionId, callId: "open", name: "open_change", input: proposal }));
	const capture = yield* runner.next;
	yield* runner.reply(capture.requestId, { type: "ChangeCaptured", evidence });
	const push = yield* runner.next;
	yield* runner.reply(push.requestId, { type: "Accepted" });
	const pending = yield* host.nextOpen;
	expect(pending.request.body).toBe(proposal.body);
	yield* pending.accept(seen(branch, "sha-1"));
	expect(yield* Fiber.join(opening)).toMatchObject({ ok: true });
});
