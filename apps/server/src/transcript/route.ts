import type { SessionId } from "@antumbra/domain-sessions/ids.ts";
import { transcriptSources } from "@antumbra/domain-sessions/queries/transcript.ts";
import { TranscriptRpc } from "@antumbra/domain-sessions/queries/transcript-rpc.ts";
import { Owner } from "@antumbra/platform-access/policy.ts";
import { Sessions } from "@antumbra/server-sessions/service.ts";
import { Effect, Stream } from "effect";
import { Reactivity } from "effect/reactivity/Reactivity";
import { keysOf } from "#keys.ts";
import { snapshot } from "#transcript/snapshot.ts";

export const transcript = (input: { readonly id: SessionId }) =>
	Stream.unwrap(
		Effect.gen(function* () {
			const sessionsService = yield* Sessions;

			const reactivity = yield* Reactivity;
			return reactivity
				.stream([...keysOf(transcriptSources.reads, undefined), "runner:connected"], sessionsService.transcriptSources(input).pipe(Effect.orDie))
				.pipe(Stream.mapEffect((sources) => snapshot(sources, input.id)));
		}),
	);

export const transcriptLayer = TranscriptRpc.middleware(Owner).toLayer({ "sessions.transcript": transcript });
