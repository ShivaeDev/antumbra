import { ExecutionHistory } from "@antumbra/server-storage/execution/service.ts";
import { InputsHistory } from "@antumbra/server-storage/inputs/service.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { defineService } from "@shivaedev/service/defineService.ts";
import { FileSystem } from "effect";
import { admit } from "#admit.ts";
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
export const Inputs = defineService({
	id: "@antumbra/server-inputs/Inputs",
	requires: [Records, ExecutionHistory, InputsHistory, InputStorage, FileSystem.FileSystem],
	initialize: initialize,
	methods: (serial) => ({
		admit,
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
