import { apiOf } from "@antumbra/server-journal/testing/api.ts";
import { expect } from "vitest";
import { answered } from "#answers.ts";
import { definition } from "#app.ts";
import { it } from "#glass/entry.tsx";

it.glass("internal actions reach the glass application", function* ({ api, run }) {
	const internal = yield* run(apiOf(definition));
	yield* internal.roleSettings.choose({ backend: "claude", effort: null, model: null, role: "captain", scope: "fleet" });

	const roles = yield* answered(api.roleSettings.defaults({}));
	expect(roles.find((role) => role.role === "captain")?.backend).toBe("claude");
});
