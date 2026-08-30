import { Data } from "effect";

export class RepoSlugTaken extends Data.TaggedError("RepoSlugTaken")<{
	readonly registeredSource: string;
	readonly slug: string;
	readonly source: string;
}> {
	override get message(): string {
		return `${this.source} would berth as ${this.slug}, which ${this.registeredSource} is already registered for`;
	}
}
