import { admit as sourceAdmit } from "@antumbra/domain-agents/commands/admit.ts";
import { cancel as sourceCancel } from "@antumbra/domain-agents/commands/cancel.ts";
import { delay as sourceDelay } from "@antumbra/domain-agents/commands/delay.ts";
import { hail as sourceHail } from "@antumbra/domain-agents/commands/hail.ts";
import { hold as sourceHold } from "@antumbra/domain-agents/commands/hold.ts";
import { request as sourceRequest } from "@antumbra/domain-agents/commands/request.ts";
import { retire as sourceRetire } from "@antumbra/domain-agents/commands/retire.ts";
import { retireCrew as sourceRetireCrew } from "@antumbra/domain-agents/commands/retire-crew.ts";
import { retry as sourceRetry } from "@antumbra/domain-agents/commands/retry.ts";
import { smooth as sourceSmooth } from "@antumbra/domain-agents/commands/smooth.ts";
import { spawn as sourceSpawn } from "@antumbra/domain-agents/commands/spawn.ts";
import { workNow as sourceWorkNow } from "@antumbra/domain-agents/commands/work-now.ts";
import { AlreadyDone } from "@antumbra/platform-feature/rejection.ts";
import { command } from "@shivaedev/contract/operation.ts";
import { Schema } from "effect";
export const Delay = command("delay", {
	payload: sourceDelay.Input,
	success: Schema.Number,
	rejections: { ...sourceDelay.Rejection, AlreadyDone },
	invalidates: () => [],
});
export const Cancel = command("cancel", {
	payload: sourceCancel.Input,
	success: Schema.Number,
	rejections: { ...sourceCancel.Rejection, AlreadyDone },
	invalidates: () => [],
});
export const Retry = command("retry", {
	payload: sourceRetry.Input,
	success: Schema.Number,
	rejections: { ...sourceRetry.Rejection, AlreadyDone },
	invalidates: () => [],
});
export const Smooth = command("smooth", {
	payload: sourceSmooth.Input,
	success: Schema.Number,
	rejections: { ...sourceSmooth.Rejection, AlreadyDone },
	invalidates: () => [],
});
export const RetireCrew = command("retireCrew", {
	payload: sourceRetireCrew.Input,
	success: Schema.Number,
	rejections: { ...sourceRetireCrew.Rejection, AlreadyDone },
	invalidates: () => [],
});
export const Retire = command("retire", {
	payload: sourceRetire.Input,
	success: Schema.Number,
	rejections: { ...sourceRetire.Rejection, AlreadyDone },
	invalidates: () => [],
});
export const Spawn = command("spawn", {
	payload: sourceSpawn.Input,
	success: Schema.Number,
	rejections: { ...sourceSpawn.Rejection, AlreadyDone },
	invalidates: () => [],
});
export const Hail = command("hail", {
	payload: sourceHail.Input,
	success: Schema.Number,
	rejections: { ...sourceHail.Rejection, AlreadyDone },
	invalidates: () => [],
});
export const WorkNow = command("workNow", {
	payload: sourceWorkNow.Input,
	success: Schema.Number,
	rejections: { ...sourceWorkNow.Rejection, AlreadyDone },
	invalidates: () => [],
});
export const Request = command("request", {
	payload: sourceRequest.Input,
	success: Schema.Number,
	rejections: { ...sourceRequest.Rejection, AlreadyDone },
	invalidates: () => [],
});
export const Admit = command("admit", {
	payload: sourceAdmit.Input,
	success: Schema.Number,
	rejections: { ...sourceAdmit.Rejection, AlreadyDone },
	invalidates: () => [],
});
export const Hold = command("hold", {
	payload: sourceHold.Input,
	success: Schema.Number,
	rejections: { ...sourceHold.Rejection, AlreadyDone },
	invalidates: () => [],
});
