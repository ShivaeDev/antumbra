import { TranscriptRpc } from "@antumbra/domain-sessions/queries/transcript-rpc.ts";
import { Owner } from "@antumbra/platform-access/policy.ts";
import type { Effect } from "effect";
import * as RpcClient from "effect/rpc/RpcClient";

export const sessionsClient = RpcClient.make(TranscriptRpc.middleware(Owner));
export type SessionsClient = Effect.Success<typeof sessionsClient>;
