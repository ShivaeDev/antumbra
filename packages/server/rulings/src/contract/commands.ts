import { acknowledgeNotice as sourceAcknowledgeNotice } from "@antumbra/domain-rulings/commands/acknowledge-notice.ts";
import { addContext as sourceAddContext } from "@antumbra/domain-rulings/commands/add-context.ts";
import { answer as sourceAnswer } from "@antumbra/domain-rulings/commands/answer.ts";
import { gate as sourceGate } from "@antumbra/domain-rulings/commands/gate.ts";
import { markDelivered as sourceMarkDelivered } from "@antumbra/domain-rulings/commands/mark-delivered.ts";
import { park as sourcePark } from "@antumbra/domain-rulings/commands/park.ts";
import { passUp as sourcePassUp } from "@antumbra/domain-rulings/commands/pass-up.ts";
import { proclaim as sourceProclaim } from "@antumbra/domain-rulings/commands/proclaim.ts";
import { reclassify as sourceReclassify } from "@antumbra/domain-rulings/commands/reclassify.ts";
import { request as sourceRequest } from "@antumbra/domain-rulings/commands/request.ts";
import { supersede as sourceSupersede } from "@antumbra/domain-rulings/commands/supersede.ts";
import { withdraw as sourceWithdraw } from "@antumbra/domain-rulings/commands/withdraw.ts";
import { AlreadyDone } from "@antumbra/platform-feature/rejection.ts";
import { command } from "@shivaedev/contract/operation.ts";
import { Schema } from "effect";
export const Reclassify = command("reclassify", {
	payload: sourceReclassify.Input,
	success: Schema.Number,
	rejections: { ...sourceReclassify.Rejection, AlreadyDone },
	invalidates: () => [],
});
export const Request = command("request", {
	payload: sourceRequest.Input,
	success: Schema.Number,
	rejections: { ...sourceRequest.Rejection, AlreadyDone },
	invalidates: () => [],
});
export const Supersede = command("supersede", {
	payload: sourceSupersede.Input,
	success: Schema.Number,
	rejections: { ...sourceSupersede.Rejection, AlreadyDone },
	invalidates: () => [],
});
export const Withdraw = command("withdraw", {
	payload: sourceWithdraw.Input,
	success: Schema.Number,
	rejections: { ...sourceWithdraw.Rejection, AlreadyDone },
	invalidates: () => [],
});
export const AcknowledgeNotice = command("acknowledgeNotice", {
	payload: sourceAcknowledgeNotice.Input,
	success: Schema.Number,
	rejections: { ...sourceAcknowledgeNotice.Rejection, AlreadyDone },
	invalidates: () => [],
});
export const AddContext = command("addContext", {
	payload: sourceAddContext.Input,
	success: Schema.Number,
	rejections: { ...sourceAddContext.Rejection, AlreadyDone },
	invalidates: () => [],
});
export const Answer = command("answer", {
	payload: sourceAnswer.Input,
	success: Schema.Number,
	rejections: { ...sourceAnswer.Rejection, AlreadyDone },
	invalidates: () => [],
});
export const Gate = command("gate", {
	payload: sourceGate.Input,
	success: Schema.Number,
	rejections: { ...sourceGate.Rejection, AlreadyDone },
	invalidates: () => [],
});
export const MarkDelivered = command("markDelivered", {
	payload: sourceMarkDelivered.Input,
	success: Schema.Number,
	rejections: { ...sourceMarkDelivered.Rejection, AlreadyDone },
	invalidates: () => [],
});
export const Park = command("park", {
	payload: sourcePark.Input,
	success: Schema.Number,
	rejections: { ...sourcePark.Rejection, AlreadyDone },
	invalidates: () => [],
});
export const PassUp = command("passUp", {
	payload: sourcePassUp.Input,
	success: Schema.Number,
	rejections: { ...sourcePassUp.Rejection, AlreadyDone },
	invalidates: () => [],
});
export const Proclaim = command("proclaim", {
	payload: sourceProclaim.Input,
	success: Schema.Number,
	rejections: { ...sourceProclaim.Rejection, AlreadyDone },
	invalidates: () => [],
});
