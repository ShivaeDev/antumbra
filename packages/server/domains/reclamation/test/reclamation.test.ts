import { answered, it } from "@antumbra/app-testing/entry.ts";
import { AgentId } from "@antumbra/domain-agents/ids.ts";
import { SessionId } from "@antumbra/domain-sessions/ids.ts";
import * as Id from "@antumbra/platform-vocabulary/id.ts";
import { Effect } from "effect";
import { expect } from "vitest";
import { berthId, reclaimRequestId } from "#ids.ts";

it.app("reclaims retired resources without removing the Agent", function* (app) {
	const agentId = AgentId.make(Id.make());
	yield* app.api.starts.request({
		agentId,
		sessionId: SessionId.make(Id.make()),
		voyageId: null,
		pieceId: null,
		backend: "claude",
		model: null,
		effort: null,
		role: "worker",
		source: "direct",
		charter: "Inspect the repository",
		toolSetVersion: "1",
		tools: [],
	});
	yield* app.api.reclamation.plan({
		agentId,
		runner: "local",
		plan: { root: "/moorage", berths: [{ slug: "repo", source: "/repo", ref: "main", branch: "work/test", path: "/moorage/repo" }] },
	});
	yield* app.api.reclamation.ready({ agentId });
	expect(yield* answered(app.api.reclamation.candidates({}))).toEqual([]);
	yield* app.api.agents.retire({ id: agentId });
	expect(yield* answered(app.api.reclamation.candidates({}))).toMatchObject([{ agentId }]);
	const claim = Id.Request.make(Id.make());
	const claimRequestId = reclaimRequestId(claim, berthId(agentId, "repo"));
	yield* app.commit.reclamation.claim({ agentId, requestId: claim });
	yield* app.api.reclamation.reclaimed({ id: berthId(agentId, "repo"), claimRequestId });
	expect(yield* answered(app.api.reclamation.berths({ agentId }))).toMatchObject([
		{ status: "reclaimed", reclaimState: null, reclaimRequestId: null, strandedAt: null },
	]);
	expect(yield* answered(app.api.agents.byId({ id: agentId }))).toMatchObject({ status: "retired" });
});

it.app("keeps dirty resources claimed and rejects an obsolete result", function* (app) {
	const agentId = AgentId.make(Id.make());
	yield* app.api.starts.request({
		agentId,
		sessionId: SessionId.make(Id.make()),
		voyageId: null,
		pieceId: null,
		backend: "claude",
		model: null,
		effort: null,
		role: "worker",
		source: "direct",
		charter: "Inspect the repository",
		toolSetVersion: "1",
		tools: [],
	});
	yield* app.api.reclamation.plan({
		agentId,
		runner: "local",
		plan: { root: "/moorage", berths: [{ slug: "repo", source: "/repo", ref: "main", branch: "work/test", path: "/moorage/repo" }] },
	});
	yield* app.api.agents.retire({ id: agentId });
	const id = berthId(agentId, "repo");
	const firstCommand = Id.Request.make(Id.make());
	const first = reclaimRequestId(firstCommand, id);
	yield* app.commit.reclamation.claim({ agentId, requestId: firstCommand });
	yield* app.api.reclamation.held({ id, claimRequestId: first, reason: "Unpushed commits" });
	expect(yield* answered(app.api.reclamation.berths({ agentId }))).toMatchObject([{ status: "stranded", reclaimState: "claimed" }]);
	const nextCommand = Id.Request.make(Id.make());
	const next = reclaimRequestId(nextCommand, id);
	yield* app.commit.reclamation.claim({ agentId, requestId: nextCommand });
	const stale = yield* Effect.flip(app.api.reclamation.reclaimed({ id, claimRequestId: first }));
	expect(stale._tag).toBe("StaleClaim");
	expect(yield* answered(app.api.reclamation.berths({ agentId }))).toMatchObject([{ status: "stranded", reclaimRequestId: next }]);
	yield* app.api.reclamation.reclaimed({ id, claimRequestId: next });
	expect(yield* answered(app.api.reclamation.berths({ agentId }))).toMatchObject([{ status: "reclaimed", strandedAt: null }]);
});
