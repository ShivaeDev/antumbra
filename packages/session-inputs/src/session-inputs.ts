import { Database } from "@antumbra/persistence";
import { defineService } from "@antumbra/service-definition";
import { Effect } from "effect";
import { ingest } from "#ingest.ts";
import { mark } from "#mark.ts";
import { readStoredInput } from "#read.ts";
import { readStoredImage } from "#read-image.ts";
import { StorageRoot } from "#storage-root.ts";

export const SessionInputs = defineService({
	id: "@antumbra/session-inputs/SessionInputs",
	initialize: Effect.void,
	methods: () => ({ image: readStoredImage, ingest, load: readStoredInput, mark }),
	requires: [Database, StorageRoot],
});
