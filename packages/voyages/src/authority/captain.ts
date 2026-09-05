import { Option } from "effect";
import type { AuthorityIdentity } from "#authority/identity.ts";

export const isVoyageCaptainIdentity = (role: string, identity: AuthorityIdentity) =>
	role === "captain" && Option.isSome(identity.voyageId) && Option.isNone(identity.pieceId);
