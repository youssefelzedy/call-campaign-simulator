# Call Campaign Simulator - Design Document

This document outlines the architecture, scheduling implementation, and observed edge cases for the `solution.ts` file implementing the `ICampaign` interface.

## Architecture

The main architecture revolves around a **State Machine and an Asynchronous Pump Mechanism**. 

Instead of traditional blocking constructs like `while` loops or nested `for` loops which would conflict with Node.js concurrency, the simulator uses a `nextProcess()` function. It acts as an asynchronous processor or "pump":

1. Every time a new call slot opens, a timer wakes it up, or an operation finishes, `nextProcess()` is invoked.
2. It aggressively checks guarding states (`state === "running"`, concurrency limits, working hours, and daily limits).
3. If criteria are met, it extracts a phone number, registers the call via injected `CallHandler`, and updates internal stats (`activeCalls++`).
4. It finally attempts to call itself recursively (`nextProcess()`) to immediately saturate available concurrency.

When the `CallHandler` resolves natively via Promises (`.then`), the pump updates stats (like `dailyMinutesUsed` and retries logic) and calls `nextProcess()` again to resume draining the queue.

## Scheduling Handling

Handling scheduling (time windows, daily limits, delayed retries) proved to be tricky because using real-time timers (`setTimeout`) risks the evaluation environment timing out.

The resolution relies uniquely on the provided mock interface `IClock`.

### Sleeping vs Polling
When the campaign recognizes it exceeds constraints (e.g., reaching `endTime` or maxing out `dailyMinutesUsed`), we avoid constant polling. Instead, we compute the *exact millisecond offset* to the next valid state:
- `getMsUntilNextStartTime()` measures the offset to tomorrow's `startTime` when the current time violates working hours.
- `getMsUntilMidnight()` measures the offset until the day resets, so the `dailyMinutesUsed` clears.

We pass these computed offsets directly into `this.clock.setTimeout` paired with a callback triggering `nextProcess()`.

### Daily Resets
Rather than risking desynchronization between timeouts and actual processing, we maintain the `currentDayDateString`. At the very top of `nextProcess()`, we compare dates. If a new UTC day has dawned since the previous iteration, we cleanly flip `dailyMinutesUsed` back to `0`. 

## Interesting Edge Cases Identified

1. **Premature Resuming after Midnight (Midnight before Start Time)**:
   If the daily limit is exhausted at 14:00, the system sets an alarm for Midnight. When midnight arrives, the daily limits reset to `0`, but the time is `00:00`, which is likely before the `startTime` (e.g., `09:00`). The pump is beautifully designed to gracefully transition the system instantly to "Sleep until start time" seamlessly.
   
2. **Race condition upon Pause**:
   A race occurs when `pause()` is hit while `IClock` timeouts are pending. Because `nextProcess()` checks `this.state !== "running"` as its very first directive, any firing alarms/retries immediately terminate instead of inappropriately allocating calls during a paused state.

3. **Modifying In-Air Arrays**:
   Array mutations (like `.shift()` for processing lines) ensure atomic operations inside Node's single-threaded nature, removing multiple concurrent checks resolving the very same number.