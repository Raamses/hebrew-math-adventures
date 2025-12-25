import type { LessonDefinition, LessonItem, LessonTarget } from '../types/lesson';



export class LessonEngine {
    private lesson: LessonDefinition;
    private currentStepIndex: number = 0;

    // Runtime State
    private items: LessonItem[] = [];
    private targets: LessonTarget[] = [];
    private listeners: ((state: any) => void)[] = [];

    constructor(lesson: LessonDefinition) {
        this.lesson = lesson;
        this.loadStep(0);
    }

    private loadStep(index: number) {
        this.currentStepIndex = index;
        const step = this.lesson.steps[index];

        // Deep copy items/targets to reset state for the step
        this.items = JSON.parse(JSON.stringify(step.items));
        this.targets = JSON.parse(JSON.stringify(step.targets));

        this.notify();
    }

    public subscribe(listener: (state: any) => void) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    private notify() {
        const state = {
            currentStep: this.lesson.steps[this.currentStepIndex],
            items: this.items,
            targets: this.targets,
            progress: (this.currentStepIndex / this.lesson.steps.length) * 100,
            isLastStep: this.currentStepIndex === this.lesson.steps.length - 1
        };
        this.listeners.forEach(l => l(state));
    }

    public nextStep() {
        if (this.currentStepIndex < this.lesson.steps.length - 1) {
            this.loadStep(this.currentStepIndex + 1);
        } else {
            // Lesson Complete
        }
    }

    public onItemDropped(itemId: string, targetId: string | null) {
        // Find item
        const item = this.items.find(i => i.id === itemId);
        if (!item) return;

        // Reset previous target calculation (simple version)
        // In a full physics engine we'd calc overlap. 
        // Here we assume the UI calls this when a valid drop happens.

        if (targetId) {
            const target = this.targets.find(t => t.id === targetId);
            if (target && target.currentCount < target.capacity) {
                target.currentCount++;
                // Update item pos to target center (visual snap)
                item.position = { ...target.position }; // Snap to center

                // Trigger Validation Check
                this.checkValidation();
            }
        }

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
            isLastStep: this.currentStepIndex === this.lesson.steps.length - 1
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
