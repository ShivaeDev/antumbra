import { group } from "@antumbra/rpc/group.ts";
import { it } from "@effect/vitest";
import { expect } from "vitest";
import { settings } from "#feature.ts";

it("the wire tags name the feature and the command or query they derive from", () => {
	expect([...group([settings]).requests.keys()].toSorted()).toEqual(["settings.counts", "settings.flags", "settings.setCount", "settings.setFlag"]);
});
