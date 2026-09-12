import { LifecycleRpc } from "@antumbra/domain-lifecycle/commands/restart.ts";
import * as RpcTest from "effect/unstable/rpc/RpcTest";

export const lifecycleClient = RpcTest.makeClient(LifecycleRpc, { flatten: true });
