import { DomainFeeds, DomainFeedsLive } from "@antumbra/domain-feeds";
import { app } from "@antumbra/journal/app.ts";
import { testing } from "@antumbra/journal/testing/entry.ts";
import { roleSettings } from "@antumbra/role-settings/feature.ts";
import { FLEET, roleSettingId } from "@antumbra/role-settings/ids.ts";
import { Effect, PubSub } from "effect";
import { expect } from "vitest";
import { roleSettingsOver } from "#adapters/role-settings.ts";

const it = testing(app([roleSettings]));

it.app("changeDefault sends choose at fleet scope and publishes the fleet refresh", function* (harness) {
	yield* Effect.provide(
		Effect.gen(function* () {
			const feeds = yield* DomainFeeds;
			const settings = roleSettingsOver(harness.api, feeds);
			const refreshed = yield* feeds.subscribeFleetRefresh();
			yield* settings.changeDefault("captain", { backend: "claude", effort: "high", model: "opus" });
			expect(yield* PubSub.takeUpTo(refreshed, 2)).toHaveLength(1);
			expect(yield* harness.rows.roleSetting.get(roleSettingId(FLEET, "captain"))).toMatchObject({
				backend: "claude",
				effort: "high",
				model: "opus",
				role: "captain",
				scope: FLEET,
			});
		}),
		DomainFeedsLive,
	);
});

it.app("resolve answers with what the server resolved", function* (harness) {
	yield* Effect.provide(
		Effect.gen(function* () {
			const settings = roleSettingsOver(harness.api, yield* DomainFeeds);
			yield* harness.api.roleSettings.choose({ backend: "codex", effort: null, model: "gpt-6", role: "captain", scope: FLEET });
			expect(yield* settings.resolve(null, "captain")).toEqual({ backend: "codex", model: "gpt-6" });
		}),
		DomainFeedsLive,
	);
});
