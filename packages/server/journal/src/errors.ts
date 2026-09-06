import { Data } from "effect";

export class TableShapeChanged extends Data.TaggedError("TableShapeChanged")<{
	readonly expected: string;
	readonly stored: string;
	readonly table: string;
}> {
	override get message(): string {
		return `projection table "${this.table}" was built for shape ${this.stored} and the code now declares ${this.expected}`;
	}
}
