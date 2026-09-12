import { Effect, Option, Ref } from "effect";
import { PINNED_CLI_VERSION } from "#protocol.ts";

type TellCliVersion = (version: Option.Option<string>) => Effect.Effect<void>;

// Codex has no protocol negotiation; the userAgent it reports at initialize is compared with the pinned CLI version.
const tell = (version: Option.Option<string>): Effect.Effect<void> =>
	Option.match(version, {
		onNone: () => Effect.logWarning("codex: initialize response unrecognised"),
		onSome: (installed) =>
			installed === PINNED_CLI_VERSION
				? Effect.logInfo("codex app-server", { version: installed })
				: Effect.logWarning("codex app-server version differs from the pin", { pinned: PINNED_CLI_VERSION, version: installed }),
	});

export const tellCliVersionOnce: Effect.Effect<TellCliVersion> = Effect.map(
	Ref.make(false),
	(told) => (version) => Effect.flatMap(Ref.getAndSet(told, true), (already) => (already ? Effect.void : tell(version))),
);
