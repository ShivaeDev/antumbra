import type { OpenRequest } from "@antumbra/platform-vocabulary/change-host.ts";
import { Effect, Option, Schema } from "effect";
import { runGh } from "#command.ts";
import { GhCommandFailed, GhOutputInvalid } from "#errors.ts";
import type { GitHubRepoName } from "#source.ts";

const FoundPulls = Schema.Array(
	Schema.Struct({
		number: Schema.Number,
		headRefOid: Schema.String,
		baseRefName: Schema.String,
		state: Schema.String,
	}),
);

export const findPull = Effect.fn("GitHub.findPull")(function* (executable: string, repo: GitHubRepoName, request: OpenRequest) {
	const stdout = yield* runGh({
		args: [
			"pr",
			"list",
			"--repo",
			`${repo.owner}/${repo.name}`,
			"--head",
			request.berth.branch,
			"--state",
			"all",
			"--limit",
			"100",
			"--json",
			"number,headRefOid,baseRefName,state",
		],
		executable,
		operation: "find-change",
		timeoutMillis: 30_000,
	});
	const found = yield* Schema.decodeUnknownEffect(Schema.fromJsonString(FoundPulls))(stdout).pipe(
		Effect.mapError((cause) => new GhOutputInvalid({ detail: String(cause), operation: "find-change" })),
	);
	const matching = found.find((pull) => pull.headRefOid === request.headSha && pull.baseRefName === (request.base ?? request.repo.defaultRef));
	if (matching !== undefined) return Option.some(matching.number);
	if (found.some((pull) => pull.state === "OPEN")) {
		return yield* new GhCommandFailed({
			detail: "The branch already has an open pull request with a different head or base",
			exitCode: 1,
			stdout,
			operation: "find-change",
		});
	}
	return Option.none<number>();
});
