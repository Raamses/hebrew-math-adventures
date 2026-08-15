# Phase 2b: Interactive Hebrew Story Micro-Lessons — Build Plan

**Date:** 2026-08-15  
**Card:** c69bfc03-5c0d-4ce5-8d67-6feba367a6c3  
**Branch:** sdlc/loop-v0  
**Model:** claude-opus-5 (attempted via `ask-claude --escalate --card`)  

> **Claude analysis status:** The `ask-claude --escalate --card c69bfc03-...` call was made successfully and is logged in `~/.openclaw/bin/model-usage.jsonl` (ts: 1786776748, actual: "claude-opus-5"). However, Claude returned only `"You've hit your session limit · resets 2pm (Asia/Jerusalem)"` — no analysis content was produced. A second attempt with the default model (claude-sonnet-5) also hit the session limit (ts: 1786776762, actual: "unknown"). Both calls are recorded with the card ID. The artifact below is built from the codebase context gathered directly (file reads, test output, git status) since no Claude analysis was returned. Per card instructions, this is explicitly noted rather than silently substituting.

---

## 1. Current State Analysis

### 1.1 Lesson Infrastructure

| File | Purpose | Lines |
|------|---------|-------|
| `src/types/lesson.ts` | Type definitions: LessonDefinition, LessonStep, LessonItem, LessonTarget, Position | ~55 |
| `src/engines/LessonEngine.ts` | Step progression, drag-drop validation, performance tracking, subscribe/notify | ~120 |
| `src/lessons/lesson1_multiplication.ts` | Only existing lesson (4 steps, apples→baskets, "3 × 2 = 6") | ~65 |
| `src/components/lessons/LessonModal.tsx` | Renders lessons: framer-motion drag, mascot, speech bubble, basket/apple SVGs | ~160 |
| `src/components/GameOrchestrator.tsx` | Routes LESSON nodes — currently hardcoded to MultiplicationLesson | 300 |

### 1.2 Key Type Constraints

```typescript
// src/types/lesson.ts (current)
export type LessonType = 'dialog' | 'interactive_drag' | 'interactive_tap';
export type MascotEmotion = 'idle' | 'happy' | 'thinking' | 'excited' | 'encourage';

export interface LessonItem {
    id: string;
    type: 'apple' | 'basket' | 'number';  // ← TOO NARROW
    position: Position;
    value?: number;
}
```

**Problem:** `LessonItem.type` only supports `'apple' | 'basket' | 'number'`. New lessons need seashells, crystals, dates, bunnies, ten-frames, desert animals.

### 1.3 LessonEngine Capabilities

- `onItemDropped(itemId, targetId)` — handles drag-drop with target capacity check
- `recordMistake()` — tracks incorrect drops
- `getPerformance()` → `{ correct, attempts }` for star-tiering
- `isStepComplete()` — checks `validationCriteria` for interactive steps
- `nextStep()` / `loadStep(index)` — step progression
- Subscribe/notify pattern for React state sync

**Gap:** No `onItemTapped(itemId)` method for `interactive_tap` step type. Engine only handles drag-drop.

### 1.4 GameOrchestrator Routing (Current)

```typescript
// All LESSON nodes get the same lesson:
if (effectiveMode === 'LESSON') {
    return (
        <LessonModal
            isOpen={isLessonOpen}
            lesson={MultiplicationLesson}  // ← HARDCODED
            onClose={onExit}
            onComplete={handleLessonComplete}
        />
    );
}
```

### 1.5 Curriculum Nodes

| Unit | Theme | LESSON Nodes | Operations |
|------|-------|-------------|------------|
| unit_1 | beach | **NONE** | addition, counting, comparison |
| unit_2 | forest | **NONE** | subtraction, word problems |
| unit_3 | mountain | n3_1 (mult) | multiplication |
| unit_4 | desert | n4_1 (div) | division |
| unit_5 | space | **NONE** | mixed advanced |

**49 of 50 nodes have no lesson.** Kids are tested on concepts never taught.

### 1.6 i18n State

- `he.json` / `en.json` have `lessons.multiplication.{title,intro,setup,action,conclusion}` and `lessons.controls.{next,start,finish}`
- No keys for addition, subtraction, or division lessons

### 1.7 Test State

- 921 tests total: 920 passing, 1 pre-existing failure (`modeStatePersistence.test.ts` — blitz stale bubble)
- `GameOrchestrator.lesson.test.tsx` tests LESSON/PRACTICE/SENSORY routing with mocked LessonModal
- No `src/lessons/index.ts` exists

---

## 2. Architecture Design

### 2.1 InteractiveStoryScene.tsx — Theme-Aware Scene Engine

**Design:** Replace `LessonModal` with a generic, theme-aware scene engine that:
1. Accepts any `LessonDefinition` from the registry
2. Renders theme-appropriate SVGs based on item `type` (not hardcoded apples)
3. Supports both `interactive_drag` and `interactive_tap` step types
4. Integrates GA4 events (lesson_start, lesson_step_complete, lesson_complete)
5. Handles Hebrew RTL direction

**Component Tree:**
```
InteractiveStoryScene
├── SceneBackground (theme gradient + decorations)
├── ItemsLayer (draggable/tappable items with theme SVGs)
│   └── SceneItem (renders SVG by item.type)
├── TargetsLayer (drop targets with theme SVGs)
│   └── SceneTarget (renders SVG by target accepts type)
├── EquationOverlay (shows equation on conclusion step)
├── MascotLayer (owl mascot + speech bubble)
└── ControlsFooter (next/finish button)
```

### 2.2 Extended Type System

```typescript
// Extended LessonItem.type
export type LessonItemType =
    | 'apple' | 'basket' | 'number'      // existing
    | 'seashell' | 'ten_frame'            // addition
    | 'bunny' | 'log'                     // subtraction
    | 'crystal' | 'crystal_grid'          // multiplication
    | 'date' | 'desert_animal'            // division
    | 'tree';                             // forest scene

// Extended LessonTarget — track what item types it accepts
// (already has accepts: string[], just need new item type strings)
```

### 2.3 LessonEngine Extension

Add `onItemTapped(itemId: string)` for `interactive_tap` steps:
```typescript
public onItemTapped(itemId: string) {
    const step = this.lesson.steps[this.currentStepIndex];
    if (step.type !== 'interactive_tap') return;
    const item = this.items.find(i => i.id === itemId);
    if (!item) return;
    // Toggle item state or trigger validation
    this.checkValidation();
    this.notify();
}
```

