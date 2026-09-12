import type { InputFailure } from "@antumbra/domain-inputs/errors.ts";
export const inputFailureMessage = (failure: InputFailure): string => {
	switch (failure._tag) {
		case "InvalidInput":
			return `${failure.reason}: ${failure.detail}`;
		case "InputConflict":
			return "This message id was already used for different content";
		case "InputNotFound":
			return "This session input could not be found";
		case "ImageUnavailable":
			return `image unavailable: ${failure.detail}`;
		case "InputAmbiguous":
			return "This input may already have reached the provider; check the transcript before retrying";
		case "InputRefused":
			return failure.detail;
	}
};
