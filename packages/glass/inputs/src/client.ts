import { InputsRpc } from "@antumbra/domain-inputs/commands/submit.ts";
import { dialing, type Reach } from "@antumbra/glass-client/serving.ts";
import { Token } from "@antumbra/platform-rpc/token.ts";
import { Effect } from "effect";
import * as RpcClient from "effect/unstable/rpc/RpcClient";
export const inputsClient = (reach: Reach) => RpcClient.make(InputsRpc.middleware(Token)).pipe(Effect.provide(dialing(reach)));
export type InputsClient = Effect.Success<ReturnType<typeof inputsClient>>;
