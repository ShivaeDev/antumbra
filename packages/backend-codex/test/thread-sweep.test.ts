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

// why: two pages with a thread on both of them, which is what a listing sorted
// by time does when a thread is written while the sweep is walking it. The
// second page is the last, so the cursor it returns is null.
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
		const fake = makeFakeAppServer(scripted);
		const swept = yield* Effect.exit(
			Effect.scoped(openAuditConnection(() => fake.process).pipe(Effect.flatMap((connection) => sweepSpawnedDescendants(connection.request, ROOT)))),
		);
		return { fake, swept };
	});

it.live("the sweep follows codex's cursor to the end of the listing", () =>
	Effect.gen(function* () {
		const { fake, swept } = yield* sweep(paged);
		const found = swept._tag === "Success" ? swept.value : [];

		// why: a page the sweep stopped at would read as a session with fewer
		// delegated threads than it had, which is the failure this whole census
		// exists to catch — so the cursor is followed until codex says there is no
		// next one, and a thread named on two pages is still one thread.
		expect(found.map((child) => child.threadId)).toEqual([FIRST, SECOND, THIRD]);
		expect(found[0]).toMatchObject({
			agentNickname: undefined,
			agentPath: ".codex/agents/scribe.md",
			agentRole: "scribe",
			parentThreadId: ROOT,
		});

		// why: the audit's connection reads and does nothing else. It never starts a
		// thread and never resumes one — the never-attach rule holds here by
		// construction, because a connection that only ever lists cannot break it.
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

		// why: app-server gates the ancestor filter behind its experimental surface
		// and refuses the parameter outright without it, so the capability is the
		// census's licence to read at all.
		expect(isRecord(capabilities) ? capabilities.experimentalApi : false).toBe(true);
	}),
);

// why: one page, one thread per status codex can report. The sweep is the only
// place the record ever learns that a child is still running after the stream
// that carried it is gone, so which words mean "running" is held here by name.
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

		// why: idle is a child between turns and notLoaded is one the server has
		// not brought into memory; systemError is one that is not speaking on any
		// stream either, so none of the three can still be producing frames. Only
		// active holds a session away from rest — a child merely open never does.
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

		// why: an answer this backend cannot read is the pin having moved under the
		// slice. Returning the rows it did understand would call a session complete
		// on a reading that was never taken, so the sweep fails and the census says
		// plainly that it could not check.
		expect(swept._tag).toBe("Failure");
	}),
);
