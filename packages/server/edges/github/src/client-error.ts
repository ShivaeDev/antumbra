import { GhAuthRequired, type GhOperation, GhUnavailable } from "#errors.ts";

interface Failure {
	readonly _tag: string;
	readonly message: string;
	readonly status?: number | undefined;
}
export const clientError = (operation: GhOperation) => (failure: Failure) =>
	failure._tag === "RemoteUnauthorized" || (failure._tag === "GitHubAppError" && failure.status === 401)
		? new GhAuthRequired({ operation, detail: "GitHub authentication failed; run gh auth login" })
		: new GhUnavailable({ operation, detail: failure.message });
