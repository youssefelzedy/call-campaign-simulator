import { Campaign } from './solution.js';
import type { IClock, CallHandler, CallResult } from './interfaces.js';

class RealClock implements IClock {
    now(): number { return Date.now(); }
    setTimeout(callback: () => void, delayMs: number): number {
        return setTimeout(callback, delayMs) as any;
    }
    clearTimeout(id: number): void {
        clearTimeout(id);
    }
}

const mockCallHandler: CallHandler = async (phoneNumber: string): Promise<CallResult> => {
    console.log(`[Call Started] Dialing ${phoneNumber}...`);
    return new Promise((resolve) => {
        setTimeout(() => {
            const answered = Math.random() > 0.4; 
            const durationMs = Math.floor(Math.random() * 5000) + 1000; 
            console.log(`[Call Ended] ${phoneNumber} | Answered: ${answered} | Duration: ${durationMs}ms`);
            resolve({ answered, durationMs });
        }, 1000); 
    });
};

const config = {
    customerList: ['010', '011', '012', '015', '0100', '0111', '0122'],
    startTime: '00:00',
    endTime: '23:59',
    maxConcurrentCalls: 2, 
    maxDailyMinutes: 120,
    maxRetries: 2,
    retryDelayMs: 2000 
};

const clock = new RealClock();
const campaign = new Campaign(config, mockCallHandler, clock);

console.log('--- Starting Campaign Simulation ---');
campaign.start();

const interval = setInterval(() => {
    const status = campaign.getStatus();
    console.log('--- Current Status ---', status);
    
    if (status.state === 'completed') {
        console.log('--- Campaign Finished! ---');
        clearInterval(interval);
    }
}, 1000);