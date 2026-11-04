import { land as command } from "@antumbra/domain-reports/commands/land.ts";
import { ReportsHistory } from "@antumbra/server-journal/postgres/reports/service.ts";
import { Clock, Effect, type Semaphore } from "effect";
export const land = (serial: Semaphore.Semaphore) =>
	Effect.fn("Reports.land")(function* (input: typeof command.Input.Type) {
		const history = yield* ReportsHistory;
		yield* history.checkRequest(input.requestId);
		const value = yield* command.run(input, yield* history.rows(), command.reject);
		return yield* history.append(input.requestId, [{ _tag: "ReportLanded", ...value, at: yield* Clock.currentTimeMillis }]);
	}, serial.withPermit);
