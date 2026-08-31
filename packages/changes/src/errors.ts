import { Data } from "effect";

export class UnknownChangeHostTag extends Data.TaggedError("UnknownChangeHostTag")<{
	readonly tag: string;
}> {}

export class StoredChangeInvalid extends Data.TaggedError("StoredChangeInvalid")<{
	readonly changeId: string;
	readonly detail: string;
}> {
	override get message(): string {
		return `stored Change ${this.changeId} is invalid: ${this.detail}`;
	}
}

export class StoredPieceChangeInvalid extends Data.TaggedError("StoredPieceChangeInvalid")<{
	readonly changeId: string;
	readonly detail: string;
	readonly pieceId: string;
}> {
	override get message(): string {
		return `stored PieceChange ${this.pieceId}/${this.changeId} is invalid: ${this.detail}`;
	}
}

export class StoredChangeVerdictInvalid extends Data.TaggedError("StoredChangeVerdictInvalid")<{
	readonly changeId: string;
	readonly detail: string;
}> {
	override get message(): string {
		return `stored verdict on Change ${this.changeId} is invalid: ${this.detail}`;
	}
}

export class ChangeNotFound extends Data.TaggedError("ChangeNotFound")<{
	readonly changeId: string;
}> {
	override get message(): string {
		return `there is no change ${this.changeId}`;
	}
}

export class ChangeStillAlive extends Data.TaggedError("ChangeStillAlive")<{
	readonly changeId: string;
	readonly stage: string;
}> {
	override get message(): string {
		return `change ${this.changeId} is ${this.stage} and has not died, so there is nothing to dismiss`;
	}
}

export class RepoNotFound extends Data.TaggedError("RepoNotFound")<{
	readonly repoName: string;
}> {
	override get message(): string {
		return `no repo named ${this.repoName} is registered`;
	}
}

export class BerthNotFound extends Data.TaggedError("BerthNotFound")<{
	readonly agentId: string;
	readonly repoName: string;
}> {
	override get message(): string {
		return `you have no berth in ${this.repoName}`;
	}
}

export class NoChangeHost extends Data.TaggedError("NoChangeHost")<{
	readonly repoName: string;
}> {
	override get message(): string {
		return `no change host claims ${this.repoName}`;
	}
}
