import { Schema } from "effect";

export const Repo = Schema.Struct({ ref: Schema.String, slug: Schema.String, source: Schema.String });
export const Berth = Schema.Struct({ ...Repo.fields, branch: Schema.String, path: Schema.String });
export const Moorage = Schema.Struct({ root: Schema.String, berths: Schema.Array(Berth) });
export type Moorage = typeof Moorage.Type;
export type Berth = typeof Berth.Type;
export const ChangeEvidence = Schema.Struct({
	branch: Schema.String,
	headSha: Schema.String,
	workingDiff: Schema.String,
	workingTreeStatus: Schema.String,
	worktreePath: Schema.String,
});
export type ChangeEvidence = typeof ChangeEvidence.Type;
export const Provision = Schema.Struct({ type: Schema.Literal("Provision"), requestId: Schema.String, agentId: Schema.String, plan: Moorage });
export const Reclaim = Schema.Struct({ type: Schema.Literal("Reclaim"), requestId: Schema.String, agentId: Schema.String, berth: Berth });
export const Scrap = Schema.Struct({ type: Schema.Literal("Scrap"), requestId: Schema.String, agentId: Schema.String, berth: Berth });
export const CaptureChange = Schema.Struct({ type: Schema.Literal("CaptureChange"), requestId: Schema.String, agentId: Schema.String, berth: Berth });
export const PushChange = Schema.Struct({
	type: Schema.Literal("PushChange"),
	requestId: Schema.String,
	agentId: Schema.String,
	berth: Berth,
	headSha: Schema.String,
});
