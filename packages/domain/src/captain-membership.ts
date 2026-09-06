import { Pieces } from "@antumbra/pieces";
import { defineService } from "@antumbra/service-definition/define-service.ts";
import { Effect } from "effect";
import { onOwnDeps } from "#captain-membership/on-own-deps.ts";
import { onOwnPiece } from "#captain-membership/on-own-piece.ts";
import { reaches } from "#captain-membership/reaches.ts";

const requirements = [Pieces] as const;

export const CaptainMembership = defineService({
	id: "@antumbra/domain/CaptainMembership",
	initialize: Effect.void,
	methods: () => ({ onOwnDeps, onOwnPiece, reaches }),
	requires: requirements,
});

export const CaptainMembershipLive = CaptainMembership.layer;
