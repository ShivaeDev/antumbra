import { Schema } from "effect";
import * as Rpc from "effect/unstable/rpc/Rpc";
import * as RpcGroup from "effect/unstable/rpc/RpcGroup";
import { SessionId } from "#ids.ts";
import { TranscriptItem } from "#rows/transcript.ts";
import { Activity, SessionStanding } from "#rows/transcript-standing.ts";

export const TranscriptReading = Schema.Struct({
	items: Schema.Array(TranscriptItem),
	standing: SessionStanding,
	activity: Activity,
	unavailable: Schema.Array(Schema.String),
});
export const TranscriptRpc = RpcGroup.make(Rpc.make("sessions.transcript", { payload: { id: SessionId }, success: TranscriptReading, stream: true }));
