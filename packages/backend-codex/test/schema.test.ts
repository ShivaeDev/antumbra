import { readFileSync } from "node:fs";
import { Schema } from "effect";
import { describe, expect, it } from "vitest";
import { MUTED_NOTIFICATIONS } from "#handshake.ts";
import { TurnStatus } from "#protocol.ts";
import { ExecutionStatus, KnownItem } from "#protocol-items.ts";

// why: app-server negotiates no protocol version, so the vendored schema
// files for the pinned CLI are the contract; this test holds every literal,
// type, and method name our hand-written slice relies on to them.
// Regenerate with `codex app-server generate-json-schema --out <dir>` when
// the pin moves, and let this test say what changed.
const EnumNode = Schema.Struct({
	enum: Schema.optional(Schema.Array(Schema.String)),
});
const Variant = Schema.Struct({
	enum: Schema.optional(Schema.Array(Schema.String)),
	properties: Schema.optional(
		Schema.Struct({
			method: Schema.optional(EnumNode),
			thread_spawn: Schema.optional(Schema.Unknown),
			type: Schema.optional(EnumNode),
		}),
	),
	title: Schema.optional(Schema.String),
});
const Definition = Schema.Struct({
	enum: Schema.optional(Schema.Array(Schema.String)),
	oneOf: Schema.optional(Schema.Array(Variant)),
	properties: Schema.optional(Schema.Record(Schema.String, Schema.Unknown)),
});
const SchemaFile = Schema.Struct({
	definitions: Schema.Record(Schema.String, Definition),
	oneOf: Schema.optional(Schema.Array(Variant)),
});
type SchemaFile = typeof SchemaFile.Type;
const decodeSchemaFile = Schema.decodeUnknownSync(
	Schema.fromJsonString(SchemaFile),
);
const ResponseFile = Schema.Struct({
	required: Schema.Array(Schema.String),
});
const decodeResponseFile = Schema.decodeUnknownSync(
	Schema.fromJsonString(ResponseFile),
);
const read = (name: string): string =>
	readFileSync(new URL(`../src/schema/${name}`, import.meta.url), "utf8");

const load = (name: string): SchemaFile => decodeSchemaFile(read(name));
const loadResponse = (name: string): typeof ResponseFile.Type =>
	decodeResponseFile(read(name));

const bundle = load("codex_app_server_protocol.v2.schemas.json");
const serverRequests = load("ServerRequest.json");
const serverNotifications = load("ServerNotification.json");
const toolCallResponse = loadResponse("DynamicToolCallResponse.json");
const currentTimeResponse = loadResponse("CurrentTimeReadResponse.json");

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
				"collabAgentToolCall",
				"commandExecution",
				"dynamicToolCall",
				"fileChange",
				"mcpToolCall",
				"subAgentActivity",
				"webSearch",
			]),
		);
	});

	it("the sub-agent words we fold on are the bundle's, verbatim", () => {
		expect(enumOf("SubAgentActivityKind")).toEqual([
			"started",
			"interacted",
			"interrupted",
		]);
		expect(enumOf("CollabAgentTool")).toEqual([
			"spawnAgent",
			"sendInput",
			"resumeAgent",
			"wait",
			"closeAgent",
		]);
	});

	// why: a thread the record admits as a node must be one codex sourced from a
	// spawn. The reviewer, compaction and memory threads are the other members of
	// this union, and the slice decodes none of them — which is what keeps them
	// out of the tree by construction rather than by vigilance.
	it("a spawned sub-agent thread is the only source that names a parent", () => {
		const sources = bundle.definitions.SubAgentSource?.oneOf ?? [];
		const spawn = sources.find(
			(variant) => variant.title === "ThreadSpawnSubAgentSource",
		);
		expect(JSON.stringify(spawn?.properties?.thread_spawn)).toContain(
			"parent_thread_id",
		);
		expect(sources.some((variant) => variant.enum?.includes("review"))).toBe(
			true,
		);
	});

	it("a thread may be started with the tools we serve", () => {
		const start = bundle.definitions.ThreadStartParams?.properties;
		expect(start).toHaveProperty("dynamicTools");
		const spec = bundle.definitions.DynamicToolSpec?.oneOf;
		expect(Array.isArray(spec) && spec.length > 0).toBe(true);
		expect(variantTypes("DynamicToolSpec")).toContain("function");
		expect(enumOf("DynamicToolCallStatus")).toEqual([
			"inProgress",
			"completed",
			"failed",
		]);
	});

	it("the answers we send carry every field the server requires", () => {
		expect(toolCallResponse.required).toEqual(["contentItems", "success"]);
		expect(currentTimeResponse.required).toEqual(["currentTimeAt"]);
		expect(bundle.definitions.DynamicToolCallOutputContentItem).toBeDefined();
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
			"ThreadStartedNotification",
			"ThreadClosedNotification",
			"ItemGuardianApprovalReviewStartedNotification",
			"ItemGuardianApprovalReviewCompletedNotification",
			"GuardianWarningNotification",
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
			"item/autoApprovalReview/started",
			"item/autoApprovalReview/completed",
			"guardianWarning",
			"turn/started",
			"turn/completed",
			"thread/started",
			"thread/closed",
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
			"item/tool/call",
			"currentTime/read",
		]) {
			expect(methods, method).toContain(method);
		}
	});
});
