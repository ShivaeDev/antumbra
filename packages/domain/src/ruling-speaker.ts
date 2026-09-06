import type { RulingAuthority } from "@antumbra/vocabulary/ruling.ts";
import { VoyageAuthority } from "@antumbra/voyages/authority/service";
import { Effect } from "effect";
import type { SessionIdentity } from "#tool-identity.ts";

export const makeRulingSpeaker = Effect.gen(function* () {
	const authority = yield* VoyageAuthority;
	return (identity: SessionIdentity): Effect.Effect<RulingAuthority> =>
		authority.rulesAs(identity).pipe(Effect.orElseSucceed((): RulingAuthority => "captain"));
});
