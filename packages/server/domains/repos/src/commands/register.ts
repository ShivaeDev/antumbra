import { command } from "@antumbra/platform-feature/command.ts";
import { titled } from "@antumbra/platform-feature/edit.ts";
import { Clock, Effect, Schema } from "effect";
import { repoRegistered } from "#facts/repo-registered.ts";
import { RepoId, repoName, repoSlug } from "#ids.ts";
import { repo } from "#rows/repo.ts";

export const register = command("register", {
	input: {
		source: titled(Schema.String, { title: "Source" }),
		defaultRef: titled(Schema.String, { title: "Default ref" }),
	},
	reads: [repo],
	emits: repoRegistered,
	rejections: {
		SlugTaken: { field: Schema.String, message: Schema.String, registeredSource: Schema.String, slug: Schema.String, source: Schema.String },
	},
	run: Effect.fn("repos.register")(function* (input, rows, reject) {
		const registered = yield* rows.repo.where({});
		const existing = registered.find((stored) => stored.source === input.source);
		if (existing !== undefined) {
			return { ...existing, defaultRef: input.defaultRef };
		}
		const slug = repoSlug(input.source);
		const holder = registered.find((stored) => repoSlug(stored.source) === slug);
		if (holder !== undefined) {
			return yield* reject.SlugTaken({
				field: "source",
				message: `${input.source} would berth as ${slug}, which ${holder.source} is already registered for`,
				registeredSource: holder.source,
				slug,
				source: input.source,
			});
		}
		const at = yield* Clock.currentTimeMillis;
		return {
			id: RepoId.make(input.requestId),
			name: repoName(input.source),
			source: input.source,
			defaultRef: input.defaultRef,
			createdAt: new Date(at).toISOString(),
		};
	}),
});
