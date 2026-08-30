import { Option, Schema } from "effect";
import { GlobalFrame, SessionScoped } from "#protocol.ts";

const decodeFrame = Schema.decodeUnknownOption(GlobalFrame);
const decodeScoped = Schema.decodeUnknownOption(SessionScoped);

export interface SessionFrame {
	readonly properties?: unknown;
	readonly type: string;
}

// why: every session on the host shares one event stream, so a session's own
// slice is selected here once and read twice — the log projects it and the
// turn driver watches it for the edges it has to act on. Frames that name no
// session at all — the stream's greeting, its heartbeat — are about the server
// rather than about anybody's work, and belong to no session's record.
export const frameFor = (
	sessionId: string,
	frame: unknown,
): Option.Option<SessionFrame> =>
	Option.flatMap(decodeFrame(frame), ({ payload }) =>
		Option.match(decodeScoped(payload.properties), {
			onNone: () => Option.none(),
			onSome: (scoped) =>
				scoped.sessionID === sessionId ? Option.some(payload) : Option.none(),
		}),
	);
