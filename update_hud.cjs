const fs = require('fs');

const path = 'src/components/games/ArcadeHUD.tsx';
let content = fs.readFileSync(path, 'utf8');

const importSearch = "import React, { useEffect, useState } from 'react';";
const importReplace = "import React, { useEffect, useState, useRef } from 'react';";
content = content.replace(importSearch, importReplace);

const stateSearch = "const [displayScore, setDisplayScore] = useState(score);";
const stateReplace = `const [displayScore, setDisplayScore] = useState(score);
    const displayScoreRef = useRef(displayScore);`;
content = content.replace(stateSearch, stateReplace);

const effectSearch = `    useEffect(() => {
        // Simple lerp effect for score
        const interval = setInterval(() => {
            setDisplayScore(prev => {
                if (prev < score) return prev + Math.ceil((score - prev) / 5);
                return score;
            });
        }, 16);
        return () => clearInterval(interval);
    }, [score]);`;

const effectReplace = `    useEffect(() => {
        let animationFrameId: number;

        // ⚡ Bolt: Optimized lerp effect using requestAnimationFrame instead of setInterval.
        // This syncs with the display refresh rate, prevents execution when the tab is hidden,
        // and completely stops running once the target score is reached, saving CPU cycles.
        const updateScore = () => {
            if (displayScoreRef.current < score) {
                const next = displayScoreRef.current + Math.ceil((score - displayScoreRef.current) / 5);
                displayScoreRef.current = next;
                setDisplayScore(next);
                animationFrameId = requestAnimationFrame(updateScore);
            } else if (displayScoreRef.current > score) {
                displayScoreRef.current = score;
                setDisplayScore(score);
            }
        };

        animationFrameId = requestAnimationFrame(updateScore);

        return () => cancelAnimationFrame(animationFrameId);
    }, [score]);`;

content = content.replace(effectSearch, effectReplace);

fs.writeFileSync(path, content, 'utf8');
