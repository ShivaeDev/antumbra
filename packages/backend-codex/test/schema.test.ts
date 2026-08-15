import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { MUTED_NOTIFICATIONS } from "#handshake.ts";
import { ExecutionStatus, KnownItem, TurnStatus } from "#protocol.ts";

// why: app-server negotiates no protocol version, so the vendored schema
// files for the pinned CLI are the contract; this test holds every literal,
// type, and method name our hand-written slice relies on to them.
// Regenerate with `codex app-server generate-json-schema --out <dir>` when
// the pin moves, and let this test say what changed.
interface SchemaFile {
	readonly definitions: Record<string, Record<string, unknown>>;
	readonly oneOf?: ReadonlyArray<{
		readonly properties?: { readonly method?: { readonly enum?: unknown } };
	}>;
}

const load = (name: string): SchemaFile =>
	JSON.parse(
		readFileSync(new URL(`../src/schema/${name}`, import.meta.url), "utf8"),
	);

const bundle = load("codex_app_server_protocol.v2.schemas.json");
const serverRequests = load("ServerRequest.json");
const serverNotifications = load("ServerNotification.json");

const methodsOf = (file: SchemaFile): ReadonlyArray<string> =>
	(file.oneOf ?? []).flatMap((variant) => {
		const values = variant.properties?.method?.enum;
		return Array.isArray(values)
			? values.filter((v) => typeof v === "string")
			: [];
	});

const enumOf = (name: string): ReadonlyArray<unknown> => {
	const definition = bundle.definitions[name];
	const values = definition?.enum;
	return Array.isArray(values) ? values : [];
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
	return variants.flatMap((variant: unknown) => {
		if (typeof variant !== "object" || variant === null) {
			return [];
		}
		const properties = (
			variant as { properties?: { type?: { enum?: unknown } } }
		).properties;
		const values = properties?.type?.enum;
		return Array.isArray(values)
			? values.filter((v) => typeof v === "string")
			: [];
	});
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
