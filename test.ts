import { Campaign } from './solution';
import { IClock, CallHandler, CallResult } from './interfaces';

// 1. إنشاء ساعة حقيقية للاختبار
class RealClock implements IClock {
    now(): number { return Date.now(); }
    setTimeout(callback: () => void, delayMs: number): number {
        return setTimeout(callback, delayMs) as any;
    }
    clearTimeout(id: number): void {
        clearTimeout(id);
    }
}

// 2. محاكي للمكالمات (بيرد عشوائياً وبياخد وقت عشوائي)
const mockCallHandler: CallHandler = async (phoneNumber: string): Promise<CallResult> => {
    console.log(`[Call Started] Dialing ${phoneNumber}...`);
    return new Promise((resolve) => {
        setTimeout(() => {
            const answered = Math.random() > 0.4; // نسبة الرد 60%
            const durationMs = Math.floor(Math.random() * 5000) + 1000; // مدة المكالمة ما بين ثانية لـ 6 ثواني
            console.log(`[Call Ended] ${phoneNumber} | Answered: ${answered} | Duration: ${durationMs}ms`);
            resolve({ answered, durationMs });
        }, 1000); // وقت المحاكاة في الكونسول (ثانية واحدة لكل مكالمة)
    });
};

// 3. إعدادات الحملة
const config = {
    customerList: ['010', '011', '012', '015', '0100', '0111', '0122'],
    startTime: '00:00', // عشان تشتغل فأي وقت نجرب فيه
    endTime: '23:59',
    maxConcurrentCalls: 2, // مكالمتين في نفس الوقت كحد أقصى
    maxDailyMinutes: 120,
    maxRetries: 2,
    retryDelayMs: 2000 // إعادة المحاولة بعد ثانيتين عشان نشوفها بتتدخل
};

// 4. تشغيل الحملة
const clock = new RealClock();
const campaign = new Campaign(config, mockCallHandler, clock);

console.log('--- Starting Campaign Simulation ---');
campaign.start();

// 5. طباعة حالة الحملة كل ثانية
const interval = setInterval(() => {
    const status = campaign.getStatus();
    console.log('--- Current Status ---', status);
    
    if (status.state === 'completed') {
        console.log('--- Campaign Finished! ---');
        clearInterval(interval);
    }
}, 1000);