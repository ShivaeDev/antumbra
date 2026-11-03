import { transact } from "@shivaedev/sql/transact.ts";
import { Effect } from "effect";
import { MailHistory } from "#postgres/mail/service.ts";
import { reset } from "#postgres/pieces/projection.ts";
import { PieceHistory } from "#postgres/pieces/service.ts";
import { VoyageHistory } from "#postgres/voyages/service.ts";

export const rebuild = Effect.fn("Postgres.rebuild")(function* () {
	const mail = yield* MailHistory;
	const voyages = yield* VoyageHistory;
	const pieces = yield* PieceHistory;
	yield* transact(
		Effect.gen(function* () {
			yield* reset;
			yield* voyages.rebuild();
			yield* pieces.rebuild();
			yield* mail.rebuild();
		}),
		{ onSqlError: (error) => error },
	);
});
