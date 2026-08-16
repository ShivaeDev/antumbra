import { Data } from "effect";

export {
	EdgeWouldCycle,
	PieceNotFound,
	VoyageNotFound,
} from "@antumbra/pieces";

export class AgentNotFound extends Data.TaggedError("AgentNotFound")<{
	readonly agentId: string;
}> {}

export class UnknownBackendTag extends Data.TaggedError("UnknownBackendTag")<{
	readonly tag: string;
}> {}

export class UnknownRunnerTag extends Data.TaggedError("UnknownRunnerTag")<{
	readonly tag: string;
}> {}

export class UnknownChangeHostTag extends Data.TaggedError(
	"UnknownChangeHostTag",
)<{
	readonly tag: string;
}> {}

export class AgentNotSpawnable extends Data.TaggedError("AgentNotSpawnable")<{
	readonly agentId: string;
	readonly status: string;
}> {}

export class MooragePlanConflict extends Data.TaggedError(
	"MooragePlanConflict",
)<{
	readonly agentId: string;
	readonly detail: string;
}> {}

export class SessionNotLive extends Data.TaggedError("SessionNotLive")<{
	readonly sessionId: string;
}> {}

// why: these three reach a model verbatim through a tool answer, so each
// carries the sentence it wants read — which repo, which berth, and that no
// host in this build claims the repo it was asked to open a change on.
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

// why: a voyage is under way because its captain is at work, so hailing a
// second one while the first still is would give the voyage two accountable
// addresses. The refusal names the captain it already has.
export class CaptainAlreadyHailed extends Data.TaggedError(
	"CaptainAlreadyHailed",
)<{
	readonly agentId: string;
	readonly voyageId: string;
}> {}
