export type NodeType = 'LESSON' | 'PRACTICE' | 'SENSORY' | 'STORY' | 'CHALLENGE';

export interface LearningNode {
    id: string; // unique string id e.g. "math-unit1-1"
    unitId: string; // Reference to parent unit
    title: string;
    description: string;
    type: NodeType;

    // Position on the map (relative grid or percentage)
    // We can use a simple index relative to the unit, or explicit coordinates
    position: {
        x: number; // 0-100% of container width
        y: number; // Vertical offset from previous node? or absolute in unit
    };

    // Configuration for the engine
    targetLevel?: number; // Mapping to legacy system if needed
    config?: any; // Specific config for the problem generator (e.g. target number: 5)
}

export interface LearningUnit {
    id: string;
    title: string;
    theme: 'beach' | 'forest' | 'mountain' | 'space';
    nodes: LearningNode[];
    order: number;
    backgroundClass: string; // Tailwind class
}

export interface NodeProgress {
    stars: number; // 0 = locked, 1 = unlocked/passed, 2=good, 3=mastered
    isLocked: boolean;
    mistakes?: number; // Last run stats
}

export interface SagaProgress {
    [nodeId: string]: NodeProgress;
}
