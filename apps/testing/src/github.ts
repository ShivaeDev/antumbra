import { makeGitHubHost } from "@antumbra/edge-github/host.ts";
import { githubClient } from "@antumbra/server/adapters/github/client.ts";
import * as NodeServices from "@effect/platform-node/NodeServices";
import { ConfigProvider, Effect, Layer } from "effect";
import { type FakeHttpReply, type FakeHttpRequest, fakeHttpService } from "@shivaedev/test-story/server/fakeHttpService.ts";
import { routeOutbound } from "@shivaedev/test-story/server/routeOutbound.ts";
import { storyKit } from "@shivaedev/test-story/server/storyKit.ts";
import { githubCli } from "#test-support/github-cli.ts";

export const createGitHubFixture = Effect.fn("GitHubStory.create")(function* () {
	const cli = yield* githubCli;
	const state = {
		graphql: (_request: FakeHttpRequest): FakeHttpReply => ({ body: { data: {} } }),
		pulls: (_request: FakeHttpRequest): FakeHttpReply => ({ body: [] }),
	};
	const server = yield* fakeHttpService({
		routes: {
			graphql: { method: "POST", path: "/graphql", reply: (request) => state.graphql(request) },
			enterprise: { method: "POST", path: "/api/graphql", reply: (request) => state.graphql(request) },
			pulls: { path: "/repos/:owner/:repo/pulls", reply: (request) => state.pulls(request) },
			enterprisePulls: { path: "/api/v3/repos/:owner/:repo/pulls", reply: (request) => state.pulls(request) },
		},
	});
	yield* routeOutbound({ "api.github.com": server.url, "git.corp.test": server.url });
	const host = (hostname: string) =>
		makeGitHubHost({ executable: "gh", hostname }).pipe(
			Effect.provide(githubClient("gh", hostname).pipe(Layer.provide(cli.layer))),
			Effect.provide(cli.layer),
			Effect.provide(ConfigProvider.layer(ConfigProvider.fromUnknown({}))),
		);
	const publicHost = yield* host("github.com");
	const enterpriseHost = yield* host("git.corp.test");
	return {
		host: publicHost,
		enterprise: enterpriseHost,
		http: server,
		reply: (body: unknown, status = 200) =>
			Effect.sync(() => {
				state.graphql = () => ({ body, status });
			}),
		replyWith: (answer: (request: FakeHttpRequest) => FakeHttpReply) =>
			Effect.sync(() => {
				state.graphql = answer;
			}),
		pulls: (answer: (request: FakeHttpRequest) => FakeHttpReply) =>
			Effect.sync(() => {
				state.pulls = answer;
			}),
		authenticated: (value: boolean) =>
			Effect.sync(() => {
				cli.state.authenticated = value;
			}),
		losePublicationAnswer: () =>
			Effect.sync(() => {
				cli.state.loseCreateAnswer = true;
			}),
		publicationAccepted: () => cli.state.created,
		publicationArguments: () => cli.state.creates,
	};
});
export const githubStory = storyKit({
	name: "Antumbra GitHub",
	clock: "test",
	layer: NodeServices.layer,
	stages: [],
	create: createGitHubFixture,
	verbs: (engine) => engine,
	inspect: (engine) => ({
		requests: engine.http.requests.map((request) => ({ method: request.method, path: request.path, status: request.status })),
	}),
});
