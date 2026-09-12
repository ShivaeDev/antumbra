import { LifecycleRpc } from "@antumbra/platform-runner/lifecycle.ts";
import * as RpcTest from "effect/unstable/rpc/RpcTest";

export const lifecycleClient = RpcTest.makeClient(LifecycleRpc, { flatten: true });
