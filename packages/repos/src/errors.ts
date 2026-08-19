import { Data } from "effect";

// why: two sources whose names lower to the same slug would be berthed in one
// directory on one branch, and the second agent would silently work in the
// first repository. The refusal names the source already holding the slug.
export class RepoSlugTaken extends Data.TaggedError("RepoSlugTaken")<{
	readonly registeredSource: string;
	readonly slug: string;
	readonly source: string;
}> {
	override get message(): string {
		return `${this.source} would berth as ${this.slug}, which ${this.registeredSource} is already registered for`;
	}
}