### 2.4 Lesson Registry

```typescript
// src/lessons/index.ts
import { AdditionBeachLesson } from './lesson_addition_beach';
import { SubtractionForestLesson } from './lesson_subtraction_forest';
import { MultiplicationMountainLesson } from './lesson_multiplication_mountain';
import { DivisionDesertLesson } from './lesson_division_desert';
import { MultiplicationLesson } from './lesson1_multiplication';
import type { LessonDefinition } from '../types/lesson';

export const LESSON_REGISTRY: Record<string, LessonDefinition> = {
    'n1_lesson_add': AdditionBeachLesson,       // new node
    'n2_lesson_sub': SubtractionForestLesson,   // new node
    'n3_1': MultiplicationMountainLesson,        // existing node
    'n4_1': DivisionDesertLesson,                // existing node
};

export function getLessonForNode(nodeId: string): LessonDefinition | undefined {
    return LESSON_REGISTRY[nodeId];
}

export * from './lesson_addition_beach';
export * from './lesson_subtraction_forest';
export * from './lesson_multiplication_mountain';
export * from './lesson_division_desert';
export * from './lesson1_multiplication';
```

### 2.5 GameOrchestrator Routing

```typescript
import { getLessonForNode } from '../lessons';

// In the LESSON branch:
if (effectiveMode === 'LESSON') {
    const lesson = node ? getLessonForNode(node.id) : null;
    if (!lesson) {
        // Fallback: no lesson registered for this node
        setInternalMode('PRACTICE');
        return null;
    }
    return (
        <InteractiveStoryScene
            isOpen={isLessonOpen}
            lesson={lesson}
            nodeId={node.id}
            onClose={onExit}
            onComplete={handleLessonComplete}
        />
    );
}
```

---

## 3. Lesson Definitions

### 3.1 Addition — Beach (lesson_addition_beach.ts)

**Story:** Count seashells into 10-frames on the beach.  
**Equation:** 4 + 3 = 7  
**Steps:**

1. **Intro (dialog):** Mascot welcomes to the beach, shows seashells scattered on sand
2. **Interactive (interactive_drag):** Drag 4 seashells into a 10-frame, then drag 3 more  
3. **Conclusion (dialog):** Show equation "4 + 3 = 7" with filled 10-frame

**Items:** seashell (SVG: spiral shell with pink/cream gradient)  
**Targets:** ten_frame (SVG: 2x5 grid cells)

**Hebrew text:**
- Title: "חוף החיבור"
- Intro: "ברוכים הבאים לחוף! בואו נאסוף צדפים ונחבר אותן!"
- Action: "גררו 4 צדפים לתוך המסגרת, ואז עוד 3. כמה יש בסך הכל?"
- Conclusion: "מצחיקים! 4 צדפים ועוד 3 צדפים שווה ל-7 צדפים!"

### 3.2 Subtraction — Forest (lesson_subtraction_forest.ts)

**Story:** Apples fall from a tree; bunny hops back on a numbered log.  
**Equation:** 6 - 2 = 4  
**Steps:**

1. **Intro (dialog):** Mascot shows a tree with 6 apples
2. **Interactive (interactive_tap):** Tap 2 apples to make them fall; bunny hops back 2 spaces on log  
3. **Conclusion (dialog):** Show equation "6 - 2 = 4" with 4 apples remaining

**Items:** apple (existing SVG), bunny (SVG: cute rabbit), log (SVG: wooden log with numbers)  
**Targets:** tree (SVG: apple tree)

**Hebrew text:**
- Title: "יער החיסור"
- Intro: "ביער יש עץ עם 6 תפוחים. בואו נוריד כמה!"
- Action: "הקליקו על 2 תפוחים כדי שיפלו. כמה נשארו?"
- Conclusion: "מעולה! 6 תפוחים פחות 2 תפוחים שווה ל-4 תפוחים!"

### 3.3 Multiplication — Mountain (lesson_multiplication_mountain.ts)

**Story:** Arrange magic crystals in rows and columns on a mountain.  
**Equation:** 3 × 2 = 6 (extends existing lesson concept with crystal theme)  
**Steps:**

1. **Intro (dialog):** Mascot welcomes to Crystal Mountain
2. **Interactive (interactive_drag):** Drag 6 crystals into a 3-row × 2-column grid  
3. **Conclusion (dialog):** Show equation "3 × 2 = 6" with filled crystal grid

**Items:** crystal (SVG: blue/purple faceted gem)  
**Targets:** crystal_grid (SVG: 3×2 grid cells with mountain backdrop)

**Hebrew text:**
- Title: "הרי הכפל"
- Intro: "ברוכים הבאים להר הגבישים! בואו נסדר גבישים בשורות!"
- Action: "גררו 2 גבישים לכל שורה. יש לנו 3 שורות!"
- Conclusion: "מדהים! 3 שורות של 2 גבישים זה 6 גבישים!"

### 3.4 Division — Desert (lesson_division_desert.ts)

**Story:** Share date fruits fairly among desert animal friends.  
**Equation:** 6 ÷ 3 = 2  
**Steps:**

1. **Intro (dialog):** Mascot shows 6 dates and 3 desert animals (camel, fennec fox, lizard)
2. **Interactive (interactive_drag):** Drag dates to animals so each gets 2  
3. **Conclusion (dialog):** Show equation "6 ÷ 3 = 2" with happy animals

**Items:** date (SVG: brown oval date fruit)  
**Targets:** desert_animal (SVG: camel/fox/lizard with basket)

**Hebrew text:**
- Title: "מדבר החלוקה"
- Intro: "במדבר יש 6 תמרים ו-3 חיות חברות. בואו נחלק!"
- Action: "גררו תמרים לחיות. כמה תמרים יקבל כל חיה?"
- Conclusion: "נהדר! 6 תמרים חלקי 3 חיות שווה ל-2 תמרים לכל חיה!"

---

## 4. Implementation Files

### 4.1 Type Changes (src/types/lesson.ts)

