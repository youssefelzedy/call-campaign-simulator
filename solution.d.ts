import { CallHandler, CampaignConfig, CampaignStatus, ICampaign, IClock } from "./interfaces";
export declare class Campaign implements ICampaign {
    private config;
    private callHandler;
    private clock;
    private state;
    private totalProcessed;
    private totalFailed;
    private activeCalls;
    private pendingRetries;
    private dailyMinutesUsed;
    private currentDayDateString;
    private pendingNumbers;
    private retryCounts;
    constructor(config: CampaignConfig, callHandler: CallHandler, clock: IClock);
    start(): void;
    private nextProcess;
    private getMsUntilNextStartTime;
    private getMsUntilMidnight;
    private isWithinWorkingHours;
    private makeCall;
    private handleFailedCall;
    pause(): void;
    resume(): void;
    getStatus(): CampaignStatus;
}
//# sourceMappingURL=solution.d.ts.map