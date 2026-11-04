import { makeGitHubHost } from "@antumbra/edge-github/host.ts";
import { ChangeHosts } from "@antumbra/platform-change-host/port.ts";
import { Config, Effect, Layer, Option } from "effect";
import { githubClient } from "#adapters/github/client.ts";
import { findOnLoginPath } from "#adapters/github/login-shell.ts";
import { ghProcessLayer } from "#adapters/github/process.ts";

export const githubHosts = Layer.effect(
	ChangeHosts,
	Effect.gen(function* () {
		const executable = Option.getOrElse(yield* findOnLoginPath("gh"), () => "gh");
		const enterprise = yield* Config.String("GH_HOST").pipe(Config.withDefault("github.com"));
		return yield* Effect.forEach([...new Set(["github.com", enterprise])], (hostname) =>
			makeGitHubHost({ executable, hostname }).pipe(Effect.provide(githubClient(executable, hostname))),
		);
	}),
).pipe(Layer.provide(ghProcessLayer));
