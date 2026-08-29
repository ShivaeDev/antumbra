import { RulingFailure, RulingRefused } from "@antumbra/contract";
import type {
	RulingProclaimFailure,
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

// why: a proclamation is a request and a verdict in one act, so it is refused
// for either's reasons — a subject the fleet has not got, or a pick naming none
// of the choices the proclamation itself wrote.
export const proclaimFailure = (
	cause: RulingProclaimFailure,
): RulingFailure | RulingRefused => {
	switch (cause._tag) {
		case "RulingChoiceUnknown":
			return new RulingRefused({
				reason: `the proclamation never offered choice ${cause.choiceId}`,
			});
		case "RulingSubjectMissing":
			return new RulingRefused({ reason: cause.message });
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
