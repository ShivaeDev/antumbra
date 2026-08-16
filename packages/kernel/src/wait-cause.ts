import { Cause, Option } from "effect";
import { isIntentWaitSignal } from "#workflow.ts";

interface IntentWaitCause {
	readonly detail: string;
	readonly interrupted: boolean;
}

export const intentWaitCause = (
	cause: Cause.Cause<unknown>,
): Option.Option<IntentWaitCause> => {
	let detail: string | undefined;
	let interrupted = false;
	for (const reason of cause.reasons) {
		if (Cause.isInterruptReason(reason)) {
			interrupted = true;
			continue;
		}
		if (
			!Cause.isFailReason(reason) ||
			!isIntentWaitSignal(reason.error) ||
			detail !== undefined
		) {
			return Option.none();
		}
		detail = reason.error.detail;
	}
	return detail === undefined
		? Option.none()
		: Option.some({ detail, interrupted });
};
