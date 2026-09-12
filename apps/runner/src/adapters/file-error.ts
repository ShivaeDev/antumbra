import { Data } from "effect";
export class FileFailure extends Data.TaggedError("FileFailure")<{ readonly detail: string }> {
	override get message(): string {
		return this.detail;
	}
}
