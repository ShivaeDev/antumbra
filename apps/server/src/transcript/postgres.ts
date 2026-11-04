import type { SessionId } from "@antumbra/domain-sessions/ids.ts";
import { transcriptSources } from "@antumbra/domain-sessions/queries/transcript.ts";
import { TranscriptRpc } from "@antumbra/domain-sessions/queries/transcript-rpc.ts";
import { keysOf } from "@antumbra/server-journal/live.ts";
import { Sessions } from "@antumbra/server-sessions/service.ts";
import { Effect, Layer, Stream } from "effect";
import { Reactivity } from "effect/reactivity/Reactivity";
import { snapshot } from "#transcript/snapshot.ts";

export const postgresTranscript = (input: { readonly id: SessionId }) =>
	Stream.unwrap(
		Effect.gen(function* () {
			const sessions = yield* Sessions;
			const reactivity = yield* Reactivity;
			return reactivity
				.stream([...keysOf(transcriptSources.reads, undefined), "runner:connected"], sessions.transcriptSources(input))
				.pipe(Stream.mapEffect((sources) => snapshot(sources, input.id)));
		}),
	);
export const postgresTranscripts = TranscriptRpc.toLayer({ "sessions.transcript": postgresTranscript }).pipe(Layer.provideMerge(Sessions.layer));