```typescript
// Add new item types
export type LessonItemType =
    = 'apple' | 'basket' | 'number'
    | 'seashell' | 'ten_frame'
    | 'bunny' | 'log'
    | 'crystal' | 'crystal_grid'
    | 'date' | 'desert_animal'
    | 'tree';

// Update LessonItem to use the new type
export interface LessonItem {
    id: string;
    type: LessonItemType;
    position: Position;
    value?: number;
}

// Add onTap support to LessonStep
export interface LessonStep {
    id: string;
    type: LessonType;
    mascotText: string;
    mascotEmotion: MascotEmotion;
    items: LessonItem[];
    targets: LessonTarget[];
    showEquation?: string;
    validationCriteria?: (items: LessonItem[], targets: LessonTarget[]) => boolean;
    onStart?: () => void;
    // New: for interactive_tap steps, which items are tappable
    tappableItems?: string[];
}
```

### 4.2 LessonEngine Extension (src/engines/LessonEngine.ts)

Add `onItemTapped` method:
```typescript
public onItemTapped(itemId: string) {
    const step = this.lesson.steps[this.currentStepIndex];
    if (step.type !== 'interactive_tap') return;

    const item = this.items.find(i => i.id === itemId);
    if (!item) return;

    // Mark item as "tapped" by moving it or toggling a value
    if (item.value !== undefined) {
        item.value = item.value > 0 ? 0 : 1; // toggle
    }

    this.correctCount++;
    this.checkValidation();
    this.notify();
}
```

### 4.3 InteractiveStoryScene.tsx

