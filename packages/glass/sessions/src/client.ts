import { TranscriptRpc } from "@antumbra/domain-sessions/queries/transcript-rpc.ts";
import { Token } from "@antumbra/platform-rpc/token.ts";
import type { Effect } from "effect";
import * as RpcClient from "effect/unstable/rpc/RpcClient";

export const sessionsClient = RpcClient.make(TranscriptRpc.middleware(Token));
export type SessionsClient = Effect.Success<typeof sessionsClient>;
