import { AgentId } from "@antumbra/domain-agents/ids.ts";
import { PieceId } from "@antumbra/domain-pieces/ids.ts";
import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { titled } from "@antumbra/platform-feature/edit.ts";
import { extending } from "@antumbra/platform-feature/extension.ts";
import { AgentBackendTagSchema } from "@antumbra/platform-vocabulary/agent-backend.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Schema } from "effect";
import * as Rpc from "effect/unstable/rpc/Rpc";
import * as RpcGroup from "effect/unstable/rpc/RpcGroup";
import { starts } from "#feature.ts";

export const Spawn = Schema.Struct({
	requestId: Request,
	backend: AgentBackendTagSchema.annotate({ title: "Backend" }),
	role: titled(Schema.NonEmptyString, { title: "Role" }),
	charter: titled(Schema.NonEmptyString, { title: "Charter", multiline: true }),
	model: Schema.optionalKey(Schema.NullOr(Schema.String)),
	effort: Schema.optionalKey(Schema.NullOr(Schema.String)),
});
export type Spawn = typeof Spawn.Type;
export class StartFailure extends Schema.TaggedError<StartFailure>()("StartFailure", { message: Schema.String }) {}
export const BirthReceipt = Schema.Struct({ requestId: Request, agentId: AgentId });
export const StartsRpc = extending(
	starts,
	RpcGroup.make(
		Rpc.make("spawn", { payload: Spawn, success: BirthReceipt, error: StartFailure }),
		Rpc.make("hail", { payload: { requestId: Request, voyageId: VoyageId }, success: BirthReceipt, error: StartFailure }),
		Rpc.make("workNow", { payload: { requestId: Request, pieceId: PieceId }, success: BirthReceipt, error: StartFailure }),
	),
);
