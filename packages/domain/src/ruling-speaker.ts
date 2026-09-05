import type { RulingAuthority } from "@antumbra/vocabulary/ruling";
import { Effect } from "effect";
import { VoyageAuthority } from "#authority/service.ts";
import type { SessionIdentity } from "#tool-identity.ts";

export const makeRulingSpeaker = Effect.gen(function* () {
	const authority = yield* VoyageAuthority;
	return (identity: SessionIdentity): Effect.Effect<RulingAuthority> =>
		authority.rulesAs(identity).pipe(Effect.orElseSucceed((): RulingAuthority => "captain"));
});
