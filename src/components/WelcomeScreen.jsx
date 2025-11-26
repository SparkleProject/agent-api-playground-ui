import { Sparkles } from 'lucide-react';

export default function WelcomeScreen() {
    const userName = 'EC'; // Could be dynamic based on user data
    const greeting = getGreeting();

    return (
        <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-8 max-w-3xl px-6">
                {/* Icon and Greeting */}
                <div className="space-y-4">
                    <div className="flex items-center justify-center gap-3">
                        <Sparkles className="w-8 h-8 text-orange-500" />
                        <h1 className="text-4xl font-light text-foreground tracking-tight">
                            {greeting}, {userName}
                        </h1>
                    </div>
                </div>
            </div>
        </div>
    );
}

function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
}
