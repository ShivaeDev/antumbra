import { RulingFailure, RulingRefused } from "@antumbra/contract";
import type { RulingSupersessionFailure } from "@antumbra/rulings";
import { failureMessage } from "#sight-failure.ts";

export const supersessionFailure = (cause: RulingSupersessionFailure): RulingFailure | RulingRefused => {
	switch (cause._tag) {
		case "RulingAlreadySuperseded":
			return new RulingRefused({
				reason: `ruling ${cause.rulingId} was already superseded by ${cause.byRulingId}`,
			});
		case "RulingAlreadyWithdrawn":
			return new RulingRefused({
				reason: `ruling ${cause.rulingId} was already withdrawn`,
			});
		case "RulingNotFound":
			return new RulingRefused({ reason: `no ruling: ${cause.rulingId}` });
		case "RulingNotRuled":
			return new RulingRefused({
				reason: `ruling ${cause.rulingId} has not been ruled`,
			});
		case "RulingSupersedesItself":
			return new RulingRefused({
				reason: `ruling ${cause.rulingId} cannot supersede itself`,
			});
		default:
			return new RulingFailure({ message: failureMessage(cause) });
	}
};
