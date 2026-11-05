import type * as Source from "@antumbra/domain-repos/commands/register.ts";
import type { RejectedBy } from "@antumbra/platform-feature/rejection.ts";
import { RepoId, repoName, repoSlug } from "@antumbra/platform-vocabulary/repos-ids.ts";
import { selection as repoSelection } from "@antumbra/server-storage/records/repo.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Clock, Effect } from "effect";

export const register = Effect.fn("repos.register")(function* (
	input: typeof Source.register.Input.Type,
	reject: typeof Source.register.reject,
): Effect.fn.Return<typeof Source.register.emits.Payload.Type, RejectedBy<typeof Source.register.rejections>, Records> {
	const rows = yield* Records;

	const registered = yield* rows.repo
		.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: repoSelection })
		.pipe(Effect.orDie);
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
});
