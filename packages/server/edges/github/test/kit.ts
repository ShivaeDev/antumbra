import { pullRequest } from "@antumbra/app-testing/github-fixtures.ts";
export const node = pullRequest;

import type { HostRepo } from "@antumbra/platform-vocabulary/change-host.ts";
import type { FakeHttpRequest } from "@shivaedev/test-story/server/fakeHttpService.ts";
import { Schema } from "effect";
export const repo: HostRepo = { id: "repo-antumbra", name: "antumbra", source: "https://github.com/ShivaeDev/antumbra.git", defaultRef: "main" };
const Query = Schema.fromJsonString(Schema.Struct({ query: Schema.String }));
export const allAnswered = (request: FakeHttpRequest) => {
	const query = Schema.decodeUnknownSync(Query)(request.body.toString());
	return {
		body: {
			data: {
				r_0: Object.fromEntries(
					[...query.query.matchAll(/(pr_\d+):\s*pullRequest\(number:\s*(\d+)\)/g)].map((match) => [match[1], node(Number(match[2]))]),
				),
			},
		},
	};
};
