import { backendCatalog } from "@antumbra/domain-backends/rows/backend-catalog.ts";
import { capacity } from "@antumbra/domain-capacity/rows/capacity.ts";
import { session } from "@antumbra/domain-sessions/rows/session.ts";
import { sessionOperation } from "@antumbra/domain-sessions/rows/session-operation.ts";
import { feature } from "@antumbra/platform-feature/feature.ts";
import { inputDeliveryChanged } from "#facts/delivery.ts";
import { inputObserved } from "#facts/observed.ts";
import { inputRecorded } from "#facts/recorded.ts";
import { inputRetried } from "#facts/retried.ts";
import { deliveryReading } from "#queries/delivery.ts";
import { pending } from "#queries/pending.ts";
import { reading } from "#queries/reading.ts";
import { support } from "#queries/support.ts";
import { sessionInput } from "#rows/input.ts";
export const inputs = feature("inputs", {
	rows: [sessionInput, session, sessionOperation, capacity, backendCatalog],
	facts: [inputRecorded, inputDeliveryChanged, inputObserved, inputRetried],
	commands: [],
	queries: [reading, pending, deliveryReading, support],
});
