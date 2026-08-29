import { RulingFailure, RulingRefused } from "@antumbra/contract";
import type {
	RulingReclassifyFailure,
	RulingVerdictFailure,
} from "@antumbra/rulings";
import { failureMessage } from "#sight-failure.ts";

export const toRulingFailure = (cause: unknown): RulingFailure =>
	new RulingFailure({ message: failureMessage(cause) });

// why: the ways a verdict or a reclassification fails to land are things the
// record knows and the window does not, so each comes back as the sentence
// that says which — anything else is this process failing rather than the
// request being wrong.
export const verdictFailure = (
	cause: RulingVerdictFailure,
): RulingFailure | RulingRefused => {
	switch (cause._tag) {
		case "RulingAlreadyRuled":
			return new RulingRefused({
				reason: `ruling ${cause.rulingId} was already ruled`,
			});
		case "RulingChoiceUnknown":
			return new RulingRefused({
				reason: `ruling ${cause.rulingId} never offered choice ${cause.choiceId}`,
			});
		case "RulingNotFound":
			return new RulingRefused({ reason: `no open ruling: ${cause.rulingId}` });
		default:
			return toRulingFailure(cause);
	}
};

export const reclassifyFailure = (
	cause: RulingReclassifyFailure,
): RulingFailure | RulingRefused => {
	switch (cause._tag) {
		case "RulingAlreadyRuled":
			return new RulingRefused({
				reason: `ruling ${cause.rulingId} was already ruled`,
			});
		case "RulingNotFound":
			return new RulingRefused({ reason: `no open ruling: ${cause.rulingId}` });
		case "RulingReclassificationEmpty":
			return new RulingRefused({
				reason: `reclassifying ${cause.rulingId} names no axis`,
			});
		default:
			return toRulingFailure(cause);
	}
};
