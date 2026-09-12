import { makeGitHubHost } from "@antumbra/edge-github/host.ts";
import { ChangeHosts } from "@antumbra/platform-change-host/port.ts";
import { Effect, Layer, Option } from "effect";
import { findOnLoginPath } from "#adapters/github/login-shell.ts";
import { ghProcessLayer } from "#adapters/github/process.ts";

export const githubHosts = Layer.effect(
	ChangeHosts,
	Effect.gen(function* () {
		const executable = Option.getOrElse(yield* findOnLoginPath("gh"), () => "gh");
		return [yield* makeGitHubHost({ executable })];
	}),
).pipe(Layer.provide(ghProcessLayer));
