import { SessionInputRpc } from "@antumbra/domain-inputs/commands/submit.ts";
import { Token } from "@antumbra/platform-rpc/token.ts";
import type { Effect } from "effect";
import * as RpcClient from "effect/unstable/rpc/RpcClient";
export const inputsClient = RpcClient.make(SessionInputRpc.middleware(Token));
export type InputsClient = Effect.Success<typeof inputsClient>;
