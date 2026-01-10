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

            <div className="relative mt-4 ml-auto md:absolute md:right-4 md:bottom-12 z-20 pointer-events-none">
                <div className="relative">
                    <SpeechBubble text={mascotMessage} isVisible={showBubble} />
                    <Mascot
                        character={profile?.mascotId || 'owl'}
                        emotion={mascotEmotion}
                    />
                </div>
            </div>
        </>
    );
};
