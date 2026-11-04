import type { OpenRequest } from "@antumbra/platform-vocabulary/change-host.ts";
import { list } from "@shivaedev/github/list.ts";
import { Effect, Option, Schema, Stream } from "effect";
import { clientError } from "#client-error.ts";
import { GhCommandFailed } from "#errors.ts";
import type { GitHubRepoName } from "#source.ts";

const Pull = Schema.Struct({
	number: Schema.Number,
	head: Schema.Struct({ sha: Schema.String }),
	base: Schema.Struct({ ref: Schema.String }),
	state: Schema.String,
});
export const findPull = Effect.fn("GitHub.findPull")(function* (repo: GitHubRepoName, request: OpenRequest) {
	const query = new URLSearchParams({ head: `${repo.owner}:${request.berth.branch}`, state: "all", per_page: "100" });
	const found = yield* list(`/repos/${repo.owner}/${repo.name}/pulls?${query}`, Pull).pipe(
		Stream.take(100),
		Stream.runCollect,
		Effect.mapError(clientError("find-change")),
	);
	const matching = found.find((pull) => pull.head.sha === request.headSha && pull.base.ref === (request.base ?? request.repo.defaultRef));
	if (matching !== undefined) return Option.some(matching.number);
	if (found.some((pull) => pull.state === "open"))
		return yield* new GhCommandFailed({
			detail: "The branch already has an open pull request with a different head or base",
			exitCode: 1,
			stdout: "",
			operation: "find-change",
		});
	return Option.none<number>();
});
