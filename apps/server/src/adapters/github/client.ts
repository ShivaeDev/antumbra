import { runGh } from "@antumbra/edge-github/command.ts";
import { GhProcess } from "@antumbra/edge-github/process.ts";
import { GitHubAppError } from "@shivaedev/github/errors.ts";
import { GitHub } from "@shivaedev/github/GitHub.ts";
import { GitHubConfig } from "@shivaedev/github/GitHubConfig.ts";
import { GitHubToken } from "@shivaedev/github/GitHubToken.ts";
import { Config, ConfigProvider, Effect, Layer, Option, Redacted } from "effect";
import { FetchHttpClient } from "effect/http";

const credential = Effect.fn("GitHubCredentials.acquire")(
	function* (executable: string, hostname: string) {
		const token = yield* Config.Redacted(hostname === "github.com" ? "GH_TOKEN" : "GH_ENTERPRISE_TOKEN").pipe(
			Config.orElse(() => Config.Redacted(hostname === "github.com" ? "GITHUB_TOKEN" : "GITHUB_ENTERPRISE_TOKEN")),
			Config.option,
		);
		if (Option.isSome(token)) return token;
		const value = yield* runGh({ args: ["auth", "token", "--hostname", hostname], executable, operation: "auth-token", timeoutMillis: 15_000 });
		if (value.trim() === "") return yield* new GitHubAppError({ reason: "status", status: 401 });
		return Option.some(Redacted.make(value.trim()));
	},
	Effect.mapError((cause) => new GitHubAppError({ reason: "status", status: 401 }, { cause })),
);

export const githubClient = (executable: string, hostname: string) =>
	GitHub.layer.pipe(
		Layer.provide(FetchHttpClient.layer),
		Layer.provide(Layer.succeed(GitHubConfig, { apiUrl: hostname === "github.com" ? "https://api.github.com" : `https://${hostname}/api/v3` })),
		Layer.provide(
			Layer.effect(
				GitHubToken,
				Effect.gen(function* () {
					const process = yield* GhProcess;
					const provider = yield* ConfigProvider.ConfigProvider;
					return credential(executable, hostname).pipe(
						Effect.provideService(GhProcess, process),
						Effect.provideService(ConfigProvider.ConfigProvider, provider),
					);
				}),
			),
		),
	);
