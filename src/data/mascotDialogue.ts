export interface MascotLine {
    trigger: 'greeting' | 'streak' | 'welcome_back';
    mascotId: string; // 'owl' | 'bear' | 'ant' | 'lion'
    emotion: 'happy' | 'excited' | 'thinking' | 'encourage';
    textKey: string;
}

// 3-4 lines per mascot per trigger (12-16 per mascot, ~48-64 total)
// textKey points to i18n keys like "mascot.greeting.owl.morning.streak0"
export const MASCOT_DIALOGUE: MascotLine[] = [
    // === OWL ===
    // Greeting - morning, streak 0 (welcome)
    { trigger: 'greeting', mascotId: 'owl', emotion: 'happy', textKey: 'mascot.greeting.owl.morning.welcome' },
    { trigger: 'greeting', mascotId: 'owl', emotion: 'happy', textKey: 'mascot.greeting.owl.morning.welcome2' },
    { trigger: 'greeting', mascotId: 'owl', emotion: 'happy', textKey: 'mascot.greeting.owl.morning.welcome3' },
    // Greeting - morning, streak 1-2 (encouraging)
    { trigger: 'greeting', mascotId: 'owl', emotion: 'encourage', textKey: 'mascot.greeting.owl.morning.streak1' },
    { trigger: 'greeting', mascotId: 'owl', emotion: 'encourage', textKey: 'mascot.greeting.owl.morning.streak2' },
    { trigger: 'greeting', mascotId: 'owl', emotion: 'happy', textKey: 'mascot.greeting.owl.morning.streak2b' },
    // Greeting - morning, streak 3+ (celebrating)
    { trigger: 'greeting', mascotId: 'owl', emotion: 'excited', textKey: 'mascot.greeting.owl.morning.streak3' },
    { trigger: 'greeting', mascotId: 'owl', emotion: 'excited', textKey: 'mascot.greeting.owl.morning.streak3b' },
    // Greeting - morning, streak 7+ (fire)
    { trigger: 'greeting', mascotId: 'owl', emotion: 'excited', textKey: 'mascot.greeting.owl.morning.streak7' },
    { trigger: 'greeting', mascotId: 'owl', emotion: 'excited', textKey: 'mascot.greeting.owl.morning.streak7b' },
    // Greeting - afternoon
    { trigger: 'greeting', mascotId: 'owl', emotion: 'happy', textKey: 'mascot.greeting.owl.afternoon.welcome' },
    { trigger: 'greeting', mascotId: 'owl', emotion: 'encourage', textKey: 'mascot.greeting.owl.afternoon.streak1' },
    { trigger: 'greeting', mascotId: 'owl', emotion: 'excited', textKey: 'mascot.greeting.owl.afternoon.streak3' },
    { trigger: 'greeting', mascotId: 'owl', emotion: 'excited', textKey: 'mascot.greeting.owl.afternoon.streak7' },
    // Greeting - evening
    { trigger: 'greeting', mascotId: 'owl', emotion: 'thinking', textKey: 'mascot.greeting.owl.evening.welcome' },
    { trigger: 'greeting', mascotId: 'owl', emotion: 'encourage', textKey: 'mascot.greeting.owl.evening.streak1' },
    { trigger: 'greeting', mascotId: 'owl', emotion: 'happy', textKey: 'mascot.greeting.owl.evening.streak3' },
    { trigger: 'greeting', mascotId: 'owl', emotion: 'excited', textKey: 'mascot.greeting.owl.evening.streak7' },

    // === BEAR ===
    { trigger: 'greeting', mascotId: 'bear', emotion: 'happy', textKey: 'mascot.greeting.bear.morning.welcome' },
    { trigger: 'greeting', mascotId: 'bear', emotion: 'happy', textKey: 'mascot.greeting.bear.morning.welcome2' },
    { trigger: 'greeting', mascotId: 'bear', emotion: 'happy', textKey: 'mascot.greeting.bear.morning.welcome3' },
    { trigger: 'greeting', mascotId: 'bear', emotion: 'encourage', textKey: 'mascot.greeting.bear.morning.streak1' },
    { trigger: 'greeting', mascotId: 'bear', emotion: 'encourage', textKey: 'mascot.greeting.bear.morning.streak2' },
    { trigger: 'greeting', mascotId: 'bear', emotion: 'happy', textKey: 'mascot.greeting.bear.morning.streak2b' },
    { trigger: 'greeting', mascotId: 'bear', emotion: 'excited', textKey: 'mascot.greeting.bear.morning.streak3' },
    { trigger: 'greeting', mascotId: 'bear', emotion: 'excited', textKey: 'mascot.greeting.bear.morning.streak3b' },
    { trigger: 'greeting', mascotId: 'bear', emotion: 'excited', textKey: 'mascot.greeting.bear.morning.streak7' },
    { trigger: 'greeting', mascotId: 'bear', emotion: 'excited', textKey: 'mascot.greeting.bear.morning.streak7b' },
    { trigger: 'greeting', mascotId: 'bear', emotion: 'happy', textKey: 'mascot.greeting.bear.afternoon.welcome' },
    { trigger: 'greeting', mascotId: 'bear', emotion: 'encourage', textKey: 'mascot.greeting.bear.afternoon.streak1' },
    { trigger: 'greeting', mascotId: 'bear', emotion: 'excited', textKey: 'mascot.greeting.bear.afternoon.streak3' },
    { trigger: 'greeting', mascotId: 'bear', emotion: 'excited', textKey: 'mascot.greeting.bear.afternoon.streak7' },
    { trigger: 'greeting', mascotId: 'bear', emotion: 'thinking', textKey: 'mascot.greeting.bear.evening.welcome' },
    { trigger: 'greeting', mascotId: 'bear', emotion: 'encourage', textKey: 'mascot.greeting.bear.evening.streak1' },
    { trigger: 'greeting', mascotId: 'bear', emotion: 'happy', textKey: 'mascot.greeting.bear.evening.streak3' },
    { trigger: 'greeting', mascotId: 'bear', emotion: 'excited', textKey: 'mascot.greeting.bear.evening.streak7' },

    // === ANT ===
    { trigger: 'greeting', mascotId: 'ant', emotion: 'happy', textKey: 'mascot.greeting.ant.morning.welcome' },
    { trigger: 'greeting', mascotId: 'ant', emotion: 'happy', textKey: 'mascot.greeting.ant.morning.welcome2' },
    { trigger: 'greeting', mascotId: 'ant', emotion: 'happy', textKey: 'mascot.greeting.ant.morning.welcome3' },
    { trigger: 'greeting', mascotId: 'ant', emotion: 'encourage', textKey: 'mascot.greeting.ant.morning.streak1' },
    { trigger: 'greeting', mascotId: 'ant', emotion: 'encourage', textKey: 'mascot.greeting.ant.morning.streak2' },
    { trigger: 'greeting', mascotId: 'ant', emotion: 'happy', textKey: 'mascot.greeting.ant.morning.streak2b' },
    { trigger: 'greeting', mascotId: 'ant', emotion: 'excited', textKey: 'mascot.greeting.ant.morning.streak3' },
    { trigger: 'greeting', mascotId: 'ant', emotion: 'excited', textKey: 'mascot.greeting.ant.morning.streak3b' },
    { trigger: 'greeting', mascotId: 'ant', emotion: 'excited', textKey: 'mascot.greeting.ant.morning.streak7' },
    { trigger: 'greeting', mascotId: 'ant', emotion: 'excited', textKey: 'mascot.greeting.ant.morning.streak7b' },
    { trigger: 'greeting', mascotId: 'ant', emotion: 'happy', textKey: 'mascot.greeting.ant.afternoon.welcome' },
    { trigger: 'greeting', mascotId: 'ant', emotion: 'encourage', textKey: 'mascot.greeting.ant.afternoon.streak1' },
    { trigger: 'greeting', mascotId: 'ant', emotion: 'excited', textKey: 'mascot.greeting.ant.afternoon.streak3' },
    { trigger: 'greeting', mascotId: 'ant', emotion: 'excited', textKey: 'mascot.greeting.ant.afternoon.streak7' },
    { trigger: 'greeting', mascotId: 'ant', emotion: 'thinking', textKey: 'mascot.greeting.ant.evening.welcome' },
    { trigger: 'greeting', mascotId: 'ant', emotion: 'encourage', textKey: 'mascot.greeting.ant.evening.streak1' },
    { trigger: 'greeting', mascotId: 'ant', emotion: 'happy', textKey: 'mascot.greeting.ant.evening.streak3' },
    { trigger: 'greeting', mascotId: 'ant', emotion: 'excited', textKey: 'mascot.greeting.ant.evening.streak7' },

    // === LION ===
    { trigger: 'greeting', mascotId: 'lion', emotion: 'happy', textKey: 'mascot.greeting.lion.morning.welcome' },
    { trigger: 'greeting', mascotId: 'lion', emotion: 'happy', textKey: 'mascot.greeting.lion.morning.welcome2' },
    { trigger: 'greeting', mascotId: 'lion', emotion: 'happy', textKey: 'mascot.greeting.lion.morning.welcome3' },
    { trigger: 'greeting', mascotId: 'lion', emotion: 'encourage', textKey: 'mascot.greeting.lion.morning.streak1' },
    { trigger: 'greeting', mascotId: 'lion', emotion: 'encourage', textKey: 'mascot.greeting.lion.morning.streak2' },
    { trigger: 'greeting', mascotId: 'lion', emotion: 'happy', textKey: 'mascot.greeting.lion.morning.streak2b' },
    { trigger: 'greeting', mascotId: 'lion', emotion: 'excited', textKey: 'mascot.greeting.lion.morning.streak3' },
    { trigger: 'greeting', mascotId: 'lion', emotion: 'excited', textKey: 'mascot.greeting.lion.morning.streak3b' },
    { trigger: 'greeting', mascotId: 'lion', emotion: 'excited', textKey: 'mascot.greeting.lion.morning.streak7' },
    { trigger: 'greeting', mascotId: 'lion', emotion: 'excited', textKey: 'mascot.greeting.lion.morning.streak7b' },
    { trigger: 'greeting', mascotId: 'lion', emotion: 'happy', textKey: 'mascot.greeting.lion.afternoon.welcome' },
    { trigger: 'greeting', mascotId: 'lion', emotion: 'encourage', textKey: 'mascot.greeting.lion.afternoon.streak1' },
    { trigger: 'greeting', mascotId: 'lion', emotion: 'excited', textKey: 'mascot.greeting.lion.afternoon.streak3' },
    { trigger: 'greeting', mascotId: 'lion', emotion: 'excited', textKey: 'mascot.greeting.lion.afternoon.streak7' },
    { trigger: 'greeting', mascotId: 'lion', emotion: 'thinking', textKey: 'mascot.greeting.lion.evening.welcome' },
    { trigger: 'greeting', mascotId: 'lion', emotion: 'encourage', textKey: 'mascot.greeting.lion.evening.streak1' },
    { trigger: 'greeting', mascotId: 'lion', emotion: 'happy', textKey: 'mascot.greeting.lion.evening.streak3' },
    { trigger: 'greeting', mascotId: 'lion', emotion: 'excited', textKey: 'mascot.greeting.lion.evening.streak7' },
];

export type TimeOfDay = 'morning' | 'afternoon' | 'evening';
export type StreakLevel = 'welcome' | 'streak1' | 'streak3' | 'streak7';

export function getTimeOfDay(): TimeOfDay {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    return 'evening';
}

export function getStreakLevel(streak: number): StreakLevel {
    if (streak === 0) return 'welcome';
    if (streak <= 2) return 'streak1';
    if (streak < 7) return 'streak3';
    return 'streak7';
}

export function getMascotGreeting(mascotId: string, streak: number): MascotLine | null {
    const timeOfDay = getTimeOfDay();
    const streakLevel = getStreakLevel(streak);

    // Build the expected textKey pattern: mascot.greeting.{mascotId}.{timeOfDay}.{streakLevel}
    const expectedKey = `mascot.greeting.${mascotId}.${timeOfDay}.${streakLevel}`;

    // Find all matching lines
    const matching = MASCOT_DIALOGUE.filter(
        line => line.mascotId === mascotId && line.textKey.startsWith(expectedKey)
    );

    if (matching.length === 0) return null;

    // Pick a random one
    return matching[Math.floor(Math.random() * matching.length)];
}