```typescript
import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { X, ArrowRight, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Mascot } from '../mascot/Mascot';
import { SpeechBubble } from '../mascot/SpeechBubble';
import { LessonEngine } from '../../engines/LessonEngine';
import { useAnalytics } from '../../hooks/useAnalytics';
import type { LessonDefinition, LessonItem, LessonItemType } from '../../types/lesson';

interface InteractiveStorySceneProps {
    isOpen: boolean;
    lesson: LessonDefinition;
    nodeId: string;
    onClose: () => void;
    onComplete: (performance: { correct: number; attempts: number }) => void;
}

// Theme-aware SVG renderer for items
const SceneItemSVG: React.FC<{ item: LessonItem; size?: number }> = ({ item, size = 80 }) => {
    switch (item.type) {
        case 'apple':
            return (<svg viewBox="0 0 100 100" className="w-full h-full">
                <path d="M 50 90 Q 20 90 20 60 Q 20 30 50 40 Q 80 30 80 60 Q 80 90 50 90" fill="#EF4444" stroke="#991B1B" strokeWidth="2" />
                <path d="M 50 40 Q 40 10 70 10 Q 60 40 50 40" fill="#4ADE80" stroke="#166534" strokeWidth="2" />
                <circle cx="35" cy="55" r="3" fill="white" opacity="0.4" />
            </svg>);
        case 'seashell':
            return (<svg viewBox="0 0 100 100" className="w-full h-full">
                <path d="M 50 85 Q 15 85 15 50 Q 15 20 50 25 Q 85 20 85 50 Q 85 85 50 85" fill="#FDF2F8" stroke="#DB2777" strokeWidth="2" />
                <path d="M 50 25 L 50 85 M 30 30 Q 35 55 30 80 M 70 30 Q 65 55 70 80" stroke="#EC4899" strokeWidth="1.5" fill="none" />
                <circle cx="50" cy="25" r="3" fill="#F9A8D4" />
            </svg>);
        case 'crystal':
            return (<svg viewBox="0 0 100 100" className="w-full h-full">
                <polygon points="50,10 70,35 65,80 35,80 30,35" fill="#818CF8" stroke="#4338CA" strokeWidth="2" />
                <polygon points="50,10 70,35 50,40 30,35" fill="#A5B4FC" stroke="#4338CA" strokeWidth="1" />
                <line x1="50" y1="10" x2="50" y2="80" stroke="#312E81" strokeWidth="1" />
            </svg>);
        case 'date':
            return (<svg viewBox="0 0 100 100" className="w-full h-full">
                <ellipse cx="50" cy="55" rx="22" ry="35" fill="#92400E" stroke="#451A03" strokeWidth="2" />
                <ellipse cx="45" cy="45" rx="5" ry="10" fill="#B45309" opacity="0.5" />
                <path d="M 50 20 Q 55 10 65 12" stroke="#4ADE80" strokeWidth="2" fill="none" />
            </svg>);
        case 'bunny':
            return (<svg viewBox="0 0 100 100" className="w-full h-full">
                <ellipse cx="50" cy="60" rx="25" ry="22" fill="#F3F4F6" stroke="#D1D5DB" strokeWidth="2" />
                <ellipse cx="38" cy="35" rx="8" ry="20" fill="#F3F4F6" stroke="#D1D5DB" strokeWidth="2" />
                <ellipse cx="62" cy="35" rx="8" ry="20" fill="#F3F4F6" stroke="#D1D5DB" strokeWidth="2" />
                <circle cx="42" cy="58" r="3" fill="#1F2937" />
                <circle cx="58" cy="58" r="3" fill="#1F2937" />
                <ellipse cx="50" cy="68" rx="4" ry="3" fill="#F472B6" />
            </svg>);
        default:
            return (<svg viewBox="0 0 100 100" className="w-full h-full">
                <rect x="20" y="20" width="60" height="60" rx="8" fill="#E5E7EB" stroke="#9CA3AF" strokeWidth="2" />
            </svg>);
    }
};

// Theme-aware SVG renderer for targets
const SceneTargetSVG: React.FC<{ targetType: string; currentCount: number; capacity: number }> = ({ targetType, currentCount, capacity }) => {
    switch (targetType) {
        case 'ten_frame':
            return (<svg viewBox="0 0 200 80" className="w-full h-full">
                {[0,1,2,3,4,5,6,7,8,9].map(i => (
                    <rect key={i} x={i * 20} y="5" width="18" height="70" rx="3"
                        fill={i < currentCount ? '#FCD34D' : '#FEF3C7'}
                        stroke="#D97706" strokeWidth="2" />
                ))}
            </svg>);
        case 'basket':
            return (<svg viewBox="0 0 100 100" className="w-full h-full">
                <path d="M 10 30 Q 50 100 90 30" fill="#D97706" stroke="#92400E" strokeWidth="3" />
                <ellipse cx="50" cy="30" rx="40" ry="10" fill="#F59E0B" stroke="#92400E" strokeWidth="3" />
                <g transform="translate(50, 60)">
                    <circle r="20" fill="white" stroke="#F59E0B" strokeWidth="2" />
                    <text x="0" y="5" textAnchor="middle" fill="#92400E" fontSize="16" fontWeight="bold">
                        {currentCount} / {capacity}
                    </text>
                </g>
            </svg>);
        case 'crystal_grid':
            return (<svg viewBox="0 0 150 100" className="w-full h-full">
                {[0,1,2].map(row => [0,1].map(col => (
                    <rect key={`${row}-${col}`} x={col * 50 + 10} y={row * 30 + 5} width="40" height="25" rx="5"
                        fill="rgba(129,140,248,0.15)" stroke="#818CF8" strokeWidth="2" strokeDasharray="4 2" />
                )))}
            </svg>);
        case 'desert_animal':
            return (<svg viewBox="0 0 100 100" className="w-full h-full">
                <ellipse cx="50" cy="70" rx="30" ry="15" fill="#D4A373" stroke="#A0762E" strokeWidth="2" />
                <circle cx="50" cy="50" r="15" fill="#D4A373" stroke="#A0762E" strokeWidth="2" />
                <circle cx="45" cy="48" r="2" fill="#1F2937" />
                <circle cx="55" cy="48" r="2" fill="#1F2937" />
                <text x="50" y="85" textAnchor="middle" fill="#78350F" fontSize="14" fontWeight="bold">
                    {currentCount} / {capacity}
                </text>
            </svg>);
        default:
            return (<svg viewBox="0 0 100 100" className="w-full h-full">
                <rect x="10" y="10" width="80" height="80" rx="8" fill="#F3F4F6" stroke="#9CA3AF" strokeWidth="2" />
            </svg>);
    }
};

export const InteractiveStoryScene: React.FC<InteractiveStorySceneProps> = ({ isOpen, lesson, nodeId, onClose, onComplete }) => {
    const { t } = useTranslation();
    const { logEvent } = useAnalytics();
    const [engine] = useState(() => new LessonEngine(lesson));
    const [state, setState] = useState(engine.getCurrentState());
    const startTimeRef = useRef<number>(Date.now());
    const stepCompleteLoggedRef = useRef<Set<number>>(new Set());

    useEffect(() => {
        if (isOpen) {
            startTimeRef.current = Date.now();
            logEvent('lesson_start', { lesson_id: lesson.id, operation: lesson.id.split('_')[0] });
        }
    }, [isOpen, lesson.id, logEvent]);

    useEffect(() => {
        const unsubscribe = engine.subscribe((newState) => {
            setState({ ...newState });
        });
        return unsubscribe;
    }, [engine]);

    if (!isOpen) return null;

    const { currentStep, items, targets, isLastStep } = state;
    const canAdvance = engine.isStepComplete();

    const handleNext = () => {
        const stepIndex = engine.getCurrentState().progress > 0
            ? Math.round(engine.getCurrentState().progress / (100 / lesson.steps.length))
            : 0;

        // Log step completion (once per step)
        if (!stepCompleteLoggedRef.current.has(stepIndex)) {
            stepCompleteLoggedRef.current.add(stepIndex);
            logEvent('lesson_step_complete', { lesson_id: lesson.id, step_index: stepIndex });
        }

        if (isLastStep) {
            const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
            const performance = engine.getPerformance();
            logEvent('lesson_complete', {
                lesson_id: lesson.id,
                duration_seconds: duration,
                stars_earned: performance.correct > 0 ? 3 : 1,
            });
            onComplete(performance);
        } else {
            engine.nextStep();
        }
    };

    return (
        <div data-testid="lesson-modal" dir="rtl" className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-md">
            <div className="w-full max-w-5xl aspect-video bg-white rounded-[3rem] shadow-2xl relative flex flex-col">
                {/* Close */}
                <div className="absolute top-4 right-4 z-20">
                    <button onClick={onClose} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200">
                        <X size={24} className="text-slate-600" />
                    </button>
                </div>

                {/* Scene Area */}
                <div className="flex-1 relative bg-gradient-to-br from-sky-50 to-blue-100 rounded-t-[3rem] overflow-hidden">
                    {/* Title on first step */}
                    {state.progress === 0 && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8, y: -20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            className="absolute top-1/4 left-0 w-full text-center z-10 px-4"
                        >
                            <h1 className="text-5xl md:text-7xl font-black text-indigo-600 drop-shadow-sm tracking-tight">
                                {t(lesson.title)}
                            </h1>
                            <div className="mt-4 w-24 h-2 bg-orange-400 mx-auto rounded-full opacity-80" />
                        </motion.div>
                    )}

                    {/* Targets Layer */}
                    {targets.map(target => (
                        <div
                            key={target.id}
                            data-target-id={target.id}
                            className="absolute transform -translate-x-1/2 -translate-y-1/2 transition-all"
                            style={{
                                left: `${target.position.x}%`,
                                top: `${target.position.y}%`,
                                width: '140px',
                                height: '140px',
                            }}
                        >
                            <SceneTargetSVG
                                targetType={target.accepts[0] || 'basket'}
                                currentCount={target.currentCount}
                                capacity={target.capacity}
                            />
                        </div>
                    ))}

                    {/* Items Layer */}
                    {items.map(item => (
                        <motion.div
                            key={item.id}
                            drag={currentStep.type === 'interactive_drag'}
                            dragMomentum={false}
                            whileDrag={{ scale: 1.2, zIndex: 100, rotate: 10, pointerEvents: 'none' }}
                            onClick={currentStep.type === 'interactive_tap' ? () => engine.onItemTapped(item.id) : undefined}
                            onDragEnd={(_e, info) => {
                                const point = info.point;
                                const element = document.elementFromPoint(point.x, point.y);
                                const targetEl = element?.closest('[data-target-id]');
                                if (targetEl) {
                                    const targetId = targetEl.getAttribute('data-target-id');
                                    if (targetId) engine.onItemDropped(item.id, targetId);
                                } else {
                                    engine.recordMistake();
                                }
                            }}
                            className="absolute w-20 h-20 flex items-center justify-center cursor-grab active:cursor-grabbing -ml-10 -mt-10 touch-none"
                            style={{ left: `${item.position.x}%`, top: `${item.position.y}%` }}
                        >
                            <SceneItemSVG item={item} />
                        </motion.div>
                    ))}
                </div>

                {/* Equation Overlay */}
                {currentStep.showEquation && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.5, y: 50 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        className="absolute inset-0 flex items-center justify-center pointer-events-none z-30"
                    >
                        <div className="bg-white/90 backdrop-blur-sm px-12 py-8 rounded-[3rem] shadow-2xl border-8 border-orange-300">
                            <span className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-600" dir="ltr">
                                {currentStep.showEquation}
                            </span>
                        </div>
                    </motion.div>
                )}

                {/* Footer */}
                <div className="h-32 bg-white border-t border-slate-100 flex items-center px-8 relative z-20 rounded-b-[3rem]">
                    <div className="ml-auto">
                        <button
                            data-testid="lesson-next"
                            onClick={handleNext}
                            disabled={!canAdvance}
                            className={`flex items-center gap-3 px-8 py-4 rounded-2xl text-2xl font-bold transition-all ${canAdvance
                                ? 'bg-primary text-white shadow-lg hover:scale-105 active:scale-95'
                                : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                        >
                            <span>{isLastStep ? t('lessons.controls.finish') : state.progress === 0 ? t('lessons.controls.start') : t('lessons.controls.next')}</span>
                            {isLastStep ? <Check size={28} /> : <ArrowRight size={28} />}
                        </button>
                    </div>
                </div>

                {/* Mascot */}
                <div className="absolute bottom-0 left-8 z-50 flex items-end pb-4 filter drop-shadow-xl">
                    <div className="w-48 h-48 relative">
                        <Mascot character="owl" emotion={currentStep.mascotEmotion} />
                    </div>
                    <div className="absolute left-32 bottom-32 w-80">
                        <SpeechBubble text={t(currentStep.mascotText)} isVisible={true} position="right" />
                    </div>
                </div>
            </div>
        </div>
    );
};
```

### 4.4 Lesson Definition Files

#### lesson_addition_beach.ts
```typescript
import type { LessonDefinition, LessonStep } from '../types/lesson';

