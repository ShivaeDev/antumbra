import {
	Database,
	type PrismaError,
	type WriteExecutors,
} from "@antumbra/persistence";
import { type Context, Effect, Option } from "effect";
import { VoyageNotFound } from "#errors.ts";
import type { VoyageRow } from "#voyage-rows.ts";

export const requireVoyage = (
	voyageId: string,
): Effect.Effect<
	VoyageRow,
	PrismaError | VoyageNotFound,
	Context.Service.Identifier<typeof Database> | WriteExecutors
> =>
	Database.pipe(
		Effect.flatMap((db) => db.Voyage.where({ id: voyageId }).first()),
		Effect.flatMap((row) =>
			Option.isNone(row)
				? new VoyageNotFound({ voyageId })
				: Effect.succeed(row.value),
		),
	);
