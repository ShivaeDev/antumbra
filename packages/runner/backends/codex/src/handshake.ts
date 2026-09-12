import { Effect, Option, Schema } from "effect";
import { InitializeResponse } from "#protocol.ts";
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

const versionOf = (response: unknown): Option.Option<string> =>
	Option.map(decodeInitialize(response), ({ userAgent }) => userAgent.split(" ")[0]?.split("/")[1] ?? "");

export const offerSkills = (request: Request, folder: string | undefined) =>
	folder === undefined ? Effect.void : Effect.asVoid(request("skills/extraRoots/set", { extraRoots: [folder] }));

// Codex requires one initialize followed by initialized, with experimentalApi enabled for dynamic tools.
export const handshake = (request: Request) =>
	request("initialize", {
		capabilities: {
			experimentalApi: true,
			optOutNotificationMethods: MUTED_NOTIFICATIONS,
			requestAttestation: false,
		},
		clientInfo: CLIENT_INFO,
	}).pipe(Effect.map(versionOf));
