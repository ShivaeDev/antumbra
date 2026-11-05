import { Owner } from "@antumbra/platform-access/policy.ts";
import { DebugRpc } from "@antumbra/platform-feature/debug.ts";
import { Effect } from "effect";
import * as RpcClient from "effect/rpc/RpcClient";

export const debugClient = Effect.map(RpcClient.make(DebugRpc.middleware(Owner)), (client) => client["debug.rebuildProjections"]());
