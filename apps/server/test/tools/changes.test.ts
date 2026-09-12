import { type App, it } from "@antumbra/app-testing/entry.ts";
import { ScriptedHost } from "@antumbra/app-testing/host.ts";
import { connectRunner } from "@antumbra/app-testing/runner.ts";
import { identity } from "@antumbra/domain-agents/ids.ts";
import { PieceId } from "@antumbra/domain-pieces/ids.ts";
import { RepoId } from "@antumbra/domain-repos/ids.ts";
import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import type { Observation } from "@antumbra/platform-vocabulary/change-host.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Effect, Fiber } from "effect";
import { expect } from "vitest";
import { openChangeTool } from "#tools/changes/handlers.ts";

const voyageId = VoyageId.make("voyage:reef");
const pieceId = PieceId.make("piece:reef");
const repoId = RepoId.make("repo:reef");
const source = "https://github.com/example/reef.git";
const spawning = { requestId: Request.make("agent:reef"), role: "crew", backend: "claude", model: null, effort: null } as const;
const { agentId, sessionId } = identity(spawning.requestId);
const branch = `work/${agentId}/reef`;
const context = { agentId, sessionId, callId: "open-change", pieceId, voyageId };
const proposal = { repo: "reef", title: "Soundings reach the chart", body: "Why?\n\nThe eastern shoal is uncharted." };
const evidence = { branch, headSha: "sha-1", workingDiff: "", workingTreeStatus: "", worktreePath: "/moorage/reef" };
const observation: Observation = {
	repoId,
	externalId: "41",
	activityAt: 2000,
	baseRef: "main",
	headRef: branch,
	headSha: "sha-1",
	isDraft: false,
	checks: "green",
	review: "approved",
	mergeable: "clean",
	stage: "open",
	raw: { state: "open" },
	title: proposal.title,
	url: "https://github.com/example/reef/pull/41",
};

const berthed = Effect.fn("test.berthed")(function* (app: App) {
	yield* app.api.voyages.open({
		captainBackend: null,
		captainEffort: null,
		captainModel: null,
		context: "Sound the reef",
		crewBackend: null,
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
		role: "hand",
		title: "Soundings",
		voyageId,
	});
	yield* app.api.repos.register({ requestId: Request.make(repoId), source, defaultRef: "main" });
	const runner = yield* connectRunner({ runnerId: "runner", logId: "log", backends: ["claude"], imageInputBackends: [] });
	yield* app.api.agents.spawn(spawning);
	const planning = yield* runner.next;
	expect(planning.type).toBe("Plan");
	yield* runner.reply(planning.requestId, {
		type: "MooragePlanned",
		plan: { root: "/moorage", berths: [{ slug: "reef", source, ref: "main", branch, path: "/moorage/reef" }] },
	});
	const provisioning = yield* runner.next;
	expect(provisioning.type).toBe("Provision");
	yield* runner.reply(provisioning.requestId, { type: "Accepted" });
	const starting = yield* runner.next;
	expect(starting.type).toBe("Start");
	yield* runner.reply(starting.requestId, { type: "Accepted" });
	return runner;
});

it.app("refuses to open a change from a branch the berth was not provisioned on", function* (app) {
	const runner = yield* berthed(app);
	const opening = yield* Effect.forkChild(openChangeTool.invoke(context, proposal));
	const capture = yield* runner.next;
	expect(capture.type).toBe("CaptureChange");
	yield* runner.reply(capture.requestId, { type: "ChangeCaptured", evidence: { ...evidence, branch: "soundings" } });
	const answer = yield* Fiber.join(opening);
	expect(answer.ok).toBe(false);
	expect(answer.text).toContain(
		`This berth is on soundings, but Antumbra provisioned it on ${branch} and opens the change from there. Check out ${branch}, bring your commits over, and try again.`,
	);
});

it.app("signs the body it opens with one trailer line", function* (app) {
	const runner = yield* berthed(app);
	const host = yield* ScriptedHost;
	const opening = yield* Effect.forkChild(openChangeTool.invoke(context, proposal));
	const capture = yield* runner.next;
	yield* runner.reply(capture.requestId, { type: "ChangeCaptured", evidence });
	const push = yield* runner.next;
	expect(push.type).toBe("PushChange");
	yield* runner.reply(push.requestId, { type: "Accepted" });
	const pending = yield* host.nextOpen;
	expect(pending.request.body).toBe(`${proposal.body}\n\nOpened through Antumbra`);
	yield* pending.accept(observation);
	expect(yield* Fiber.join(opening)).toMatchObject({ ok: true });
});

it.app("leaves the body unsigned when the fleet turns the signature off", function* (app) {
	const runner = yield* berthed(app);
	const host = yield* ScriptedHost;
	yield* app.api.settings.setFlag({ key: "signChanges", on: false });
	const opening = yield* Effect.forkChild(openChangeTool.invoke(context, proposal));
	const capture = yield* runner.next;
	yield* runner.reply(capture.requestId, { type: "ChangeCaptured", evidence });
	const push = yield* runner.next;
	yield* runner.reply(push.requestId, { type: "Accepted" });
	const pending = yield* host.nextOpen;
	expect(pending.request.body).toBe(proposal.body);
	yield* pending.accept(observation);
	expect(yield* Fiber.join(opening)).toMatchObject({ ok: true });
});
