import type {
	DatabaseService,
	PrismaError,
	WriteExecutors,
} from "@antumbra/persistence";
import { Effect, Option } from "effect";
import { VoyageNotFound } from "#errors.ts";
import type { VoyageRow } from "#voyage-rows.ts";

export const requireVoyage = (
	db: DatabaseService,
	voyageId: string,
): Effect.Effect<VoyageRow, PrismaError | VoyageNotFound, WriteExecutors> =>
	db.Voyage.where({ id: voyageId })
		.first()
		.pipe(
			Effect.flatMap((row) =>
				Option.isNone(row)
					? new VoyageNotFound({ voyageId })
					: Effect.succeed(row.value),
			),
		);
