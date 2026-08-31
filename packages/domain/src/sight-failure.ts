import { SightFailure } from "@antumbra/contract";

export const failureMessage = (cause: unknown): string => {
	if (cause instanceof Error && cause.message !== "") {
		return cause.message;
	}
	if (typeof cause === "object" && cause !== null && "_tag" in cause) {
		return String(cause._tag);
	}
	return String(cause);
};

export const toFailure = (cause: unknown): SightFailure => new SightFailure({ message: failureMessage(cause) });
