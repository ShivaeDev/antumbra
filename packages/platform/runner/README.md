# Runner wire

The server hosts `RunnerRpc` on its runner WebSocket endpoint. A runner opens `runner.operations` with its stable runner and log identity; the returned stream carries server-issued operations. Results return through `runner.reply`, matched by runnerId and issuer-minted requestId. Reconnection rebuilds this ephemeral stream from durable request rows; there is no second listener or broker.

The runner appends local log entries before reporting durable effects. `runner.cursor` returns the server's last committed position, initially -1. The runner submits entries after that position in ascending cursor order through `runner.append`; its answer is the committed cursor. Cursor 0 is the first entry. Each log's sequence is global across sessions. The server commits the entry's materialization and cursor together. Operation replies acknowledge transport completion; only log entries establish session or input truth.

A start confirms native identity with SessionStarted, then queues its charter and reports InputAccepted using the charter input id and start request id. A wake queues its instruction. Live delivery explicitly names steer; queue is never inferred by the backend. Input ids are minted by the issuer for generated instructions as well as user inputs. Refused operations are not SessionEnded. Disconnect creates no terminal session fact.

Tool descriptors contain data only. The runner binds each descriptor to forwarding `runner.tool` with trusted sessionId and stable callId. ToolCalled is durable before forwarding, ToolAnswered before returning the result. A reconnect retains that callId and session identity. Tool-set version records the set bound at open; staged server swaps and historical handler-version hosting are outside this migration.

Image digests name app-managed custody; apps/runner resolves them to backend-local paths. Resource plans and author identity originate from server rows. Machine implementations live in apps/runner, never this package.
