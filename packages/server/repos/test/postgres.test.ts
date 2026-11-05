import { answered } from "@antumbra/app-testing/entry.ts";
import { postgresApp } from "@antumbra/app-testing/postgres.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { RepoId } from "@antumbra/platform-vocabulary/repos-ids.ts";
import { Deferred, Effect, Fiber } from "effect";
import { expect } from "vitest";

const request = (name: string) => Request.make(name);
const registering = { source: "https://github.com/ShivaeDev/antumbra.git", defaultRef: "main", requestId: request("antumbra") };

postgresApp.it(
	"hides a repository and its refresh until commit and discards rollback",
	[],
	function* ({ api, reposHistory, transaction, rollback, published, clearPublished }) {
		const written = yield* Deferred.make<void>();
		const release = yield* Deferred.make<void>();
		const event = {
			_tag: "RepoRegistered" as const,
			id: RepoId.make("antumbra"),
			name: "antumbra",
			source: registering.source,
			defaultRef: "main",
			createdAt: "1970-01-01T00:00:00.000Z",
			at: 0,
		};
		const pending = yield* transaction(
			Effect.gen(function* () {
				yield* reposHistory.append(request("pending"), [event]);
				yield* Deferred.succeed(written, undefined);
				yield* Deferred.await(release);
			}),
		).pipe(Effect.forkScoped);
		yield* Deferred.await(written);
		expect(yield* answered(api["repos.all"]({}), "repos.all")).toEqual([]);
		expect(yield* published()).toEqual([]);
		yield* Deferred.succeed(release, undefined);
		yield* Fiber.join(pending);
		expect(yield* answered(api["repos.all"]({}), "repos.all")).toHaveLength(1);
		yield* clearPublished();
		yield* rollback(reposHistory.append(request("rollback"), [{ _tag: "RepoForgotten", id: event.id, at: 0 }]));
		expect(yield* answered(api["repos.all"]({}), "repos.all")).toHaveLength(1);
		expect(yield* published()).toEqual([]);
	},
);
