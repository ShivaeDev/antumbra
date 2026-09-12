import type { SessionId } from "@antumbra/domain-sessions/ids.ts";
import { transcriptSources } from "@antumbra/domain-sessions/queries/transcript.ts";
import { TranscriptRpc } from "@antumbra/domain-sessions/queries/transcript-rpc.ts";
import { Token } from "@antumbra/platform-rpc/token.ts";
import { keysOf, Live } from "@antumbra/server-journal/live.ts";
import { Effect, Stream } from "effect";
import { Reactivity } from "effect/unstable/reactivity/Reactivity";
import { snapshot } from "#transcript/snapshot.ts";

export const transcript = (input: { readonly id: SessionId }) =>
	Stream.unwrap(
		Effect.gen(function* () {
			const live = yield* Live;
			const reactivity = yield* Reactivity;
			return reactivity
				.stream([...keysOf(transcriptSources.reads, undefined), "runner:connected"], live.read(transcriptSources, input))
				.pipe(Stream.mapEffect((sources) => snapshot(sources, input.id)));
		}),
	);

export const transcriptLayer = TranscriptRpc.middleware(Token).toLayer({ "transcript.follow": transcript });
