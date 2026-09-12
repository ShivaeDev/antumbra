import { Berth, Moorage, Repo } from "@antumbra/platform-vocabulary/resources.ts";
import { Schema } from "effect";

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

export const Plan = Schema.Struct({ type: Schema.Literal("Plan"), requestId: Schema.String, agentId: Schema.String, repos: Schema.Array(Repo) });
