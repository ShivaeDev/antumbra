import type { BoardOwnerNotFound, BoardSourceConflict, StoredBoardEntryInvalid } from "@antumbra/boards";
import { RulingFailure, RulingRefused } from "@antumbra/contract";
import type {
	RulingContextFailure,
	RulingParkFailure,
	RulingProclaimFailure,
	RulingReclassifyFailure,
	RulingVerdictFailure,
} from "@antumbra/rulings";
import { failureMessage } from "#sight-failure.ts";

export const toRulingFailure = (cause: unknown): RulingFailure => new RulingFailure({ message: failureMessage(cause) });

export const verdictFailure = (cause: RulingVerdictFailure): RulingFailure | RulingRefused => {
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
		case "RulingOutsideAuthority":
			return new RulingRefused({
				reason: `ruling ${cause.rulingId} binds at ${cause.radius} radius, where the ${cause.by} does not rule`,
			});
		default:
			return toRulingFailure(cause);
	}
};

export const proclaimFailure = (cause: RulingProclaimFailure): RulingFailure | RulingRefused => {
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

export const reclassifyFailure = (cause: RulingReclassifyFailure): RulingFailure | RulingRefused => {
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

type ReplyFailure = BoardOwnerNotFound | BoardSourceConflict | RulingContextFailure | RulingParkFailure | StoredBoardEntryInvalid;

export const replyFailure = (cause: ReplyFailure): RulingFailure | RulingRefused => {
	switch (cause._tag) {
		case "RulingAlreadyParked":
			return new RulingRefused({ reason: `ruling ${cause.rulingId} is already parked` });
		case "RulingAlreadyRuled":
			return new RulingRefused({ reason: `ruling ${cause.rulingId} was already ruled` });
		case "RulingNotFound":
			return new RulingRefused({ reason: `no open ruling: ${cause.rulingId}` });
		default:
			return toRulingFailure(cause);
	}
};
