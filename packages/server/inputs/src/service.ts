import { InputDelivery } from "@antumbra/domain-inputs/commands/delivery-port.ts";
import { InputsHistory } from "@antumbra/server-journal/postgres/inputs/service.ts";
import { defineService } from "@shivaedev/service/defineService.ts";
import { FileSystem } from "effect";
import { delivery } from "#commands/delivery.ts";
import { record } from "#commands/record.ts";
import { retry } from "#commands/retry.ts";
import { image } from "#image.ts";
import { initialize } from "#initialize.ts";
import { deliveryReading } from "#queries/delivery-reading.ts";
import { pending } from "#queries/pending.ts";
import { reading } from "#queries/reading.ts";
import { support } from "#queries/support.ts";
import { InputStorage } from "#storage.ts";
import { submit } from "#submit.ts";
export const Inputs = defineService({
	id: "@antumbra/server-inputs/Inputs",
	requires: [InputsHistory, InputDelivery, InputStorage, FileSystem.FileSystem],
	initialize: initialize,
	methods: (serial) => ({
		submit: submit(serial),
		image,
		record: record(serial),
		delivery: delivery(serial),
		retry: retry(serial),
		reading,
		pending,
		deliveryReading,
		support,
	}),
});