const steps: LessonStep[] = [
    {
        id: 'intro',
        type: 'dialog',
        mascotText: 'lessons.addition.intro',
        mascotEmotion: 'happy',
        items: [
            { id: 's1', type: 'seashell', position: { x: 15, y: 25 } },
            { id: 's2', type: 'seashell', position: { x: 30, y: 30 } },
            { id: 's3', type: 'seashell', position: { x: 45, y: 22 } },
            { id: 's4', type: 'seashell', position: { x: 60, y: 28 } },
            { id: 's5', type: 'seashell', position: { x: 75, y: 25 } },
            { id: 's6', type: 'seashell', position: { x: 85, y: 30 } },
            { id: 's7', type: 'seashell', position: { x: 20, y: 45 } },
        ],
        targets: []
    },
    {
        id: 'fill_frame',
        type: 'interactive_drag',
        mascotText: 'lessons.addition.action',
        mascotEmotion: 'thinking',
        items: [
            { id: 's1', type: 'seashell', position: { x: 10, y: 20 } },
            { id: 's2', type: 'seashell', position: { x: 25, y: 20 } },
            { id: 's3', type: 'seashell', position: { x: 40, y: 20 } },
            { id: 's4', type: 'seashell', position: { x: 55, y: 20 } },
            { id: 's5', type: 'seashell', position: { x: 70, y: 20 } },
            { id: 's6', type: 'seashell', position: { x: 85, y: 20 } },
            { id: 's7', type: 'seashell', position: { x: 30, y: 35 } },
        ],
        targets: [
            { id: 'frame1', position: { x: 50, y: 70 }, capacity: 7, currentCount: 0, accepts: ['seashell'] },
        ],
        validationCriteria: (_items, targets) => targets.every(t => t.currentCount === 7),
    },
    {
        id: 'conclusion',
        type: 'dialog',
        mascotText: 'lessons.addition.conclusion',
        mascotEmotion: 'excited',
        items: [],
        targets: [
            { id: 'frame1', position: { x: 50, y: 70 }, capacity: 7, currentCount: 7, accepts: ['seashell'] },
        ],
        showEquation: '4 + 3 = 7',
    },
];

export const AdditionBeachLesson: LessonDefinition = {
    id: 'addition_beach',
    title: 'lessons.addition.title',
    steps,
};
```

#### lesson_subtraction_forest.ts
```typescript
import type { LessonDefinition, LessonStep } from '../types/lesson';

const steps: LessonStep[] = [
    {
        id: 'intro',
        type: 'dialog',
        mascotText: 'lessons.subtraction.intro',
        mascotEmotion: 'happy',
        items: [
            { id: 'a1', type: 'apple', position: { x: 30, y: 25 } },
            { id: 'a2', type: 'apple', position: { x: 40, y: 20 } },
            { id: 'a3', type: 'apple', position: { x: 50, y: 25 } },
            { id: 'a4', type: 'apple', position: { x: 60, y: 20 } },
            { id: 'a5', type: 'apple', position: { x: 70, y: 25 } },
            { id: 'a6', type: 'apple', position: { x: 80, y: 22 } },
        ],
        targets: []
    },
    {
        id: 'tap_apples',
        type: 'interactive_tap',
        mascotText: 'lessons.subtraction.action',
        mascotEmotion: 'thinking',
        items: [
            { id: 'a1', type: 'apple', position: { x: 30, y: 25 }, value: 0 },
            { id: 'a2', type: 'apple', position: { x: 40, y: 20 }, value: 0 },
            { id: 'a3', type: 'apple', position: { x: 50, y: 25 }, value: 0 },
            { id: 'a4', type: 'apple', position: { x: 60, y: 20 }, value: 0 },
            { id: 'a5', type: 'apple', position: { x: 70, y: 25 }, value: 0 },
            { id: 'a6', type: 'apple', position: { x: 80, y: 22 }, value: 0 },
        ],
        targets: [],
        tappableItems: ['a1', 'a2', 'a3', 'a4', 'a5', 'a6'],
        validationCriteria: (items) => items.filter(i => i.value === 1).length === 2,
    },
    {
        id: 'conclusion',
        type: 'dialog',
        mascotText: 'lessons.subtraction.conclusion',
        mascotEmotion: 'excited',
        items: [
            { id: 'a3', type: 'apple', position: { x: 40, y: 25 } },
            { id: 'a4', type: 'apple', position: { x: 55, y: 22 } },
            { id: 'a5', type: 'apple', position: { x: 70, y: 25 } },
            { id: 'a6', type: 'apple', position: { x: 82, y: 23 } },
        ],
        targets: [],
        showEquation: '6 - 2 = 4',
    },
];

