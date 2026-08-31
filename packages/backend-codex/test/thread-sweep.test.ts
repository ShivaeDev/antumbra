import { expect, it } from "@effect/vitest";
import { Effect, Option } from "effect";
import { openAuditConnection } from "#adapters/audit-connection.ts";
import { type FakeAnswer, makeFakeAppServer } from "#test/fake.ts";
import { sweepSpawnedDescendants } from "#thread-sweep.ts";

const ROOT = "019ff334-ec21-7373-a31e-e8a0db309020";
const FIRST = "019ff400-1111-7373-a31e-e8a0db309021";
const SECOND = "019ff400-2222-7373-a31e-e8a0db309022";
const THIRD = "019ff400-3333-7373-a31e-e8a0db309023";
const FOURTH = "019ff400-4444-7373-a31e-e8a0db309024";

const spawned = (id: string, status: unknown = { type: "idle" }) => ({
	id,
	source: {
		subAgent: {
			thread_spawn: {
				agent_nickname: null,
				agent_path: ".codex/agents/scribe.md",
				agent_role: "scribe",
				depth: 1,
				parent_thread_id: ROOT,
			},
		},
	},
	status,
});

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;

const paged: FakeAnswer = (method, params) => {
	if (method !== "thread/list") {
		return Option.none();
	}
	const cursor = isRecord(params) ? params.cursor : undefined;
	return Option.some(
		cursor === undefined
			? { data: [spawned(FIRST), spawned(SECOND)], nextCursor: "page-2" }
			: { data: [spawned(SECOND), spawned(THIRD)], nextCursor: null },
	);
};

const sweep = (scripted: FakeAnswer) =>
	Effect.gen(function* () {
		const fake = makeFakeAppServer({ scripted });
		const swept = yield* Effect.exit(
			Effect.scoped(openAuditConnection(() => fake.process).pipe(Effect.flatMap((connection) => sweepSpawnedDescendants(connection.request, ROOT)))),
		);
		return { fake, swept };
	});

it.live("the sweep follows codex's cursor to the end of the listing", () =>
	Effect.gen(function* () {
		const { fake, swept } = yield* sweep(paged);
		const found = swept._tag === "Success" ? swept.value : [];

		expect(found.map((child) => child.threadId)).toEqual([FIRST, SECOND, THIRD]);
		expect(found[0]).toMatchObject({
			agentNickname: undefined,
			agentPath: ".codex/agents/scribe.md",
			agentRole: "scribe",
			parentThreadId: ROOT,
		});

		expect(fake.requests.map((request) => request.method)).toEqual(["initialize", "thread/list", "thread/list"]);
		const asked = fake.requests[1]?.params;
		expect(isRecord(asked) ? asked.ancestorThreadId : undefined).toBe(ROOT);
	}),
);

it.live("the ancestor filter is asked for at initialize, or not at all", () =>
	Effect.gen(function* () {
		const { fake } = yield* sweep(paged);
		const hello = fake.requests[0]?.params;
		const capabilities = isRecord(hello) ? hello.capabilities : undefined;

		expect(isRecord(capabilities) ? capabilities.experimentalApi : false).toBe(true);
	}),
);

const statuses: FakeAnswer = (method) =>
	method === "thread/list"
		? Option.some({
				data: [
					spawned(FIRST, { activeFlags: [], type: "active" }),
					spawned(SECOND, { type: "idle" }),
					spawned(THIRD, { type: "notLoaded" }),
					spawned(FOURTH, { type: "systemError" }),
				],
				nextCursor: null,
			})
		: Option.none();

it.live("only an active thread reads as a child that is working", () =>
	Effect.gen(function* () {
		const { swept } = yield* sweep(statuses);
		const found = swept._tag === "Success" ? swept.value : [];

		expect(found.map((child) => [child.threadId, child.working])).toEqual([
			[FIRST, true],
			[SECOND, false],
			[THIRD, false],
			[FOURTH, false],
		]);
	}),
);

it.live("a listing it cannot read is a refusal, never a short answer", () =>
	Effect.gen(function* () {
		const { swept } = yield* sweep((method) => (method === "thread/list" ? Option.some({ data: "everything" }) : Option.none()));

		expect(swept._tag).toBe("Failure");
	}),
);
