import { readFileSync } from "node:fs";
import { Schema } from "effect";
import { describe, expect, it } from "vitest";
import { MUTED_NOTIFICATIONS } from "#handshake.ts";
import { ExecutionStatus, KnownItem, TurnStatus } from "#protocol.ts";

// why: app-server negotiates no protocol version, so the vendored schema
// files for the pinned CLI are the contract; this test holds every literal,
// type, and method name our hand-written slice relies on to them.
// Regenerate with `codex app-server generate-json-schema --out <dir>` when
// the pin moves, and let this test say what changed.
const EnumNode = Schema.Struct({
	enum: Schema.optional(Schema.Array(Schema.String)),
});
const Variant = Schema.Struct({
	properties: Schema.optional(
		Schema.Struct({
			method: Schema.optional(EnumNode),
			type: Schema.optional(EnumNode),
		}),
	),
});
const Definition = Schema.Struct({
	enum: Schema.optional(Schema.Array(Schema.String)),
	oneOf: Schema.optional(Schema.Array(Variant)),
});
const SchemaFile = Schema.Struct({
	definitions: Schema.Record(Schema.String, Definition),
	oneOf: Schema.optional(Schema.Array(Variant)),
});
type SchemaFile = typeof SchemaFile.Type;
const decodeSchemaFile = Schema.decodeUnknownSync(
	Schema.fromJsonString(SchemaFile),
);

const load = (name: string): SchemaFile =>
	decodeSchemaFile(
		readFileSync(new URL(`../src/schema/${name}`, import.meta.url), "utf8"),
	);

const bundle = load("codex_app_server_protocol.v2.schemas.json");
const serverRequests = load("ServerRequest.json");
const serverNotifications = load("ServerNotification.json");

const methodsOf = (file: SchemaFile): ReadonlyArray<string> =>
	(file.oneOf ?? []).flatMap((variant) => {
		const values = variant.properties?.method?.enum;
		return values ?? [];
	});

const enumOf = (name: string): ReadonlyArray<string> => {
	const definition = bundle.definitions[name];
	const values = definition?.enum;
	return values ?? [];
};

const literalsOf = (schema: { readonly ast: unknown }): ReadonlyArray<string> =>
	JSON.stringify(schema.ast)
		.match(/"literal":"([^"]+)"/g)
		?.map((hit) => hit.slice('"literal":"'.length, -1)) ?? [];

const variantTypes = (name: string): ReadonlyArray<string> => {
	const definition = bundle.definitions[name];
	const variants = definition?.oneOf;
	if (!Array.isArray(variants)) {
		return [];
	}
	return variants.flatMap((variant) => variant.properties?.type?.enum ?? []);
};

describe("the codex protocol slice agrees with the pinned schema bundle", () => {
	it("turn and execution statuses are the bundle's enums, verbatim", () => {
		expect([...literalsOf(TurnStatus)].sort()).toEqual(
			[...enumOf("TurnStatus")].sort(),
		);
		expect([...literalsOf(ExecutionStatus)].sort()).toEqual(
			[...enumOf("CommandExecutionStatus")].sort(),
		);
		expect([...literalsOf(ExecutionStatus)].sort()).toEqual(
			[...enumOf("PatchApplyStatus")].sort(),
		);
	});

	it("every modelled item variant is a ThreadItem variant", () => {
		const modelled = literalsOf(KnownItem).filter((literal) =>
			variantTypes("ThreadItem").includes(literal),
		);
		expect(new Set(modelled)).toEqual(
			new Set([
				"agentMessage",
				"userMessage",
				"reasoning",
				"commandExecution",
				"fileChange",
				"mcpToolCall",
				"webSearch",
			]),
		);
	});

	it("the policy values we send exist", () => {
		expect(enumOf("SandboxMode")).toContain("workspace-write");
		expect(enumOf("ApprovalsReviewer")).toContain("auto_review");
	});

	it("the payload types we decode exist in the bundle", () => {
		for (const name of [
			"ItemStartedNotification",
			"ItemCompletedNotification",
			"TurnStartedNotification",
			"TurnCompletedNotification",
			"ThreadTokenUsageUpdatedNotification",
			"ThreadStatusChangedNotification",
			"ThreadStartResponse",
			"ThreadResumeResponse",
			"TurnStartResponse",
			"TurnSteerResponse",
			"TurnInterruptResponse",
			"InitializeCapabilities",
		]) {
			expect(bundle.definitions[name], name).toBeDefined();
		}
	});

	it("every notification method we consume or mute is one the server sends", () => {
		const methods = methodsOf(serverNotifications);
		for (const method of [
			"item/started",
			"item/completed",
			"turn/started",
			"turn/completed",
			"thread/tokenUsage/updated",
			...MUTED_NOTIFICATIONS,
		]) {
			expect(methods, method).toContain(method);
		}
	});

	it("every server request we answer is one the server makes", () => {
		const methods = methodsOf(serverRequests);
		for (const method of [
			"item/commandExecution/requestApproval",
			"item/fileChange/requestApproval",
			"item/permissions/requestApproval",
			"item/tool/requestUserInput",
			"mcpServer/elicitation/request",
			"execCommandApproval",
			"applyPatchApproval",
		]) {
			expect(methods, method).toContain(method);
		}
	});
});
