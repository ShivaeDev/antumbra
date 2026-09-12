import { AdmiralRpc } from "@antumbra/domain-starts/commands/submit.ts";
import { Token } from "@antumbra/platform-rpc/token.ts";
import { hail } from "#starts/hail.ts";
import { spawn } from "#starts/spawn.ts";
import { workNow } from "#starts/work.ts";

export const servingAdmiral = AdmiralRpc.middleware(Token).toLayer({ "admiral.spawn": spawn, "admiral.hail": hail, "admiral.workNow": workNow });
