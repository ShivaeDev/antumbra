import { SchemaAST } from "effect";
import { describe, expect, it } from "vitest";
import { MUTED_NOTIFICATIONS } from "#handshake.ts";
import { TurnStatus } from "#protocol.ts";
import { ExecutionStatus, KnownItem } from "#protocol-items.ts";
import { RATE_LIMITS_METHOD } from "#rate-limits.ts";
import {
	bundle,
	currentTimeResponse,
	enumOf,
	literalsOf,
	methodsOf,
	serverNotifications,
	serverRequests,
	toolCallResponse,
	variantTypes,
} from "#test/schema-bundle.ts";

describe("the codex protocol slice agrees with the pinned schema bundle", () => {
	it("turn and execution statuses are the bundle's enums, verbatim", () => {
		expect([...literalsOf(TurnStatus)].sort()).toEqual([...enumOf("TurnStatus")].sort());
		expect([...literalsOf(ExecutionStatus)].sort()).toEqual([...enumOf("CommandExecutionStatus")].sort());
		expect([...literalsOf(ExecutionStatus)].sort()).toEqual([...enumOf("PatchApplyStatus")].sort());
	});

	it("every modelled item variant is a ThreadItem variant", () => {
		const types = SchemaAST.isUnion(KnownItem.ast)
			? KnownItem.ast.types.flatMap((member) => {
					if (!SchemaAST.isObjects(member)) return [];
					const discriminant = member.propertySignatures.find((property) => property.name === "type")?.type;
					return discriminant !== undefined && SchemaAST.isLiteral(discriminant) && typeof discriminant.literal === "string"
						? [discriminant.literal]
						: [];
				})
			: [];
		expect(types).toHaveLength(KnownItem.ast.types.length);
		expect(types.every((type) => variantTypes("ThreadItem").includes(type))).toBe(true);
	});

	it("the sub-agent words we fold on are the bundle's, verbatim", () => {
		expect(enumOf("SubAgentActivityKind")).toEqual(["started", "interacted", "interrupted"]);
		expect(enumOf("CollabAgentTool")).toEqual(["spawnAgent", "sendInput", "resumeAgent", "wait", "closeAgent"]);
	});

	it("a spawned sub-agent thread is the only source that names a parent", () => {
		const sources = bundle.definitions.SubAgentSource?.oneOf ?? [];
		const spawn = sources.find((variant) => variant.title === "ThreadSpawnSubAgentSource");
		const source = JSON.stringify(spawn?.properties?.thread_spawn);
		for (const field of ["parent_thread_id", "agent_path", "agent_nickname", "agent_role"]) {
			expect(source).toContain(field);
		}
		expect(sources.some((variant) => variant.enum?.includes("review"))).toBe(true);
		expect(bundle.definitions.Thread?.properties).toHaveProperty("source");
	});

	it("a census can ask for every thread spawned below one ancestor", () => {
		const asked = bundle.definitions.ThreadListParams?.properties;
		expect(asked).toHaveProperty("ancestorThreadId");
		expect(asked).toHaveProperty("cursor");
		expect(asked).toHaveProperty("limit");
		const listed = bundle.definitions.ThreadListResponse?.properties;
		expect(listed).toHaveProperty("data");
		expect(listed).toHaveProperty("nextCursor");
		const methods = (bundle.definitions.ClientRequest?.oneOf ?? []).flatMap((variant) => variant.properties?.method?.enum ?? []);
		expect(methods).toContain("thread/list");
	});

	it("every listed thread says whether work is under way in it", () => {
		expect(bundle.definitions.Thread?.required ?? []).toContain("status");
		expect(variantTypes("ThreadStatus")).toEqual(["notLoaded", "idle", "systemError", "active"]);
	});

	it("the experimental surface the census reads is asked for at initialize", () => {
		const capabilities = bundle.definitions.InitializeCapabilities?.properties;
		expect(capabilities).toHaveProperty("experimentalApi");
		expect(capabilities).toHaveProperty("optOutNotificationMethods");
		expect(bundle.definitions.InitializeParams?.properties).toHaveProperty("capabilities");
	});

	it("a thread may be started with the tools we serve", () => {
		const start = bundle.definitions.ThreadStartParams?.properties;
		expect(start).toHaveProperty("dynamicTools");
		const spec = bundle.definitions.DynamicToolSpec?.oneOf;
		expect(Array.isArray(spec) && spec.length > 0).toBe(true);
		expect(variantTypes("DynamicToolSpec")).toContain("function");
		expect(enumOf("DynamicToolCallStatus")).toEqual(["inProgress", "completed", "failed"]);
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

	it("a terminal usage-limit error carries the fields capacity admission reads", () => {
		const notification = bundle.definitions.ErrorNotification;
		expect(notification?.required).toEqual(expect.arrayContaining(["error", "threadId", "turnId", "willRetry"]));
		expect(notification?.properties).toHaveProperty("willRetry");
		expect(bundle.definitions.TurnError?.properties).toHaveProperty("codexErrorInfo");
		expect(JSON.stringify(bundle.definitions.CodexErrorInfo)).toContain("usageLimitExceeded");
		expect(methodsOf(serverNotifications)).toContain("error");
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
			"thread/status/changed",
			"thread/tokenUsage/updated",
			RATE_LIMITS_METHOD,
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
