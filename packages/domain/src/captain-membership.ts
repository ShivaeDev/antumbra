import { Pieces } from "@antumbra/pieces";
import type { DirectToolOutcome } from "@antumbra/plugin-api";
import {
	defineService,
	type ServiceRequirements,
} from "@antumbra/service-definition";
import { Effect, Option } from "effect";
import { onVoyage, refused } from "#tool-answers.ts";
import type { SessionIdentity } from "#tool-identity.ts";

const requirements = [Pieces] as const;
type Requirements<Success> = ServiceRequirements<typeof requirements, Success>;

const onOwnedDependencies = (
	members: ReadonlySet<string>,
	dependsOn: ReadonlyArray<string>,
	voyageId: string,
	act: (voyageId: string) => Effect.Effect<DirectToolOutcome>,
) => {
	const strangers = dependsOn.filter((id) => !members.has(id));
	return strangers.length === 0
		? act(voyageId)
		: Effect.succeed(
				refused(`these pieces are not on your voyage: ${strangers.join(", ")}`),
			);
};

export const CaptainMembership = defineService({
	id: "@antumbra/domain/CaptainMembership",
	initialize: Effect.void,
	methods: () => {
		const membersOf = (voyageId: string) =>
			Effect.flatMap(Pieces, (pieces) => pieces.membersOfVoyage(voyageId));
		const withMembers = (
			voyageId: string,
			act: (members: ReadonlySet<string>) => Effect.Effect<DirectToolOutcome>,
		): Effect.Effect<DirectToolOutcome, never, Pieces> =>
			membersOf(voyageId).pipe(
				Effect.matchEffect({
					onFailure: () =>
						Effect.succeed(refused("the voyage could not be read")),
					onSuccess: act,
				}),
			);
		return {
			// why: an edge is the other side of the same hull — the model lets any
			// piece wait on any piece, and this capability keeps a voyage from
			// hanging its work off another ship's.
			onOwnDeps: Effect.fn("captainMembership.onOwnDeps")(function* (
				identity: SessionIdentity,
				dependsOn: ReadonlyArray<string>,
				act: (voyageId: string) => Effect.Effect<DirectToolOutcome>,
			): Requirements<DirectToolOutcome> {
				return yield* onVoyage(identity, (voyageId) =>
					withMembers(voyageId, (members) =>
						onOwnedDependencies(members, dependsOn, voyageId, act),
					),
				);
			}),
			// why: a captain cons one ship. A piece id naming another voyage's
			// work is refused rather than acted on, so guessed ids grant no reach.
			onOwnPiece: Effect.fn("captainMembership.onOwnPiece")(function* (
				identity: SessionIdentity,
				pieceId: string,
				act: (pieceId: string) => Effect.Effect<DirectToolOutcome>,
			): Requirements<DirectToolOutcome> {
				return yield* onVoyage(identity, (voyageId) =>
					withMembers(voyageId, (members) =>
						members.has(pieceId)
							? act(pieceId)
							: Effect.succeed(refused("that piece is not on your voyage")),
					),
				);
			}),
			// why: reach is asked as a plain question when the caller phrases its own
			// refusal — a voyage that cannot be read reaches nothing, so an
			// unreadable record never widens what an agent may see.
			reaches: Effect.fn("captainMembership.reaches")(function* (
				identity: SessionIdentity,
				pieceIds: ReadonlyArray<string>,
			): Requirements<boolean> {
				return yield* Option.match(identity.voyageId, {
					onNone: () => Effect.succeed(false),
					onSome: (voyageId) =>
						membersOf(voyageId).pipe(
							Effect.map((owned) => pieceIds.some((id) => owned.has(id))),
							Effect.orElseSucceed(() => false),
						),
				});
			}),
		};
	},
	requires: requirements,
});

export const CaptainMembershipLive = CaptainMembership.layer;
