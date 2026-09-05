import type { RulingAuthority } from "@antumbra/vocabulary/ruling";
import { Effect } from "effect";
import { rulesAs } from "#ruling-station.ts";
import type { SessionIdentity } from "#tool-identity.ts";
import { VoyageWorldSource } from "#voyage-world/service.ts";

export const makeRulingSpeaker = Effect.gen(function* () {
	const source = yield* VoyageWorldSource;
	return (identity: SessionIdentity): Effect.Effect<RulingAuthority> =>
		source.read().pipe(
			Effect.map((world) => rulesAs(world, identity)),
			Effect.orElseSucceed((): RulingAuthority => "captain"),
		);
});
