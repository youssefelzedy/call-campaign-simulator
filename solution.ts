import type { CallHandler, CampaignConfig, CampaignState, CampaignStatus, ICampaign, IClock } from "./interfaces.js";

export class Campaign implements ICampaign {
    private config: CampaignConfig;
    private callHandler: CallHandler;
    private clock: IClock;

    private state: CampaignState = "idle";
    private totalProcessed: number = 0;
    private totalFailed: number = 0;
    private activeCalls: number = 0;
    private pendingRetries: number = 0;
    private dailyMinutesUsed: number = 0;
    private currentDayDateString: string = "";

    private pendingNumbers: string[];

    private retryCounts: Map<string, number>; 



    constructor(config: CampaignConfig, callHandler: CallHandler, clock: IClock) {
        this.config = config;
        this.callHandler = callHandler;
        this.clock = clock;

        this.pendingNumbers = [...config.customerList];

        this.retryCounts = new Map<string, number>();
    }

    start(): void {

        if (this.state === "running" || this.state === "completed") return;

        this.state = "running";

        this.nextProcess();
    }

    private nextProcess(): void {
        if (this.state !== "running") return;

        const date = new Date(this.clock.now());
        const todayString = `${date.getUTCFullYear()}-${date.getUTCMonth()}-${date.getUTCDate()}`;
        if (this.currentDayDateString !== todayString) {
            this.currentDayDateString = todayString;
            this.dailyMinutesUsed = 0;
        }

        if (this.activeCalls >= this.config.maxConcurrentCalls) return;

        if(!this.isWithinWorkingHours()) {
            const msUntilNextStart = this.getMsUntilNextStartTime();
            this.clock.setTimeout(() => {
                this.nextProcess();
            }, msUntilNextStart);
            return;
        }

        if (this.dailyMinutesUsed >= this.config.maxDailyMinutes)
        {
            const msUntilMidnight = this.getMsUntilMidnight();
            this.clock.setTimeout(() => {
                this.nextProcess();
            }, msUntilMidnight);
            return;
        }

        if (this.pendingNumbers.length === 0 && this.pendingRetries === 0) {
            if (this.activeCalls === 0) {
                this.state = "completed";
            }
            return;
        }

        while (this.activeCalls < this.config.maxConcurrentCalls) {
            const currentNumber = this.pendingNumbers.shift();
            if (currentNumber) {
                this.makeCall(currentNumber);
            } else {
                break;
            }
        }
    }

    private getMsUntilNextStartTime(): number {
        const now = new Date(this.clock.now());
        const [startHour = 0, startMinute = 0] = this.config.startTime.split(':').map(Number);

        const nextStartTime = new Date(now);
        nextStartTime.setUTCHours(startHour, startMinute, 0, 0);

        if (nextStartTime <= now) {
            nextStartTime.setUTCDate(nextStartTime.getUTCDate() + 1);
        }

        return nextStartTime.getTime() - now.getTime();
    }

    private getMsUntilMidnight() : number {
        const now = new Date(this.clock.now());

        const nextMidnight = new Date(now);
        nextMidnight.setUTCDate(nextMidnight.getUTCDate() + 1);
        nextMidnight.setUTCHours(0, 0, 0, 0);

        return nextMidnight.getTime() - now.getTime();
    }

    private isWithinWorkingHours(): boolean {
        const date = new Date(this.clock.now());
        const hours = date.getUTCHours().toString().padStart(2, '0');
        const minutes = date.getUTCMinutes().toString().padStart(2, '0');
        const currentTime = `${hours}:${minutes}`;

        return currentTime >= this.config.startTime && currentTime < this.config.endTime;
    }

    private makeCall(phoneNumber: string): void {
        this.activeCalls++;

        this.callHandler(phoneNumber).then((result) => {
            this.activeCalls--;

            const min = result.durationMs / 60000;
            this.dailyMinutesUsed += min;

            if (result.answered) {
                this.totalProcessed++;
            }
            else {
                this.handleFailedCall(phoneNumber);
            }

            this.nextProcess();
        });
    }

    private handleFailedCall(phoneNumber: string): void {
        const retries = this.retryCounts.get(phoneNumber) || 0;

        if (retries < this.config.maxRetries) {
            this.retryCounts.set(phoneNumber, retries + 1);
            this.pendingRetries++;

            this.clock.setTimeout(() => {
                this.pendingRetries--;
                this.pendingNumbers.push(phoneNumber);
                this.nextProcess();
            }, this.config.retryDelayMs);
        }
        else {
            this.totalFailed++;
        }
    }

    pause(): void {
        this.state = "paused";
    }

    resume(): void {
        if (this.state === "paused") {
            this.state = "running";
            this.nextProcess();
        }
    }

    getStatus(): CampaignStatus {
        return {
            state: this.state,
            totalProcessed: this.totalProcessed,
            totalFailed: this.totalFailed,
            activeCalls: this.activeCalls,
            pendingRetries: this.pendingRetries,
            dailyMinutesUsed: this.dailyMinutesUsed
        };
    }
}