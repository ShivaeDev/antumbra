import { InputsRpc } from "@antumbra/domain-inputs/rpc.ts";
import { dialing, type Reach } from "@antumbra/glass-client/serving.ts";
import { Effect } from "effect";
import * as RpcClient from "effect/unstable/rpc/RpcClient";
export const inputsClient = (reach: Reach) => RpcClient.make(InputsRpc).pipe(Effect.provide(dialing(reach)));
export type InputsClient = Effect.Success<ReturnType<typeof inputsClient>>;
