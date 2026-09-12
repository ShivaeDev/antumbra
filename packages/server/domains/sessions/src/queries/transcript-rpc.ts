import { extending } from "@antumbra/platform-feature/extension.ts";
import { Schema } from "effect";
import * as Rpc from "effect/unstable/rpc/Rpc";
import * as RpcGroup from "effect/unstable/rpc/RpcGroup";
import { sessions } from "#feature.ts";
import { SessionId } from "#ids.ts";
import { TranscriptItem } from "#rows/transcript.ts";
import { Activity, SessionStanding } from "#rows/transcript-standing.ts";

export const TranscriptReading = Schema.Struct({
	items: Schema.Array(TranscriptItem),
	standing: SessionStanding,
	activity: Activity,
	unavailable: Schema.Array(Schema.String),
});
export const TranscriptRpc = extending(
	sessions,
	RpcGroup.make(Rpc.make("transcript", { payload: { id: SessionId }, success: TranscriptReading, stream: true })),
);
