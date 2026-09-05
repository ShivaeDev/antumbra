import { it } from "@antumbra/persistence/testing";
import { expect } from "@effect/vitest";
import { Effect } from "effect";
import { ensureBerthResourcesUnclaimed, ensureBranchResourcesUnclaimed } from "#resource-reclaim-guard.ts";

const berth = (id: string, source: string, branch: string) => ({
	agentId: id,
	branch,
	id,
	path: `/work/${id}`,
	ref: "main",
	runner: "local",
	slug: id,
	source,
	status: "ready",
});

it.effectDB("branch guards select both source and branch while missing resources do not block", function* (db) {
	yield* db.Berth.create(berth("matching", "reef", "work"));
	yield* db.Berth.create({ ...berth("other-source", "shore", "work"), reclaimState: "claimed" });
	yield* db.Berth.create({ ...berth("other-branch", "reef", "other"), reclaimState: "claimed" });
	yield* ensureBranchResourcesUnclaimed("reef", "work");
	yield* ensureBranchResourcesUnclaimed("empty", "work");
	yield* ensureBerthResourcesUnclaimed("missing");
});

it.effectDB("branch and single-Berth guards report the Berth claim before its Moorage claim", function* (db) {
	yield* db.Berth.create({ ...berth("held", "reef", "work"), id: "held-berth" });
	yield* db.Moorage.create({ agentId: "held", reclaimState: "claimed", root: "/work/held", runner: "local", status: "ready" });
	expect(yield* Effect.flip(ensureBranchResourcesUnclaimed("reef", "work"))).toMatchObject({
		_tag: "ResourceReclaimClaimed",
		agentId: "held",
		resourceId: "held",
	});
	yield* db.Berth.where({ id: "held-berth" }).update({ reclaimState: "claimed" });
	for (const guard of [ensureBranchResourcesUnclaimed("reef", "work"), ensureBerthResourcesUnclaimed("held-berth")]) {
		expect(yield* Effect.flip(guard)).toMatchObject({ _tag: "ResourceReclaimClaimed", agentId: "held", resourceId: "held-berth" });
	}
});
