# Call Campaign Simulator

## Overview
This project implements a Call Campaign Simulator in Node.js and TypeScript. It processes a queue of customer phone numbers sequentially, strictly adhering to concurrency limits, daily working hours, retry policies, and daily call duration caps.

## How to Build and Run

### Prerequisites
- Node.js (v18+ recommended)
- TypeScript (`tsc`) installed either globally or locally.

### Installation & Build
If you haven't initialized a package yet, you can do so and install types:
```bash
npm init -y
npm install typescript @types/node --save-dev
```

To compile the TypeScript code:
```bash
npx tsc solution.ts
```
*(Optionally include a `tsconfig.json` for proper compilation targets).*

### Testing the Solution
To verify the logic and see the simulator running, you can execute the included `test.ts` file which contains a mock clock and a simulated call handler:

**1. Run directly with ts-node (Recommended for quick testing):**
```bash
npx ts-node --transpile-only test.ts
```

**2. Or compile and run with standard Node.js:**
```bash
npx tsc test.ts --target es6 --module commonjs
node test.js
```

## Assumptions

During the development of this simulator, the following assumptions were made regarding unspecified behaviors:

1. **Call Durations & Daily Minute Cap:** Since the duration of a call is unknown until the `CallHandler` promise resolves, the `dailyMinutesUsed` is updated *after* a call finishes. If a call causes the total daily minutes to exceed the maximum, no *new* calls will be initiated until the next day, but the initial call itself is allowed to complete. 
2. **Retries count towards the cap:** Retried calls are treated as normal calls in terms of minute usage and concurrency limits.
3. **Working Hours overlap:** The check for working hours is performed before initiating a new call. If a call is placed at 16:59 and lasts for 5 minutes (ending at 17:04 when `endTime` is `17:00`), the call is not forcefully disconnected. Instead, no subsequent calls will be placed.
4. **Timezones:** The base implementation assumes UTC time as retrieved by `clock.now()` (`getUTCHours()`, `getUTCDate()`).
5. **State after exhaustion:** The campaign only enters the `"completed"` state when both the initial lists and retry lists are completely exhausted and no active calls are ongoing.
