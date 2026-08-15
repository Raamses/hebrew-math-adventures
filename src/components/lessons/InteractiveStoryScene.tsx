import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import type { LessonItem, LessonTarget, LessonTheme, LessonType } from '../../types/lesson';
import { SLOT_SPACING_X, SLOT_SPACING_Y } from '../../engines/LessonEngine';
import { SceneBackdrop, THEME_PALETTES } from './scene/sceneThemes';
import { ItemSprite, TargetArt } from './scene/LessonSprites';

interface InteractiveStorySceneProps {
    theme: LessonTheme;
    /** Drives whether sprites are draggable, tappable, or inert. */
    stepType: LessonType;
    items: LessonItem[];
    targets: LessonTarget[];
    /** `targetId` is null when the item was released over empty space. */
    onDrop: (itemId: string, targetId: string | null) => void;
    onTap: (itemId: string) => void;
}

/** Base sprite edge in px before a per-item `scale` multiplier. */
const SPRITE_PX = 64;

/**
 * The scene is authored in a percentage coordinate space (0-100 on both axes)
 * that is deliberately **direction-agnostic**: `left: 40%` means 40% from the
 * visual left in Hebrew and in English alike. Lesson positions therefore never
 * need mirroring, and the drag hit-testing math stays correct under RTL.
 *
 * Only text (labels, the equation) follows the document direction.
 */
export const InteractiveStoryScene: React.FC<InteractiveStorySceneProps> = ({
    theme,
    stepType,
    items,
    targets,
    onDrop,
    onTap,
}) => {
    const { t } = useTranslation();
    const palette = THEME_PALETTES[theme] ?? THEME_PALETTES.mountain;

    const isDragStep = stepType === 'interactive_drag';
    const isTapStep = stepType === 'interactive_tap';

    return (
        <div
            data-testid="story-scene"
            data-theme={theme}
            dir="ltr"
            className={`absolute inset-0 overflow-hidden ${palette.containerClass}`}
        >
            <SceneBackdrop theme={theme} />

            {/* --- Targets --- */}
            {targets.map(target => {
                const columns = target.columns ?? Math.min(target.capacity, 5);
                const rows = Math.ceil(target.capacity / columns);
                const visual = target.visual ?? 'basket';

                return (
                    <div
                        key={target.id}
                        data-target-id={target.id}
                        data-testid={`lesson-target-${target.id}`}
                        className="absolute -translate-x-1/2 -translate-y-1/2"
                        style={{
                            left: `${target.position.x}%`,
                            top: `${target.position.y}%`,
                            // Sized to exactly `columns x rows` engine slots so the drawn
                            // cells coincide with where dropped items snap.
                            width: `${columns * SLOT_SPACING_X}%`,
                            height: `${rows * SLOT_SPACING_Y}%`,
                        }}
                    >
                        <TargetArt
                            visual={visual}
                            columns={columns}
                            rows={rows}
                            capacity={target.capacity}
                            currentCount={target.currentCount}
                            animal={target.animal}
                            palette={palette}
                        />

                        {!target.hideCounter && (
                            <div
                                data-testid={`lesson-target-count-${target.id}`}
                                dir="ltr"
                                className="absolute -bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-white px-3 py-0.5 text-lg font-black shadow-md"
                                style={{ color: palette.ink, border: `2px solid ${palette.ink}` }}
                            >
                                {target.currentCount} / {target.capacity}
                            </div>
                        )}

                        {target.label && (
                            <div
                                dir="auto"
                                className="absolute -bottom-10 left-1/2 w-max -translate-x-1/2 rounded-full bg-white/85 px-3 py-0.5 text-base font-bold shadow-sm"
                                style={{ color: palette.ink }}
                            >
                                {t(target.label)}
                            </div>
                        )}
                    </div>
                );
            })}

            {/* --- Items --- */}
            <AnimatePresence>
                {items.filter(item => !item.removed).map(item => {
                    const scale = item.scale ?? 1;
                    const size = SPRITE_PX * scale;
                    const isScenery = item.interactive === false;
                    // A placed item has found its home — it must not be re-dragged,
                    // otherwise a child can empty a target the engine still counts as full.
                    const draggable = isDragStep && !isScenery && !item.placedIn;
                    const tappable = isTapStep && !isScenery && (item.tapAction ?? 'remove') !== 'none';

                    return (
                        <motion.div
                            key={item.id}
                            data-testid={`lesson-item-${item.id}`}
                            data-item-type={item.type}
                            layout
                            initial={{ opacity: 0, scale: 0.6 }}
                            animate={{
                                opacity: 1,
                                scale: item.selected ? 1.15 : 1,
                            }}
                            exit={{ opacity: 0, scale: 0.3, y: -30, transition: { duration: 0.28 } }}
                            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
                            drag={draggable}
                            dragMomentum={false}
                            whileDrag={{ scale: 1.25 * scale, zIndex: 100, rotate: 8, pointerEvents: 'none' }}
                            onDragEnd={(_e, info) => {
                                // Hit-test the drop point against the target layer. framer-motion
                                // leaves the element transformed, so we ask the document what is
                                // under the pointer rather than comparing rects ourselves.
                                const el = document.elementFromPoint(info.point.x, info.point.y);
                                const targetEl = el?.closest('[data-target-id]');
                                onDrop(item.id, targetEl?.getAttribute('data-target-id') ?? null);
                            }}
                            onClick={tappable ? () => onTap(item.id) : undefined}
                            // Keyboard parity for tap steps — drag remains pointer-only.
                            role={tappable ? 'button' : undefined}
                            tabIndex={tappable ? 0 : undefined}
                            onKeyDown={
                                tappable
                                    ? (e: React.KeyboardEvent) => {
                                          if (e.key === 'Enter' || e.key === ' ') {
                                              e.preventDefault();
                                              onTap(item.id);
                                          }
                                      }
                                    : undefined
                            }
                            className={`absolute flex touch-none flex-col items-center justify-center ${
                                draggable ? 'cursor-grab active:cursor-grabbing' : tappable ? 'cursor-pointer' : 'pointer-events-none'
                            }`}
                            style={{
                                left: `${item.position.x}%`,
                                top: `${item.position.y}%`,
                                width: size,
                                height: size,
                                marginLeft: -size / 2,
                                marginTop: -size / 2,
                                filter: item.selected ? `drop-shadow(0 0 10px ${palette.slot})` : undefined,
                            }}
                        >
                            <ItemSprite type={item.type} value={item.value} animal={item.animal} />

                            {item.label && (
                                <span
                                    dir="auto"
                                    className="absolute -bottom-6 w-max rounded-full bg-white/85 px-2 text-sm font-bold shadow-sm"
                                    style={{ color: palette.ink }}
                                >
                                    {t(item.label)}
                                </span>
                            )}
                        </motion.div>
                    );
                })}
            </AnimatePresence>
        </div>
    );
};
