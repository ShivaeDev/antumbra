import { RulingOutsideAuthority } from "@antumbra/rulings";
import { expect, it } from "@effect/vitest";
import { verdictFailure } from "#ruling-refusals.ts";

// why: a verdict from a rung that does not reach the ruling's radius is the
// record refusing what was sent, so it must not fall to the generic sentence
// that says only that this process failed.
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