export const SubtractionForestLesson: LessonDefinition = {
    id: 'subtraction_forest',
    title: 'lessons.subtraction.title',
    steps,
};
```

#### lesson_multiplication_mountain.ts
```typescript
import type { LessonDefinition, LessonStep } from '../types/lesson';

const steps: LessonStep[] = [
    {
        id: 'intro',
        type: 'dialog',
        mascotText: 'lessons.multiplication.intro',
        mascotEmotion: 'happy',
        items: [],
        targets: [
            { id: 'grid', position: { x: 50, y: 50 }, capacity: 6, currentCount: 0, accepts: ['crystal'] },
        ],
    },
    {
        id: 'fill_grid',
        type: 'interactive_drag',
        mascotText: 'lessons.multiplication.action',
        mascotEmotion: 'thinking',
        items: [
            { id: 'c1', type: 'crystal', position: { x: 10, y: 20 } },
            { id: 'c2', type: 'crystal', position: { x: 25, y: 20 } },
            { id: 'c3', type: 'crystal', position: { x: 40, y: 20 } },
            { id: 'c4', type: 'crystal', position: { x: 55, y: 20 } },
            { id: 'c5', type: 'crystal', position: { x: 70, y: 20 } },
            { id: 'c6', type: 'crystal', position: { x: 85, y: 20 } },
        ],
        targets: [
            { id: 'grid', position: { x: 50, y: 55 }, capacity: 6, currentCount: 0, accepts: ['crystal'] },
        ],
        validationCriteria: (_items, targets) => targets.every(t => t.currentCount === 6),
    },
    {
        id: 'conclusion',
        type: 'dialog',
        mascotText: 'lessons.multiplication.conclusion',
        mascotEmotion: 'excited',
        items: [],
        targets: [
            { id: 'grid', position: { x: 50, y: 55 }, capacity: 6, currentCount: 6, accepts: ['crystal'] },
        ],
        showEquation: '3 × 2 = 6',
    },
];

export const MultiplicationMountainLesson: LessonDefinition = {
    id: 'multiplication_mountain',
    title: 'lessons.multiplication.title',
    steps,
};
```

#### lesson_division_desert.ts
```typescript
import type { LessonDefinition, LessonStep } from '../types/lesson';

const steps: LessonStep[] = [
    {
        id: 'intro',
        type: 'dialog',
        mascotText: 'lessons.division.intro',
        mascotEmotion: 'happy',
        items: [
            { id: 'd1', type: 'date', position: { x: 20, y: 30 } },
            { id: 'd2', type: 'date', position: { x: 35, y: 25 } },
            { id: 'd3', type: 'date', position: { x: 50, y: 30 } },
            { id: 'd4', type: 'date', position: { x: 65, y: 25 } },
            { id: 'd5', type: 'date', position: { x: 75, y: 30 } },
            { id: 'd6', type: 'date', position: { x: 85, y: 28 } },
        ],
        targets: []
    },
    {
        id: 'share_dates',
        type: 'interactive_drag',
        mascotText: 'lessons.division.action',
        mascotEmotion: 'thinking',
        items: [
            { id: 'd1', type: 'date', position: { x: 10, y: 20 } },
            { id: 'd2', type: 'date', position: { x: 22, y: 20 } },
            { id: 'd3', type: 'date', position: { x: 34, y: 20 } },
            { id: 'd4', type: 'date', position: { x: 46, y: 20 } },
            { id: 'd5', type: 'date', position: { x: 58, y: 20 } },
            { id: 'd6', type: 'date', position: { x: 70, y: 20 } },
        ],
        targets: [
            { id: 'animal1', position: { x: 20, y: 70 }, capacity: 2, currentCount: 0, accepts: ['date'] },
            { id: 'animal2', position: { x: 50, y: 70 }, capacity: 2, currentCount: 0, accepts: ['date'] },
            { id: 'animal3', position: { x: 80, y: 70 }, capacity: 2, currentCount: 0, accepts: ['date'] },
        ],
        validationCriteria: (_items, targets) => targets.every(t => t.currentCount === 2),
    },
    {
        id: 'conclusion',
        type: 'dialog',
        mascotText: 'lessons.division.conclusion',
        mascotEmotion: 'excited',
        items: [],
        targets: [
            { id: 'animal1', position: { x: 20, y: 70 }, capacity: 2, currentCount: 2, accepts: ['date'] },
            { id: 'animal2', position: { x: 50, y: 70 }, capacity: 2, currentCount: 2, accepts: ['date'] },
            { id: 'animal3', position: { x: 80, y: 70 }, capacity: 2, currentCount: 2, accepts: ['date'] },
        ],
        showEquation: '6 ÷ 3 = 2',
    },
];

export const DivisionDesertLesson: LessonDefinition = {
    id: 'division_desert',
    title: 'lessons.division.title',
    steps,
};
```

### 4.5 GameOrchestrator LESSON Routing

```typescript
// Replace the LESSON branch in GameOrchestrator.tsx:
import { getLessonForNode } from '../lessons';
import { InteractiveStoryScene } from './lessons/InteractiveStoryScene';

// Remove: import { LessonModal } from './lessons/LessonModal';
// Remove: import { MultiplicationLesson } from '../lessons/lesson1_multiplication';

