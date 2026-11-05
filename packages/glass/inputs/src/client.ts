import { InputsRpc } from "@antumbra/domain-inputs/commands/submit.ts";
import { Owner } from "@antumbra/platform-access/policy.ts";
import type { Effect } from "effect";
import * as RpcClient from "effect/rpc/RpcClient";
export const inputsClient = RpcClient.make(InputsRpc.middleware(Owner));
export type InputsClient = Effect.Success<typeof inputsClient>;
