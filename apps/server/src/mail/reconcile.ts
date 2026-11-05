import { dueWakes } from "@antumbra/domain-mail/queries/due-wakes.ts";
import { flags } from "@antumbra/domain-settings/queries/flags.ts";
import { list } from "@antumbra/domain-voyages/queries/list.ts";
import { Mail } from "@antumbra/server-mail/service.ts";
import { run } from "@shivaedev/reconciler/run.ts";
import { Effect } from "effect";
import { deliver } from "#mail/deliver.ts";
import { watchKeys } from "#supervision/keys.ts";

export const reconcile = Effect.fn("Mail.reconcile")(function* () {
	const mailService = yield* Mail;

	return yield* run({
		keys: [...watchKeys(dueWakes.reads, undefined), ...watchKeys(flags.reads, undefined), ...watchKeys(list.reads, undefined)],
		read: mailService.dueWakes().pipe(Effect.orDie),
		act: (reading) => deliver(reading.wakes),
		due: (reading) => reading.waitUntil ?? undefined,
	});
});
