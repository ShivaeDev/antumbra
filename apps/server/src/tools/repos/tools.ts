import { register } from "@antumbra/domain-repos/commands/register.ts";
import { all } from "@antumbra/domain-repos/queries/all.ts";
import { answered } from "@antumbra/platform-tool-schemas/answers.ts";
import { bind, defineTool } from "@antumbra/platform-tool-schemas/define.ts";
import { requestId } from "@antumbra/platform-vocabulary/tool-request.ts";
import { Commit } from "@antumbra/server-journal/commit.ts";
import { Live } from "@antumbra/server-journal/live.ts";
import { Effect, Option, Schema, Stream } from "effect";

const registerRepoSpec = defineTool({
	description:
		"Register a repository so voyages can work in it. Registering one the fleet already has sets its default branch again rather than failing.",
	input: Schema.Struct({
		defaultRef: Schema.String.annotate({ description: "The branch work starts from, such as `main`." }),
		source: Schema.String.annotate({ description: "The repository's clone URL." }),
	}),
	name: "register_repo",
});

export const registerRepoTool = bind(registerRepoSpec, (context, input) =>
	answered(
		context,
		registerRepoSpec.name,
		Effect.gen(function* () {
			const commit = yield* Commit;
			const live = yield* Live;
			const id = requestId(context);
			yield* commit.commit(register, { ...input, requestId: id }).pipe(Effect.catchTag("AlreadyDone", (done) => Effect.succeed(done.seq)));
			const repos = Option.getOrThrow(yield* Stream.runHead(live.live(all, {})));
			const repo = yield* Effect.fromNullishOr(repos.find((held) => held.source === input.source));
			return { known: String(repo.id) !== id, repo };
		}),
		({ known, repo }) =>
			`${known ? "already registered" : "registered"} repo ${repo.id} ${repo.name} · ${repo.source} · default ref ${repo.defaultRef}`,
	),
);

export const repoTools = [registerRepoTool];
