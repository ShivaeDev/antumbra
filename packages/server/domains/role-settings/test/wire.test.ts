import { group } from "@antumbra/rpc/group.ts";
import { it } from "@effect/vitest";
import { expect } from "vitest";
import { roleSettings } from "#feature.ts";

it("the wire tags name the feature and the command or query they derive from", () => {
	expect([...group([roleSettings]).requests.keys()].toSorted()).toEqual([
		"roleSettings.choose",
		"roleSettings.defaults",
		"roleSettings.forVoyage",
		"roleSettings.resolve",
	]);
});
