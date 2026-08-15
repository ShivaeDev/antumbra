import { execStep } from "#ready/adapters/exec.ts";
import { consoleReport } from "#ready/adapters/report.ts";
import { runMain } from "#ready/adapters/run.ts";
import { runReady } from "#ready/program.ts";
import { steps } from "#ready/steps.ts";

runMain(runReady(steps, execStep, consoleReport));
