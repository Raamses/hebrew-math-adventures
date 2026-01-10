import React, { useEffect, useRef, useState } from 'react';
import { CURRICULUM } from '../../data/learningPath';
import { useProgress } from '../../context/ProgressContext';
import type { LearningNode } from '../../types/learningPath';
import { LogOut, Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { useAnalytics } from '../../hooks/useAnalytics';
import { useResponsivePath } from '../../hooks/useResponsivePath';
import { MapNode } from './MapNode';
import sagaBg from '../../assets/map/saga_bg.png';

interface SagaMapProps {
    onNodeSelect: (node: LearningNode) => void;
    onLogout: () => void;
    onArcadeMode: () => void;
}

export const SagaMap: React.FC<SagaMapProps> = ({ onNodeSelect, onLogout, onArcadeMode }) => {
    const { isNodeLocked, getStars } = useProgress();
    const { t, i18n } = useTranslation();
    const { logEvent } = useAnalytics();
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

    const isRtl = i18n.language === 'he';

    // Flatten all nodes for the continuous path
    const allNodes = CURRICULUM.flatMap(unit => unit.nodes);

    useEffect(() => {
        const updateDimensions = () => {
            if (containerRef.current) {
                setDimensions({
                    width: containerRef.current.offsetWidth,
                    height: containerRef.current.offsetHeight || window.innerHeight // Fallback if height is 0 initially
                });
            }
        };

        window.addEventListener('resize', updateDimensions);
        updateDimensions();

        // Small delay to ensure container is rendered
        const timer = setTimeout(updateDimensions, 100);

        return () => {
            window.removeEventListener('resize', updateDimensions);
            clearTimeout(timer);
        };
    }, []);

    const pathPoints = useResponsivePath(allNodes.length, dimensions.width, allNodes.length * 120); // 120px vertical spacing per node

    useEffect(() => {
        document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
        document.documentElement.lang = i18n.language;
    }, [isRtl, i18n.language]);

    const toggleLanguage = () => {
        i18n.changeLanguage(i18n.language === 'en' ? 'he' : 'en');
    };

    // Construct SVG path string from points
    const svgPath = pathPoints.length > 0
        ? `M ${pathPoints[0].x} ${pathPoints[0].y} ` +
        pathPoints.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ')
        : '';

    return (
        <div
            className="w-full min-h-screen pb-20 overflow-y-auto relative"
            dir={isRtl ? 'rtl' : 'ltr'}
        >
            {/* Fixed Background Layer */}
            <div className="fixed inset-0 z-0 w-full h-full pointer-events-none">
                <img
                    src={sagaBg}
                    alt="World Map Background"
                    className="w-full h-full object-cover"
                />
            </div>
            {/* Header */}
            <header className="sticky top-0 bg-white/80 backdrop-blur-md z-50 shadow-sm border-b border-white/20 px-4 py-3 flex items-center justify-between">
                <button
                    onClick={toggleLanguage}
                    className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors flex gap-2 items-center"
                    title={t('app.switchLanguage')}
                >
                    <Globe size={20} />
                    <span className="text-sm font-bold">{i18n.language.toUpperCase()}</span>
                </button>

                <h1 className="text-xl font-black text-slate-800 drop-shadow-sm">
                    {t('app.journey')}
                </h1>

                <div className="flex gap-2">
                    <button
                        onClick={onArcadeMode}
                        className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-full text-sm font-bold shadow-md transition-all active:scale-95 flex items-center gap-1"
                    >
                        <Globe size={16} />
                        <span>{t('app.arcade')}</span>
                    </button>

                    <button
                        onClick={onLogout}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                        title={t('menu.logout')}
                    >
                        <LogOut size={20} />
                    </button>
                </div>
            </header>

            {/* Map Container */}
            <div
                ref={containerRef}
                className="relative mx-auto max-w-2xl min-h-screen"
                style={{ height: `${allNodes.length * 120 + 300}px` }} // Ensure total height covers all nodes + padding
            >
                {/* Path SVG */}
                <svg className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-visible z-0">
                    <path
                        d={svgPath}
                        fill="none"
                        stroke="#e2c48d" // Dirt path color
                        strokeWidth="40"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="opacity-90 drop-shadow-sm"
                    />
                    <path
                        d={svgPath}
                        fill="none"
                        stroke="#d4b47d" // Inner dirt detail
                        strokeWidth="30"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeDasharray="10 15"
                        className="opacity-60"
                    />
                </svg>

                {/* Nodes */}
                {pathPoints.length > 0 && allNodes.map((node, i) => {
                    const point = pathPoints[i];
                    const locked = isNodeLocked(node.id);
                    const stars = getStars(node.id);

                    // Add simple decorative elements randomly around nodes?
                    // For now, keep it clean.

                    return (
                        <MapNode
                            key={node.id}
                            node={node}
                            index={i}
                            locked={locked}
                            stars={stars}
                            x={point.x}
                            y={point.y}
                            onSelect={(n) => {
                                logEvent('node_select', {
                                    node_id: n.id,
                                    is_locked: isNodeLocked(n.id)
                                });
                                onNodeSelect(n);
                            }}
                        />
                    );
                })}
            </div>

            {/* Simple decoration at start */}
            <div className="absolute top-[100px] left-10 pointer-events-none opacity-50 font-handwriting text-2xl text-slate-600 -rotate-12">
                Start!
            </div>
        </div>
    );
};
