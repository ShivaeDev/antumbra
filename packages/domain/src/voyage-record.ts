import { Database, type PrismaError } from "@antumbra/persistence";
import { type Context, Effect } from "effect";
import { VoyageNotFound } from "#errors.ts";

export const requireVoyage = (voyageId: string): Effect.Effect<void, PrismaError | VoyageNotFound, Context.Service.Identifier<typeof Database>> =>
	Database.pipe(
		Effect.flatMap((db) => db.Voyage.where({ id: voyageId }).exists()),
		Effect.flatMap((found) => (found ? Effect.void : new VoyageNotFound({ voyageId }))),
	);
