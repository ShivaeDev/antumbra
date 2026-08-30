import { Option, Schema } from "effect";
import { GlobalFrame, SessionScoped } from "#protocol.ts";

const decodeFrame = Schema.decodeUnknownOption(GlobalFrame);
const decodeScoped = Schema.decodeUnknownOption(SessionScoped);

export interface SessionFrame {
	readonly properties?: unknown;
	readonly type: string;
}

export const frameFor = (sessionId: string, frame: unknown): Option.Option<SessionFrame> =>
	Option.flatMap(decodeFrame(frame), ({ payload }) =>
		Option.match(decodeScoped(payload.properties), {
			onNone: () => Option.none(),
			onSome: (scoped) => (scoped.sessionID === sessionId ? Option.some(payload) : Option.none()),
		}),
	);
