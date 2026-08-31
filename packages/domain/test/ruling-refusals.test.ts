import { RulingOutsideAuthority } from "@antumbra/rulings";
import { expect, it } from "@effect/vitest";
import { verdictFailure } from "#ruling-refusals.ts";

it("names the radius and the rung a verdict could not reach", () => {
	const refused = verdictFailure(
		new RulingOutsideAuthority({
			by: "flagship",
			radius: "voyage",
			rulingId: "ruling-7",
		}),
	);

	expect(refused).toMatchObject({
		_tag: "RulingRefused",
		reason: "ruling ruling-7 binds at voyage radius, where the flagship does not rule",
	});
});