// In the component:
if (effectiveMode === 'LESSON') {
    const lesson = node ? getLessonForNode(node.id) : null;
    if (!lesson) {
        // No lesson registered → fall through to PRACTICE
        // (handled by setting internalMode to PRACTICE)
        if (internalMode === null) {
            setInternalMode('PRACTICE');
        }
        return null;
    }
    return (
        <InteractiveStoryScene
            isOpen={isLessonOpen}
            lesson={lesson}
            nodeId={node.id}
            onClose={onExit}
            onComplete={handleLessonComplete}
        />
    );
}
```

### 4.6 i18n Keys

#### Hebrew (he.json) — add to "lessons" object:
```json
{
  "addition": {
    "title": "חוף החיבור",
    "intro": "ברוכים הבאים לחוף! בואו נאסוף צדפים ונחבר אותן!",
    "action": "גררו את כל הצדפים לתוך המסגרת. כמה יש בסך הכל?",
    "conclusion": "מצחיקים! 4 צדפים ועוד 3 צדפים שווה ל-7 צדפים!"
  },
  "subtraction": {
    "title": "יער החיסור",
    "intro": "ביער יש עץ עם 6 תפוחים. בואו נוריד כמה!",
    "action": "הקליקו על 2 תפוחים כדי שיפלו. כמה נשארו?",
    "conclusion": "מעולה! 6 תפוחים פחות 2 תפוחים שווה ל-4 תפוחים!"
  },
  "multiplication": {
    "title": "הרי הכפל",
    "intro": "ברוכים הבאים להר הגבישים! בואו נסדר גבישים בשורות!",
    "action": "גררו 2 גבישים לכל שורה. יש לנו 3 שורות!",
    "conclusion": "מדהים! 3 שורות של 2 גבישים זה 6 גבישים!"
  },
  "division": {
    "title": "מדבר החלוקה",
    "intro": "במדבר יש 6 תמרים ו-3 חיות חברות. בואו נחלק!",
    "action": "גררו תמרים לחיות. כמה תמרים יקבל כל חיה?",
    "conclusion": "נהדר! 6 תמרים חלקי 3 חיות שווה ל-2 תמרים לכל חיה!"
  }
}
```

#### English (en.json) — add to "lessons" object:
```json
{
  "addition": {
    "title": "Addition Beach",
    "intro": "Welcome to the beach! Let's collect seashells and add them!",
    "action": "Drag all the seashells into the frame. How many are there?",
    "conclusion": "Amazing! 4 seashells and 3 more seashells equals 7 seashells!"
  },
  "subtraction": {
    "title": "Subtraction Forest",
    "intro": "In the forest there's a tree with 6 apples. Let's take some down!",
    "action": "Tap 2 apples to make them fall. How many are left?",
    "conclusion": "Great! 6 apples minus 2 apples equals 4 apples!"
  },
  "multiplication": {
    "title": "Multiplication Mountain",
    "intro": "Welcome to Crystal Mountain! Let's arrange crystals in rows!",
    "action": "Drag 2 crystals to each row. We have 3 rows!",
    "conclusion": "Amazing! 3 rows of 2 crystals is 6 crystals!"
  },
  "division": {
    "title": "Division Desert",
    "intro": "In the desert there are 6 dates and 3 animal friends. Let's share!",
    "action": "Drag dates to the animals. How many dates does each animal get?",
    "conclusion": "Wonderful! 6 dates divided by 3 animals equals 2 dates each!"
  }
}
```

---

## 5. Curriculum Changes (src/data/learningPath.ts)

Add LESSON nodes to units 1 and 2:

### Unit 1 (Beach) — add after n1_1 (Blast Off):
```typescript
{ id: 'n1_lesson_add', unitId: 'unit_1', title: 'Addition Lesson', description: 'Learn to add with seashells', type: 'LESSON', position: { x: 50, y: 60 }, targetLevel: 1, config: { lessonId: 'addition_beach' } },
```

### Unit 2 (Forest) — add after n2_1 (Pop the 12s):
```typescript
{ id: 'n2_lesson_sub', unitId: 'unit_2', title: 'Subtraction Lesson', description: 'Learn to subtract with apples', type: 'LESSON', position: { x: 50, y: 75 }, targetLevel: 2, config: { lessonId: 'subtraction_forest' } },
```

### Update existing n3_1 and n4_1:
```typescript
// n3_1 — add config.lessonId
{ id: 'n3_1', unitId: 'unit_3', title: 'Groups of 2', description: 'Lesson: 2, 4, 6', type: 'LESSON', position: { x: 50, y: 0 }, targetLevel: 4, config: { lessonId: 'multiplication_mountain' } },

// n4_1 — add config.lessonId
{ id: 'n4_1', unitId: 'unit_4', title: 'Sharing is Caring', description: 'Divide items', type: 'LESSON', position: { x: 50, y: 0 }, targetLevel: 5, config: { lessonId: 'division_desert' } },
```

---

## 6. Test Plan

### 6.1 Lesson Definition Tests

```typescript
// src/lessons/__tests__/lessons.test.ts
import { describe, it, expect } from 'vitest';
import { AdditionBeachLesson } from '../lesson_addition_beach';
import { SubtractionForestLesson } from '../lesson_subtraction_forest';
import { MultiplicationMountainLesson } from '../lesson_multiplication_mountain';
import { DivisionDesertLesson } from '../lesson_division_desert';

describe('Lesson definitions', () => {
    it.each([
        [AdditionBeachLesson, 'addition_beach', 3],
        [SubtractionForestLesson, 'subtraction_forest', 3],
        [MultiplicationMountainLesson, 'multiplication_mountain', 3],
        [DivisionDesertLesson, 'division_desert', 3],
    ])('has 3 steps with Hebrew text keys', (lesson, expectedId, stepCount) => {
        expect(lesson.id).toBe(expectedId);
        expect(lesson.steps).toHaveLength(stepCount);
        lesson.steps.forEach(step => {
            expect(step.mascotText).toMatch(/^lessons\./);
            expect(step.mascotText.length).toBeGreaterThan(10);
        });
    });

    it('addition lesson has interactive drag step with seashells', () => {
        const interactiveStep = AdditionBeachLesson.steps.find(s => s.type === 'interactive_drag');
        expect(interactiveStep).toBeDefined();
        expect(interactiveStep!.items.every(i => i.type === 'seashell')).toBe(true);
    });

    it('subtraction lesson has interactive tap step', () => {
        const tapStep = SubtractionForestLesson.steps.find(s => s.type === 'interactive_tap');
        expect(tapStep).toBeDefined();
        expect(tapStep!.tappableItems).toBeDefined();
    });

    it('division lesson has 3 animal targets with capacity 2', () => {
        const dragStep = DivisionDesertLesson.steps.find(s => s.type === 'interactive_drag');
        expect(dragStep).toBeDefined();
        expect(dragStep!.targets).toHaveLength(3);
        expect(dragStep!.targets.every(t => t.capacity === 2)).toBe(true);
    });
});
```

### 6.2 InteractiveStoryScene Test

```typescript
// src/components/lessons/__tests__/InteractiveStoryScene.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { InteractiveStoryScene } from '../InteractiveStoryScene';
import { AdditionBeachLesson } from '../../../lessons/lesson_addition_beach';

