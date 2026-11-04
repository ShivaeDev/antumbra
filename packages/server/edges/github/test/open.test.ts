import { githubStory } from "@antumbra/app-testing/github.ts";
import type { OpenRequest } from "@antumbra/platform-vocabulary/change-host.ts";
import { Effect } from "effect";
import { expect } from "vitest";
import { node, repo } from "#test/kit.ts";

const request: OpenRequest = {
	repo,
	berth: { branch: "work/chart", path: "/runner-only/berth" },
	submissionId: "change-1",
	headSha: "prepared-sha",
	base: null,
	title: "Chart coast",
	body: "Soundings\n\nThree fathoms",
	draft: true,
};

githubStory.it(
	"finds accepted publications through the shared client after the CLI answer was lost",
	[],
	function* ({ host, reply, pulls, losePublicationAnswer, publicationAccepted, publicationArguments }) {
		yield* pulls(() => ({
			body: publicationAccepted() ? [{ number: 23, head: { sha: request.headSha }, base: { ref: "main" }, state: "closed" }] : [],
		}));
		yield* reply({ data: { r_0: { pr_0: node(23, "MERGED") } } });
		yield* losePublicationAnswer();
		expect(yield* Effect.flip(host.open(request))).toMatchObject({ _tag: "ChangeHostUnavailable" });
		expect((yield* host.open(request)).stage).toBe("landed");
		expect(publicationArguments()).toHaveLength(1);
	},
);

githubStory.it("opens the frozen publication with separate title and body arguments", [], function* ({ host, reply, publicationArguments }) {
	yield* reply({ data: { r_0: { pr_0: node(23) } } });
	expect((yield* host.open(request)).externalId).toBe("23");
	expect(publicationArguments()[0]).toEqual(expect.arrayContaining([request.title, request.body, "--draft"]));
	expect(publicationArguments()[0]).not.toContain(request.berth.path);
});

githubStory.it("refuses an active branch pull with different prepared evidence", [], function* ({ host, pulls }) {
	yield* pulls(() => ({ body: [{ number: 23, head: { sha: "other-sha" }, base: { ref: "main" }, state: "open" }] }));
	expect(yield* Effect.flip(host.open(request))).toMatchObject({
		_tag: "ChangeHostRefused",
		detail: expect.stringContaining("different head or base"),
	});
});
