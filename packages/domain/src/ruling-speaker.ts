import type { RulingAuthority } from "@antumbra/vocabulary/ruling";
import { Effect } from "effect";
import { rulesAs } from "#ruling-station.ts";
import type { SessionIdentity } from "#tool-identity.ts";
import { VoyageWorldSource } from "#voyage-world.ts";

// why: which rung a captain speaks for is a fact about the voyage it cons, so
// it is read off the record at the moment it acts rather than fixed when its
// tools were built — a voyage that stopped being the flagship stops conferring
// the fleet's rung. A record nobody can read leaves the caller speaking for its
// own ship and nothing wider, the way an unreadable world grants no fleet acts.
export const makeRulingSpeaker = Effect.gen(function* () {
	const source = yield* VoyageWorldSource;
	return (identity: SessionIdentity): Effect.Effect<RulingAuthority> =>
		source.read.pipe(
			Effect.map((world) => rulesAs(world, identity)),
			Effect.orElseSucceed((): RulingAuthority => "captain"),
		);
});
