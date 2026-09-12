import { TranscriptRpc } from "@antumbra/domain-sessions/queries/transcript-rpc.ts";
import { StartsRpc } from "@antumbra/domain-starts/commands/submit.ts";
import { dialing, type Reach } from "@antumbra/glass-client/serving.ts";
import { Token } from "@antumbra/platform-rpc/token.ts";
import { Effect } from "effect";
import * as RpcClient from "effect/unstable/rpc/RpcClient";

export const sessionsClient = (reach: Reach) => RpcClient.make(TranscriptRpc.merge(StartsRpc).middleware(Token)).pipe(Effect.provide(dialing(reach)));
export type SessionsClient = Effect.Success<ReturnType<typeof sessionsClient>>;
