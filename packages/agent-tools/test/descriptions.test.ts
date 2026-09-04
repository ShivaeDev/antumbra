import { expect, it } from "@effect/vitest";
import { writeBoardSpec } from "#boards.ts";
import { adoptChangeSpec, openChangeSpec, submitChangeSpec } from "#changes.ts";
import { standDownSpec } from "#crew.ts";
import { ruleOnSpec } from "#ruling-verdicts.ts";

it("Board writing tells a successor what the rough register is for", () => {
	expect(writeBoardSpec.description).toContain("rough register for your successor");
	expect(writeBoardSpec.description).toContain("Never write what the record already holds");
});

it("each Change act explains pending work and the registry name to use", () => {
	for (const spec of [openChangeSpec, submitChangeSpec, adoptChangeSpec]) {
		expect(spec.description).toContain("is not landing");
		expect(spec.inputSchema).toMatchObject({
			properties: {
				repo: { description: "The repo name exactly as the Berths section spells it, not the berth folder's name." },
			},
		});
	}
});

it("standing down teaches availability without claiming Piece completion", () => {
	expect(standDownSpec.description).toContain("captains when the voyage needs no action");
	expect(standDownSpec.description).toContain("idleness, not Piece completion or retirement");
	expect(standDownSpec.description).toContain("stay open and listening");
});

it("the ruling record supplies the authority limits removed from charters", () => {
	expect(ruleOnSpec.description).toContain("voyage captain may answer at piece or voyage radius");
	expect(ruleOnSpec.description).toContain("flagship captain may answer an escalated question at any radius");
	expect(ruleOnSpec.description).toContain("reserved for the admiral");
});
