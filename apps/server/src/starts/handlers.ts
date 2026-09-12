import { StartsRpc } from "@antumbra/domain-starts/commands/submit.ts";
import { Token } from "@antumbra/platform-rpc/token.ts";
import { hail } from "#starts/hail.ts";
import { spawn } from "#starts/spawn.ts";
import { workNow } from "#starts/work.ts";

export const servingStarts = StartsRpc.middleware(Token).toLayer({ "starts.spawn": spawn, "starts.hail": hail, "starts.workNow": workNow });
