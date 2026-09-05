import { Database } from "@antumbra/persistence";
import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { withFlagshipCaptain } from "#test/flagship-fixtures.ts";
import { callTool } from "#test/harness.ts";

it.live("the flagship's captain reads the repositories the fleet has registered", () =>
	withFlagshipCaptain((captain) =>
		Effect.gen(function* () {
			const db = yield* Database;
			yield* callTool(captain, "register_repo", {
				defaultRef: "main",
				source: "https://example.test/fleet/soundings.git",
			});

			const read = yield* callTool(captain, "read_fleet", {});

			const repo = (yield* db.Repo.all())[0];
			expect(read.text).toContain(`# Repositories\n\n- ${repo?.id} soundings · https://example.test/fleet/soundings.git · default ref main`);
		}),
	),
);

it.live("the flagship's captain registers a repository, and says so when the fleet already has it", () =>
	withFlagshipCaptain((captain) =>
		Effect.gen(function* () {
			const db = yield* Database;
			const registration = {
				defaultRef: "main",
				source: "https://example.test/fleet/soundings.git",
			};

			const first = yield* callTool(captain, "register_repo", registration);
			const again = yield* callTool(captain, "register_repo", { ...registration, defaultRef: "trunk" });

			const repos = yield* db.Repo.all();
			const repo = repos[0];
			expect(first).toEqual({
				ok: true,
				text: `registered repo ${repo?.id} soundings · https://example.test/fleet/soundings.git · default ref main`,
			});
			expect(again).toEqual({
				ok: true,
				text: `already registered repo ${repo?.id} soundings · https://example.test/fleet/soundings.git · default ref trunk`,
			});
			expect(repos).toHaveLength(1);
			expect(repo).toMatchObject({ defaultRef: "trunk", name: "soundings" });
		}),
	),
);

it.live("a repository whose berth another repository holds is refused, not registered", () =>
	withFlagshipCaptain((captain) =>
		Effect.gen(function* () {
			const db = yield* Database;
			yield* callTool(captain, "register_repo", {
				defaultRef: "main",
				source: "https://example.test/fleet/soundings.git",
			});

			const refusal = yield* callTool(captain, "register_repo", {
				defaultRef: "main",
				source: "https://example.test/other/soundings.git",
			});

			expect(refusal.ok).toBe(false);
			expect(refusal.text).toContain("register_repo");
			expect(yield* db.Repo.all()).toHaveLength(1);
		}),
	),
);
