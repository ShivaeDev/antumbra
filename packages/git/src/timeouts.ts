// why: deadlines are a property of what an operation touches, not of the file
// it lives in — anything that reaches the network waits the remote budget,
// anything that only reads this disk waits the short one. Shared so a new
// operation inherits a considered number instead of inventing one.
export const INSPECT_TIMEOUT_MILLIS = 3 * 60 * 1_000;

export const MUTATE_TIMEOUT_MILLIS = 10 * 60 * 1_000;

export const REMOTE_TIMEOUT_MILLIS = 30 * 60 * 1_000;
