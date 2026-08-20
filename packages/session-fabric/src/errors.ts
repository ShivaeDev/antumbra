import { Data } from "effect";

export class SessionNotLive extends Data.TaggedError("SessionNotLive")<{
	readonly sessionId: string;
}> {}

export class SessionAttachmentFailure extends Data.TaggedError(
	"SessionAttachmentFailure",
)<{
	readonly detail: string;
}> {}