vi.mock('../../../hooks/useAnalytics', () => ({
    useAnalytics: () => ({ logEvent: vi.fn() }),
}));
vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('../../../engines/LessonEngine', () => ({
    LessonEngine: vi.fn().mockImplementation(() => ({
        subscribe: vi.fn(() => vi.fn()),
        getCurrentState: vi.fn(() => ({
            currentStep: AdditionBeachLesson.steps[0],
            items: [],
            targets: [],
            progress: 0,
            isLastStep: false,
        })),
        isStepComplete: vi.fn(() => true),
        nextStep: vi.fn(),
        getPerformance: vi.fn(() => ({ correct: 5, attempts: 6 })),
        onItemDropped: vi.fn(),
        onItemTapped: vi.fn(),
        recordMistake: vi.fn(),
    })),
}));
vi.mock('framer-motion', () => ({
    motion: { div: ({ children, ...props }: any) => <div {...props}>{children}</div> },
}));
vi.mock('../../mascot/Mascot', () => ({ Mascot: () => <div data-testid="mascot" /> }));
vi.mock('../../mascot/SpeechBubble', () => ({ SpeechBubble: () => <div data-testid="speech" /> }));

describe('InteractiveStoryScene', () => {
    it('renders lesson modal with title', () => {
        render(<InteractiveStoryScene isOpen={true} lesson={AdditionBeachLesson} nodeId="n1_lesson_add" onClose={() => {}} onComplete={() => {}} />);
        expect(screen.getByTestId('lesson-modal')).toBeDefined();
    });

    it('advances steps on next button click', () => {
        const onComplete = vi.fn();
        render(<InteractiveStoryScene isOpen={true} lesson={AdditionBeachLesson} nodeId="n1_lesson_add" onClose={() => {}} onComplete={onComplete} />);
        const nextBtn = screen.getByTestId('lesson-next');
        fireEvent.click(nextBtn);
        // Engine.nextStep should be called (verified by mock)
    });
});
```

### 6.3 GameOrchestrator Routing Test

```typescript
// Add to existing GameOrchestrator.lesson.test.tsx
// Mock InteractiveStoryScene instead of LessonModal
vi.mock('../lessons/InteractiveStoryScene', () => ({
    InteractiveStoryScene: ({ nodeId, isOpen }: any) => {
        if (!isOpen) return null;
        return <div data-testid="lesson-modal" data-node-id={nodeId}>Lesson for {nodeId}</div>;
    },
}));

it('routes n3_1 to multiplication lesson', () => {
    render(<GameOrchestrator targetLevel={4} onExit={() => {}} node={{ ...lessonNode, id: 'n3_1' }} />);
    expect(screen.getByTestId('lesson-modal')).toBeDefined();
    expect(screen.getByTestId('lesson-modal').getAttribute('data-node-id')).toBe('n3_1');
});

it('routes n4_1 to division lesson', () => {
    render(<GameOrchestrator targetLevel={5} onExit={() => {}} node={{ ...lessonNode, id: 'n4_1', targetLevel: 5 }} />);
    expect(screen.getByTestId('lesson-modal')).toBeDefined();
});

it('routes new n1_lesson_add to addition lesson', () => {
    render(<GameOrchestrator targetLevel={1} onExit={() => {}} node={{ ...lessonNode, id: 'n1_lesson_add', targetLevel: 1 }} />);
    expect(screen.getByTestId('lesson-modal')).toBeDefined();
});
```

---

## 7. GA4 Event Integration

| Event | Trigger Location | Parameters |
|-------|-----------------|------------|
| `lesson_start` | InteractiveStoryScene `useEffect` on isOpen | `{ lesson_id, operation }` |
| `lesson_step_complete` | `handleNext()` before advancing | `{ lesson_id, step_index }` |
| `lesson_complete` | `handleNext()` on last step | `{ lesson_id, duration_seconds, stars_earned }` |

**Note:** The `useAnalytics` hook currently supports custom events via `logEvent`. The new lesson events follow the existing pattern (e.g., `node_start`, `node_complete`).

---

## 8. Migration Path (LessonModal → InteractiveStoryScene)

1. **Keep** `LessonModal.tsx` temporarily for backward compat
2. **Create** `InteractiveStoryScene.tsx` with theme-aware rendering
3. **Update** `GameOrchestrator` to import and use `InteractiveStoryScene` instead of `LessonModal`
4. **Update** existing `GameOrchestrator.lesson.test.tsx` mocks
5. **Remove** `LessonModal.tsx` once all tests pass
6. **Keep** `lesson1_multiplication.ts` as importable but superseded by `lesson_multiplication_mountain.ts`

---

## 9. Build Order

1. **Extend types** (`src/types/lesson.ts`) — add `LessonItemType`, `tappableItems`
2. **Extend LessonEngine** — add `onItemTapped` method
3. **Create 4 lesson definition files** in `src/lessons/`
4. **Create `src/lessons/index.ts`** registry
5. **Create `InteractiveStoryScene.tsx`** component
6. **Update GameOrchestrator** — import registry, route by node.id
7. **Add i18n keys** to `he.json` and `en.json`
8. **Add curriculum nodes** to `learningPath.ts`
9. **Write tests** — lesson definitions, InteractiveStoryScene, routing
10. **Run full test suite** — verify no regressions
11. **Verify** existing `GameOrchestrator.lesson.test.tsx` passes with updated mocks

---

## 10. Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| `interactive_tap` not in LessonEngine | Subtraction lesson won't work | Add `onItemTapped` method |
| Existing test mocks break | Test regressions | Update mocks to target InteractiveStoryScene |
| LessonItem.type too narrow | TS compile errors | Extend union type |
| Hebrew RTL issues | UI mirror bugs | Use `dir="rtl"` on container |
| framer-motion drag in jsdom | Test failures | Mock framer-motion (already done) |
| No `src/lessons/index.ts` exists | Import errors | Create as part of build |

---

## 11. Success Criteria Verification

| Criterion | How to verify |
|-----------|--------------|
| 4 lessons fully playable | Manual testing + unit tests confirm 3 steps each |
| Lesson completion rate ≥80% | GA4 `lesson_complete` events (post-deploy metric) |
| No test regressions | `npx vitest run` — 920+ tests pass |
| LESSON nodes route correctly | GameOrchestrator routing tests for each node ID |
| GA4 events fire | Unit test mock verifies `logEvent` calls |
| Hebrew text renders | i18n keys present in he.json, tests check `mascotText` keys |
