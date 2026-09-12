import { answered, it } from "@antumbra/app-testing/entry.ts";
import { connectRunner } from "@antumbra/app-testing/runner.ts";
import { AgentId } from "@antumbra/domain-agents/ids.ts";
import { RepoId } from "@antumbra/domain-repos/ids.ts";
import { SessionId } from "@antumbra/domain-sessions/ids.ts";
import { StartId } from "@antumbra/domain-starts/ids.ts";
import * as Id from "@antumbra/platform-vocabulary/id.ts";
import { expect } from "vitest";
import { chartering, opening, pieceOf, reef } from "#test/kit.ts";

it.app("a pending Change keeps a reported Piece landing until the host lands it", function* (app) {
	yield* app.api.voyages.open(opening);
	yield* app.api.pieces.charter(chartering("soundings"));
	const pieceId = pieceOf("soundings");
	yield* app.api.pieces.launch({ id: pieceId });
	const repoId = RepoId.make("repo:reef");
	yield* app.api.repos.register({
		requestId: Id.Request.make(repoId),
		source: "https://github.com/example/reef.git",
		defaultRef: "main",
	});
	const observation = {
		repoId,
		externalId: "41",
		activityAt: 1000,
		baseRef: "main",
		headRef: "work/reef",
		headSha: "sha-1",
		isDraft: false,
		checks: "green",
		review: "approved",
		mergeable: "clean",
		stage: "open",
		raw: {},
		title: "Survey",
		url: "https://github.com/example/reef/pull/41",
	} as const;
	yield* app.api.changes.adopt({
		requestId: Id.Request.make("change:reef"),
		pieceId,
		repoId,
		agentId: null,
		host: "github",
		observation,
		observedAt: new Date(2000).toISOString(),
	});
	yield* app.api.reports.land({ pieceId, authorAgentId: null, title: "Survey", body: "The work is ready for review" });
	expect(yield* answered(app.api.pieces.progress({ id: pieceId }))).toMatchObject({ state: "landing", settledDone: false, concluded: false });
	yield* app.api.changes.observe({
		host: "github",
		observation: { ...observation, stage: "landed", activityAt: 3000 },
		attachment: { _tag: "Observed" },
		observedAt: new Date(4000).toISOString(),
	});
	expect(yield* answered(app.api.pieces.progress({ id: pieceId }))).toMatchObject({ state: "done", settledDone: true, concluded: true });
});

it.app("working evidence stays active while settled outcomes release dependents", function* (app) {
	yield* app.api.voyages.open(opening);
	yield* app.api.pieces.charter(chartering("soundings"));
	yield* app.api.pieces.charter(chartering("charts", [pieceOf("soundings")]));
	yield* app.api.pieces.launch({ id: pieceOf("soundings") });
	yield* app.api.pieces.launch({ id: pieceOf("charts") });
	yield* app.api.starts.request({
		requestId: Id.Request.make("birth:surveyor"),
		agentId: AgentId.make("surveyor"),
		sessionId: SessionId.make("session:surveyor"),
		voyageId: reef,
		pieceId: pieceOf("soundings"),
		backend: "claude",
		model: null,
		effort: null,
		role: "hand",
		charter: "Survey the reef",
		source: "direct",
		toolSetVersion: "1",
		tools: [],
	});
	expect(yield* answered(app.api.pieces.progress({ id: pieceOf("soundings") }))).toMatchObject({ state: "active", eligible: true });
	yield* app.api.reports.land({ pieceId: pieceOf("soundings"), authorAgentId: null, title: "Survey", body: "The soundings are charted" });
	expect(yield* answered(app.api.pieces.progress({ id: pieceOf("soundings") }))).toMatchObject({
		state: "active",
		settledDone: true,
		concluded: false,
		eligible: false,
	});
	expect(yield* answered(app.api.pieces.progress({ id: pieceOf("charts") }))).toMatchObject({ state: "ready" });
	expect(yield* answered(app.api.voyages.progress({ id: reef }))).toMatchObject({
		state: "underWay",
		concluded: false,
		counts: { active: 1, ready: 1 },
	});
	yield* app.api.starts.admit({ id: StartId.make("birth:surveyor") });
	const runner = yield* connectRunner({ runnerId: "runner", logId: "log", backends: ["claude"], imageInputBackends: [] });
	const identity = { sessionId: "session:surveyor", requestId: "birth:surveyor" };
	yield* runner.append([
		{
			logId: "log",
			cursor: 0,
			at: 100,
			event: {
				type: "SessionStarted",
				...identity,
				agentId: "surveyor",
				backend: "claude",
				cwd: "/berth",
				nativeRef: "native",
				runnerId: "runner",
				toolSetVersion: "1",
			},
		},
		{ logId: "log", cursor: 1, at: 101, event: { type: "InputAccepted", ...identity, inputId: "charter" } },
	]);
	expect(yield* answered(app.api.agents.canRetireCrew({ pieceId: pieceOf("soundings") }))).toBe(false);
	yield* runner.append([
		{
			logId: "log",
			cursor: 2,
			at: 102,
			event: {
				type: "ProviderEvent",
				observation: "live",
				sessionId: identity.sessionId,
				event: { type: "session.state", state: "idle", raw: { source: "test-runner", kind: "provider", payload: "{}" } },
			},
		},
	]);
	expect(yield* answered(app.api.pieces.progress({ id: pieceOf("soundings") }))).toMatchObject({ state: "done", concluded: true });
	expect(yield* answered(app.api.agents.canRetireCrew({ pieceId: pieceOf("soundings") }))).toBe(true);
	yield* app.api.agents.retireCrew({ pieceId: pieceOf("soundings") });
	expect(yield* answered(app.api.agents.byPiece({ pieceId: pieceOf("soundings") }))).toMatchObject([{ id: "surveyor", status: "retired" }]);
});
