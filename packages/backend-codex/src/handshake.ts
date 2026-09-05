import type { BackendFailure } from "@antumbra/plugin-api";
import { Effect, Option, Schema } from "effect";
import { InitializeResponse, PINNED_CLI_VERSION } from "#protocol.ts";
import type { Request } from "#requests.ts";

const CLIENT_INFO = { name: "antumbra", title: "Antumbra", version: "0.0.0" };

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

// Codex has no protocol negotiation; userAgent is compared with the pinned CLI version.
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

// An older app-server has no skills request; the backend still opens threads without Antumbra's skills.
export const offerSkills = (request: Request, folder: string) =>
	request("skills/extraRoots/set", { extraRoots: [folder] }).pipe(
		Effect.asVoid,
		Effect.catch((failure: BackendFailure) => Effect.logWarning("codex: skills were not accepted", { detail: failure.detail })),
	);

// Codex requires one initialize followed by initialized, with experimentalApi enabled for dynamic tools.
export const handshake = (request: Request) =>
	request("initialize", {
		capabilities: {
			experimentalApi: true,
			optOutNotificationMethods: MUTED_NOTIFICATIONS,
			requestAttestation: false,
		},
		clientInfo: CLIENT_INFO,
	}).pipe(Effect.flatMap(checkVersion));
