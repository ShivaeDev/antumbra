import { answered, it } from "@antumbra/app-testing/entry.ts";
import { AgentId } from "@antumbra/domain-agents/ids.ts";
import { RepoId } from "@antumbra/domain-repos/ids.ts";
import { SessionId } from "@antumbra/domain-sessions/ids.ts";
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
		name: "reef",
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
});
