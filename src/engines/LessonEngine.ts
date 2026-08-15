import type { LessonDefinition, LessonItem, LessonTarget } from '../types/lesson';

/**
 * Horizontal/vertical spacing (in scene percentage units) between the slots an
 * item snaps into once dropped. Tuned so a 64px sprite sits inside its slot on
 * the 16:9 scene without overlapping its neighbours.
 */
export const SLOT_SPACING_X = 7;
export const SLOT_SPACING_Y = 14;

export class LessonEngine {
    private lesson: LessonDefinition;
    private currentStepIndex: number = 0;

    // Performance tracking — used to award dynamic star tiers on completion.
    private correctCount: number = 0;
    private mistakeCount: number = 0;

    // Runtime State
    private items: LessonItem[] = [];
    private targets: LessonTarget[] = [];
    private listeners: ((state: ReturnType<LessonEngine['getCurrentState']>) => void)[] = [];

    constructor(lesson: LessonDefinition) {
        this.lesson = lesson;
        this.loadStep(0);
    }

    private loadStep(index: number) {
        this.currentStepIndex = index;
        const step = this.lesson.steps[index];

        // Deep copy items/targets to reset state for the step
        this.items = structuredClone(step.items);
        this.targets = structuredClone(step.targets);

        this.notify();
    }

    /**
     * Reports an incorrect action (e.g. a drop into empty space or an invalid
     * target). The UI calls this on drops that the engine's placement logic
     * rejects. Used to compute the Pass/Good/Perfect star tier.
     */
    public recordMistake(): void {
        this.mistakeCount++;
    }

    /**
     * Returns the accumulated performance result across all completed steps of
     * the lesson, combining correct fills with recorded mistakes. Used to
     * compute the Pass/Good/Perfect star tier at lesson completion.
     */
    public getPerformance(): { correct: number; attempts: number } {
        return {
            correct: this.correctCount,
            attempts: this.correctCount + this.mistakeCount,
        };
    }

    public subscribe(listener: (state: ReturnType<LessonEngine['getCurrentState']>) => void) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    private notify() {
        this.listeners.forEach(l => l(this.getCurrentState()));
    }

    public nextStep() {
        if (this.currentStepIndex < this.lesson.steps.length - 1) {
            this.loadStep(this.currentStepIndex + 1);
        } else {
            // Lesson Complete
        }
    }

    /**
     * Where the `slot`-th (0-based) item dropped into `target` should land, laid
     * out as a grid so a ten-frame / crystal row fills cell by cell instead of
     * stacking every sprite on the target's centre point.
     */
    private slotPosition(target: LessonTarget, slot: number) {
        const columns = target.columns ?? Math.min(target.capacity, 5);
        const rows = Math.ceil(target.capacity / columns);
        const col = slot % columns;
        const row = Math.floor(slot / columns);

        return {
            x: target.position.x + (col - (columns - 1) / 2) * SLOT_SPACING_X,
            y: target.position.y + (row - (rows - 1) / 2) * SLOT_SPACING_Y,
        };
    }

    public onItemDropped(itemId: string, targetId: string | null) {
        // Find item
        const item = this.items.find(i => i.id === itemId);
        if (!item) return;

        // Already placed or scenery — a no-op rather than a mistake.
        if (item.placedIn || item.interactive === false) return;

        if (targetId) {
            const target = this.targets.find(t => t.id === targetId);
            const accepted = !!target && (target.accepts.length === 0 || target.accepts.includes(item.type));

            if (target && accepted && target.currentCount < target.capacity) {
                target.currentCount++;
                // Snap into the next free slot of the target.
                item.position = this.slotPosition(target, target.currentCount - 1);
                item.placedIn = target.id;
                item.selected = false;

                // A successful fill counts toward the performance tier.
                this.correctCount++;

                // Trigger Validation Check
                this.checkValidation();
            } else {
                // Target is full, missing, or refuses this item type → mistake.
                this.recordMistake();
            }
        } else {
            // Dropped into empty space (no target) → mistake.
            this.recordMistake();
        }

        this.notify();
    }

    /**
     * Handles a tap on an item during an `interactive_tap` step.
     *
     * 'remove' items are consumed (the bunny eats the apple); 'select' items
     * toggle a highlight. Taps on scenery, on already-consumed items, or past
     * the step's `tapGoal` are recorded as mistakes but never change state, so
     * a child cannot tap the step into an unsolvable position.
     */
    public onItemTapped(itemId: string) {
        const step = this.lesson.steps[this.currentStepIndex];
        if (step.type !== 'interactive_tap') return;

        const item = this.items.find(i => i.id === itemId);
        if (!item) return;

        const action = item.tapAction ?? 'remove';

        if (item.interactive === false || action === 'none' || item.removed) {
            this.recordMistake();
            this.notify();
            return;
        }

        if (action === 'select') {
            item.selected = !item.selected;
            this.correctCount++;
        } else {
            const consumed = this.items.filter(i => i.removed).length;
            if (step.tapGoal !== undefined && consumed >= step.tapGoal) {
                // Goal already met — refuse further removals.
                this.recordMistake();
                this.notify();
                return;
            }
            item.removed = true;
            this.correctCount++;
        }

        this.checkValidation();
        this.notify();
    }

    private checkValidation() {
        const step = this.lesson.steps[this.currentStepIndex];
        if (step.validationCriteria) {
            const isValid = step.validationCriteria(this.items, this.targets);
            if (isValid) {
                // Auto-advance or enable "Next" button?
                // For MVP, if it's an interactive step, let's wait for user to click Next or auto-advance behavior.
                // Let's emit a "StepComplete" event or just state.
            }
        }
    }

    public getCurrentState() {
        return {
            currentStep: this.lesson.steps[this.currentStepIndex],
            items: this.items,
            targets: this.targets,
            progress: (this.currentStepIndex / this.lesson.steps.length) * 100,
            isLastStep: this.currentStepIndex === this.lesson.steps.length - 1,
            stepIndex: this.currentStepIndex,
            stepCount: this.lesson.steps.length,
            /** Scene theme for this step (step override wins over the lesson default). */
            theme: this.lesson.steps[this.currentStepIndex].theme ?? this.lesson.theme ?? 'mountain',
        };
    }

    // Method to check if current step is valid (can move next)
    public isStepComplete(): boolean {
        const step = this.lesson.steps[this.currentStepIndex];
        if (step.type === 'dialog') return true; // Dialogs are always "complete" (user just reads)

        if (step.validationCriteria) {
            return step.validationCriteria(this.items, this.targets);
        }
        return true;
    }
}
