import { RulingFailure, RulingRefused } from "@antumbra/contract";
import type { RulingWithdrawalFailure } from "@antumbra/rulings";
import { failureMessage } from "#sight-failure.ts";

// why: every way a withdrawal fails to land is something the record knows and
// the window does not — the ruling was never asked, was never ruled, or has
// already left the standing set — so each comes back as the sentence that says
// which rather than as this process failing.
export const withdrawalFailure = (cause: RulingWithdrawalFailure): RulingFailure | RulingRefused => {
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
		default:
			return new RulingFailure({ message: failureMessage(cause) });
	}
};
