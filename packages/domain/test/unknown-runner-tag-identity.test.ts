import { UnknownRunnerTag as PluginUnknownRunnerTag } from "@antumbra/plugin-api";
import { expect, it } from "@effect/vitest";
import { UnknownRunnerTag as DomainUnknownRunnerTag } from "#errors.ts";

it("re-exports the plugin-api UnknownRunnerTag constructor unchanged", () => {
	expect(DomainUnknownRunnerTag).toBe(PluginUnknownRunnerTag);
	expect(new DomainUnknownRunnerTag({ tag: "missing" })).toBeInstanceOf(
		PluginUnknownRunnerTag,
	);
});
