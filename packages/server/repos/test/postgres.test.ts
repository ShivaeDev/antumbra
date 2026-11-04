import { answered } from "@antumbra/app-testing/entry.ts";
import { postgresApp } from "@antumbra/app-testing/postgres.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { RepoId } from "@antumbra/platform-vocabulary/repos-ids.ts";
import { Deferred, Effect, Fiber } from "effect";
import { expect } from "vitest";

const request = (name: string) => Request.make(name);
const registering = { source: "https://github.com/ShivaeDev/antumbra.git", defaultRef: "main", requestId: request("antumbra") };

postgresApp.it(
	"seeds repositories, rejects duplicate slugs and respects committed references",
	[],
	function* ({ api, journal, replayJournal, reposHistory, clearPublished, published, rebuild }) {
		const legacy = yield* journal();
		yield* legacy.api.repos.register(registering);
		yield* replayJournal(legacy);
		expect(yield* api["repos.all"]({})).toEqual(yield* answered(legacy.api.repos.all({}), "repositories"));
		const watched = yield* legacy.watchKeys(["repo"]);
		yield* clearPublished();
		const update = { ...registering, defaultRef: "develop", requestId: request("update") };
		yield* api["repos.register"](update);
		yield* legacy.api.repos.register(update);
		expect(new Set(yield* published())).toEqual(new Set(watched.seen()));
		const before = yield* api["repos.all"]({});
		yield* clearPublished();
		expect(
			yield* Effect.flip(api["repos.register"]({ ...registering, source: "https://github.com/another/antumbra", requestId: request("collision") })),
		).toMatchObject({ _tag: "SlugTaken" });
		expect(yield* api["repos.all"]({})).toEqual(before);
		expect(yield* published()).toEqual([]);
		yield* reposHistory.append(request("references"), [
			{ _tag: "RepoReferencesObserved", references: [{ id: "ruling/repo/antumbra", repoId: RepoId.make("antumbra") }], at: 0 },
		]);
		yield* clearPublished();
		expect(yield* Effect.flip(api["repos.forget"]({ id: RepoId.make("antumbra"), requestId: request("refused") }))).toMatchObject({
			_tag: "Referenced",
		});
		expect(yield* published()).toEqual([]);
		yield* rebuild();
		expect(yield* api["repos.all"]({})).toEqual(before);
		yield* reposHistory.append(request("references-cleared"), [{ _tag: "RepoReferencesObserved", references: [], at: 0 }]);
		yield* api["repos.forget"]({ id: RepoId.make("antumbra"), requestId: request("forgotten") });
		expect(yield* api["repos.all"]({})).toEqual([]);
	},
);

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
		expect(yield* api["repos.all"]({})).toEqual([]);
		expect(yield* published()).toEqual([]);
		yield* Deferred.succeed(release, undefined);
		yield* Fiber.join(pending);
		expect(yield* api["repos.all"]({})).toHaveLength(1);
		yield* clearPublished();
		yield* rollback(reposHistory.append(request("rollback"), [{ _tag: "RepoForgotten", id: event.id, at: 0 }]));
		expect(yield* api["repos.all"]({})).toHaveLength(1);
		expect(yield* published()).toEqual([]);
	},
);
