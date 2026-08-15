import { Effect, Option, Schema } from "effect";
import { InitializeResponse, PINNED_CLI_VERSION } from "#protocol.ts";
import type { Request } from "#requests.ts";

const CLIENT_INFO = { name: "antumbra", title: "Antumbra", version: "0.0.0" };

// why: deltas are muted at the handshake — the log records whole items, as
// it does for Claude; per-token rows would swamp it for nothing a consumer
// reads.
export const MUTED_NOTIFICATIONS = [
	"item/agentMessage/delta",
	"item/commandExecution/outputDelta",
	"item/fileChange/outputDelta",
	"item/fileChange/patchUpdated",
	"item/plan/delta",
	"item/reasoning/summaryPartAdded",
	"item/reasoning/summaryTextDelta",
	"item/reasoning/textDelta",
	"turn/diff/updated",
];

const decodeInitialize = Schema.decodeUnknownOption(InitializeResponse);

// why: app-server negotiates no protocol version — the binary is the
// version. The user agent it reports is checked against the CLI version our
// hand-written protocol slice was written against; a mismatch is a warning
// to re-verify the slice, not a refusal.
const checkVersion = (response: unknown) =>
	Option.match(decodeInitialize(response), {
		onNone: () => Effect.logWarning("codex: initialize response unrecognised"),
		onSome: ({ userAgent }) => {
			const version = userAgent.split(" ")[0]?.split("/")[1] ?? "";
			return version === PINNED_CLI_VERSION
				? Effect.logInfo("codex app-server", { version })
				: Effect.logWarning("codex app-server version differs from the pin", {
						pinned: PINNED_CLI_VERSION,
						version,
					});
		},
	});

// why: one initialize per connection, then the initialized notification —
// the only handshake app-server accepts, and nothing else may go first.
export const handshake = (request: Request) =>
	request("initialize", {
		capabilities: {
			experimentalApi: false,
			optOutNotificationMethods: MUTED_NOTIFICATIONS,
			requestAttestation: false,
		},
		clientInfo: CLIENT_INFO,
	}).pipe(Effect.flatMap(checkVersion));
