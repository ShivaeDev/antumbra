import { adopt } from "@antumbra/domain-changes/commands/adopt.ts";
import { failAdoption } from "@antumbra/domain-changes/commands/adoption-failed.ts";
import { archive } from "@antumbra/domain-changes/commands/archive.ts";
import { dismiss } from "@antumbra/domain-changes/commands/dismiss.ts";
import { forwardFeedback } from "@antumbra/domain-changes/commands/forward-feedback.ts";
import { freeze } from "@antumbra/domain-changes/commands/freeze.ts";
import { observeHostCapability } from "@antumbra/domain-changes/commands/host-capability.ts";
import { observe } from "@antumbra/domain-changes/commands/observe.ts";
import { prepare } from "@antumbra/domain-changes/commands/prepare.ts";
import { failPublication } from "@antumbra/domain-changes/commands/publication-failed.ts";
import { refresh } from "@antumbra/domain-changes/commands/refresh.ts";
import { requestAdoption } from "@antumbra/domain-changes/commands/request-adoption.ts";
import { retryAdoption } from "@antumbra/domain-changes/commands/retry-adoption.ts";
import { command } from "@shivaedev/contract/operation.ts";
import { Schema } from "effect";
export const FailAdoption = command("failAdoption", {
	payload: failAdoption.Input,
	success: Schema.Number,
	rejections: failAdoption.Rejection,
	invalidates: () => [],
});
export const RetryAdoption = command("retryAdoption", {
	payload: retryAdoption.Input,
	success: Schema.Number,
	rejections: retryAdoption.Rejection,
	invalidates: () => [],
});
export const ObserveHostCapability = command("observeHostCapability", {
	payload: observeHostCapability.Input,
	success: Schema.Number,
	rejections: observeHostCapability.Rejection,
	invalidates: () => [],
});
export const FailPublication = command("failPublication", {
	payload: failPublication.Input,
	success: Schema.Number,
	rejections: failPublication.Rejection,
	invalidates: () => [],
});
export const Refresh = command("refresh", { payload: refresh.Input, success: Schema.Number, rejections: refresh.Rejection, invalidates: () => [] });
export const RequestAdoption = command("requestAdoption", {
	payload: requestAdoption.Input,
	success: Schema.Number,
	rejections: requestAdoption.Rejection,
	invalidates: () => [],
});
export const Prepare = command("prepare", { payload: prepare.Input, success: Schema.Number, rejections: prepare.Rejection, invalidates: () => [] });
export const Freeze = command("freeze", { payload: freeze.Input, success: Schema.Number, rejections: freeze.Rejection, invalidates: () => [] });
export const Observe = command("observe", { payload: observe.Input, success: Schema.Number, rejections: observe.Rejection, invalidates: () => [] });
export const Adopt = command("adopt", { payload: adopt.Input, success: Schema.Number, rejections: adopt.Rejection, invalidates: () => [] });
export const Archive = command("archive", { payload: archive.Input, success: Schema.Number, rejections: archive.Rejection, invalidates: () => [] });
export const Dismiss = command("dismiss", { payload: dismiss.Input, success: Schema.Number, rejections: dismiss.Rejection, invalidates: () => [] });
export const ForwardFeedback = command("forwardFeedback", {
	payload: forwardFeedback.Input,
	success: Schema.Number,
	rejections: forwardFeedback.Rejection,
	invalidates: () => [],
});
