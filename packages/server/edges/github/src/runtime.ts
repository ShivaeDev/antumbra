import { type ChangeHostError, ChangeHostRefused, ChangeHostUnavailable } from "@antumbra/platform-change-host/port.ts";
import type { GhError } from "#errors.ts";
export const GITHUB_TAG = "github";
export const toHostError = (failure: GhError): ChangeHostError =>
	failure._tag === "GhCommandFailed"
		? new ChangeHostRefused({ detail: failure.message, host: GITHUB_TAG })
		: new ChangeHostUnavailable({ detail: failure.message, host: GITHUB_TAG });
