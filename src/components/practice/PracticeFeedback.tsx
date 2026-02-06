import React from 'react';
import { useProfile } from '../../context/ProfileContext';
import { Mascot, type MascotEmotion } from '../mascot/Mascot';
import { SpeechBubble } from '../mascot/SpeechBubble';
import { FlyingStars } from '../Effects';
import { Confetti } from '../Confetti';
import { FrenzyOverlay } from '../games/FrenzyOverlay';

interface PracticeFeedbackProps {
    mascotEmotion: MascotEmotion;
    mascotMessage: string;
    showBubble: boolean;
    showStars: boolean;
    showConfetti: boolean;
    onStarsComplete: () => void;
}

export const PracticeFeedback: React.FC<PracticeFeedbackProps> = ({
    mascotEmotion,
    mascotMessage,
    showBubble,
    showStars,
    showConfetti,
    onStarsComplete
}) => {
    const { profile } = useProfile();

    return (
        <>
            <FrenzyOverlay isActive={(profile?.streak || 0) >= 5} />
            {showStars && <FlyingStars onComplete={onStarsComplete} />}
            {showConfetti && <Confetti />}

            {/* Mascot - Hidden on Mobile, Fixed Bottom-Right on Desktop */}
            <div className="hidden md:block fixed bottom-4 right-4 z-0 pointer-events-none">
                <div className="relative">
                    {/* Speech Bubble pops UP from the bottom */}
                    <SpeechBubble
                        text={mascotMessage}
                        isVisible={showBubble}
                        position="center"
                        className="mb-2"
                    />
                    <Mascot
                        character={profile?.mascotId || 'owl'}
                        emotion={mascotEmotion}
                    />
                </div>
            </div>
        </>
    );
};
