import { expect, it } from "@effect/vitest";
import { Effect, Option, RcRef } from "effect";
import { codexAudit } from "#adapters/thread-audit.ts";
import { makeCodexServer } from "#server.ts";
import { makeFakeAppServer } from "#test/fake.ts";

it.live("successive censuses use the live server and claim the children they find", () =>
	Effect.gen(function* () {
		const fake = makeFakeAppServer({
			scripted: (method) =>
				method === "thread/list"
					? Option.some({
							data: [{ id: "child", source: { subAgent: { thread_spawn: { parent_thread_id: "root" } } }, status: { type: "idle" } }],
							nextCursor: null,
						})
					: Option.none(),
		});
		const server = yield* RcRef.make({ acquire: makeCodexServer({ spawn: () => fake.process }) });
		const live = yield* RcRef.get(server);
		const audit = codexAudit(server);
		const request = { admitted: () => false, cwd: "/moorage", rootRef: "root" };
		for (const census of [yield* audit.census(request), yield* audit.census(request)]) {
			expect(census.nodes).toEqual([{ nodeRef: "child", working: false }]);
		}
		expect(live.threads.ownerOf("child")).toBe("root");
	}),
);
