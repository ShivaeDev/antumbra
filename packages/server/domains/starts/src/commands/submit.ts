import { AgentId } from "@antumbra/domain-agents/ids.ts";
import { PieceId } from "@antumbra/domain-pieces/ids.ts";
import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { Token } from "@antumbra/platform-rpc/token.ts";
import { AgentBackendTagSchema } from "@antumbra/platform-vocabulary/agent-backend.ts";
import { AgentRoleSchema } from "@antumbra/platform-vocabulary/agent-role.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Schema } from "effect";
import * as Rpc from "effect/unstable/rpc/Rpc";
import * as RpcGroup from "effect/unstable/rpc/RpcGroup";

export const Spawn = Schema.Struct({
	requestId: Request,
	backend: AgentBackendTagSchema.annotate({ title: "Backend" }),
	role: AgentRoleSchema.annotate({ title: "Role" }),
	charter: Schema.String.annotate({ title: "Charter" }),
	model: Schema.optionalKey(Schema.NullOr(Schema.String)),
	effort: Schema.optionalKey(Schema.NullOr(Schema.String)),
});
export type Spawn = typeof Spawn.Type;
export class StartFailure extends Schema.TaggedError<StartFailure>()("StartFailure", { message: Schema.String }) {}
export const BirthReceipt = Schema.Struct({ requestId: Request, agentId: AgentId });
export const StartsRpc = RpcGroup.make(
	Rpc.make("starts.spawn", { payload: Spawn, success: BirthReceipt, error: StartFailure }),
	Rpc.make("starts.hail", { payload: { requestId: Request, voyageId: VoyageId }, success: BirthReceipt, error: StartFailure }),
	Rpc.make("starts.workNow", { payload: { requestId: Request, pieceId: PieceId }, success: BirthReceipt, error: StartFailure }),
).middleware(Token);
