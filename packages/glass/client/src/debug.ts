import { DebugRpc } from "@antumbra/platform-rpc/debug.ts";
import { Token } from "@antumbra/platform-rpc/token.ts";
import { Effect } from "effect";
import * as RpcClient from "effect/unstable/rpc/RpcClient";

export const debugClient = Effect.map(RpcClient.make(DebugRpc.middleware(Token)), (client) => client["debug.rebuildProjections"]());
