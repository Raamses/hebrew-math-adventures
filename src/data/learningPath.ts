import type { LearningUnit } from '../types/learningPath';

export const CURRICULUM: LearningUnit[] = [
    {
        id: 'unit_1',
        title: 'Beginner Beach',
        theme: 'beach',
        order: 1,
        backgroundClass: 'bg-blue-50',
        nodes: [
            { id: 'n1_1', unitId: 'unit_1', title: 'Blast Off', description: 'Countdown 10-0', type: 'SENSORY', position: { x: 50, y: 0 }, config: { isMathSensory: true, target: 10 } },
            // Story micro-lesson: counting seashells one by one before the first sequence drill.
            { id: 'n1_2', unitId: 'unit_1', title: 'Count to 5', description: 'Lesson: 1, 2, 3...', type: 'LESSON', position: { x: 40, y: 120 }, targetLevel: 1 },
            // Story micro-lesson: teaches "putting together" before the first addition drill.
            { id: 'n1_3a', unitId: 'unit_1', title: 'Shell Sums', description: 'Lesson: 3 + 4', type: 'LESSON', position: { x: 25, y: 180 }, targetLevel: 1 },
            { id: 'n1_3', unitId: 'unit_1', title: 'First Steps', description: '1 + 1 = ?', type: 'PRACTICE', position: { x: 60, y: 240 }, targetLevel: 1, config: { type: 'addition_simple', max: 5 } },
            // Story micro-lesson: ten-frame fill, then the leftovers — the bridge to teen numbers.
            { id: 'n1_3b', unitId: 'unit_1', title: 'Ten & Ones', description: 'Lesson: 10 + 3', type: 'LESSON', position: { x: 80, y: 300 }, targetLevel: 2 },
            { id: 'n1_4', unitId: 'unit_1', title: 'Pop the 7s', description: 'Find number 7', type: 'SENSORY', position: { x: 50, y: 360 }, config: { target: 7, itemCount: 10 } },
            { id: 'n1_5', unitId: 'unit_1', title: 'Big & Small', description: 'Which is bigger?', type: 'PRACTICE', position: { x: 30, y: 480 }, targetLevel: 1, config: { type: 'comparison_simple', max: 10 } },
            { id: 'n1_6', unitId: 'unit_1', title: 'Sum to 10', description: 'Add numbers up to 10', type: 'PRACTICE', position: { x: 70, y: 600 }, targetLevel: 2, config: { type: 'addition_simple', max: 10 } },
            // Story micro-lesson: spotting the gap in a sequence before drilling it.
            { id: 'n1_7', unitId: 'unit_1', title: 'Missing Link', description: 'Lesson: 1, 2, ?, 4', type: 'LESSON', position: { x: 50, y: 720 }, targetLevel: 2 },
            { id: 'n1_8', unitId: 'unit_1', title: 'Pop the 9s', description: 'Find number 9', type: 'SENSORY', position: { x: 20, y: 840 }, config: { target: 9, itemCount: 12 } },
            { id: 'n1_9', unitId: 'unit_1', title: 'Beach Master', description: 'Mix of everything!', type: 'CHALLENGE', position: { x: 80, y: 960 }, targetLevel: 3, config: { max: 10 } },
            { id: 'n1_10', unitId: 'unit_1', title: 'Boss: Octopus', description: 'Prove your skills!', type: 'CHALLENGE', position: { x: 50, y: 1100 }, targetLevel: 3, config: { max: 10 } },
        ]
    },
    {
        id: 'unit_2',
        title: 'Forest of Numbers',
        theme: 'forest',
        order: 2,
        backgroundClass: 'bg-green-50',
        nodes: [
            { id: 'n2_1', unitId: 'unit_2', title: 'Pop the 12s', description: 'Find number 12', type: 'SENSORY', position: { x: 50, y: 0 }, config: { target: 12, itemCount: 15 } },
            { id: 'n2_2', unitId: 'unit_2', title: 'Teen Numbers', description: '10, 11, 12...', type: 'PRACTICE', position: { x: 30, y: 150 }, targetLevel: 3, config: { type: 'series_simple', max: 20 } },
            // Story micro-lesson: the make-10 strategy that carries sums past 10.
            { id: 'n2_3', unitId: 'unit_2', title: 'Addition 20', description: 'Lesson: make 10', type: 'LESSON', position: { x: 70, y: 300 }, targetLevel: 3 },
            // Story micro-lesson: teaches "taking away" before the first subtraction drill.
            { id: 'n2_3a', unitId: 'unit_2', title: 'Hungry Bunny', description: 'Lesson: 8 - 3', type: 'LESSON', position: { x: 78, y: 375 }, targetLevel: 2 },
            // Story micro-lesson: doubles and near doubles as an addition shortcut.
            { id: 'n2_3b', unitId: 'unit_2', title: 'Twin Trees', description: 'Lesson: 6 + 6', type: 'LESSON', position: { x: 25, y: 410 }, targetLevel: 3 },
            { id: 'n2_4', unitId: 'unit_2', title: 'Take Away', description: 'Simple Subtraction', type: 'PRACTICE', position: { x: 50, y: 450 }, targetLevel: 2, config: { type: 'sub_simple', max: 10 } },
            { id: 'n2_5', unitId: 'unit_2', title: 'Story Time', description: 'Word Problems', type: 'PRACTICE', position: { x: 20, y: 600 }, targetLevel: 3, config: { type: 'word_simple', max: 10 } },
            // Story micro-lesson: finding the missing addend by filling the gap.
            { id: 'n2_6', unitId: 'unit_2', title: 'Missing Number', description: 'Lesson: 3 + ? = 5', type: 'LESSON', position: { x: 80, y: 750 }, targetLevel: 3 },
            { id: 'n2_7', unitId: 'unit_2', title: 'Comparison', description: '>', type: 'PRACTICE', position: { x: 40, y: 900 }, targetLevel: 3, config: { type: 'comparison_simple', max: 20 } },
            { id: 'n2_8', unitId: 'unit_2', title: 'Sub Master', description: 'Subtraction up to 10', type: 'PRACTICE', position: { x: 60, y: 1050 }, targetLevel: 3, config: { type: 'sub_simple', max: 15 } },
            { id: 'n2_9', unitId: 'unit_2', title: 'Forest Challenge', description: 'Mix it up!', type: 'CHALLENGE', position: { x: 50, y: 1200 }, targetLevel: 4, config: { max: 20 } },
            { id: 'n2_10', unitId: 'unit_2', title: 'Boss: Bear', description: 'Don\'t poke the bear!', type: 'CHALLENGE', position: { x: 50, y: 1350 }, targetLevel: 4, config: { max: 20 } },
        ]
    },
    {
        id: 'unit_3',
        title: 'Multiplication Mtn',
        theme: 'mountain',
        order: 3,
        backgroundClass: 'bg-amber-50',
        nodes: [
            { id: 'n3_1', unitId: 'unit_3', title: 'Groups of 2', description: 'Lesson: 2, 4, 6', type: 'LESSON', position: { x: 50, y: 0 }, targetLevel: 4 },
            { id: 'n3_2', unitId: 'unit_3', title: 'Double Trouble', description: '2 + 2, 3 + 3', type: 'PRACTICE', position: { x: 30, y: 150 }, targetLevel: 4, config: { type: 'addition_simple', max: 20 } },
            // Story micro-lesson: counting back on the number line.
            { id: 'n3_3', unitId: 'unit_3', title: 'Times Two', description: 'Lesson: count back', type: 'LESSON', position: { x: 70, y: 300 }, targetLevel: 4 },
            { id: 'n3_4', unitId: 'unit_3', title: 'Skip Counting', description: '5, 10, 15...', type: 'PRACTICE', position: { x: 50, y: 450 }, targetLevel: 4, config: { type: 'series_simple', step: 5 } },
            // Story micro-lesson: skip-counting in fives before the times-five drill.
            { id: 'n3_5', unitId: 'unit_3', title: 'Times Five', description: 'Lesson: 5, 10, 15', type: 'LESSON', position: { x: 20, y: 600 }, targetLevel: 4 },
            { id: 'n3_6', unitId: 'unit_3', title: 'Big Addition', description: 'Adding tens (20+30)', type: 'PRACTICE', position: { x: 80, y: 750 }, targetLevel: 5, config: { type: 'addition_simple', max: 100 } },
            { id: 'n3_7', unitId: 'unit_3', title: 'Pop the 50s', description: 'Search for 50', type: 'SENSORY', position: { x: 40, y: 900 }, config: { target: 50, itemCount: 20 } },
            { id: 'n3_8', unitId: 'unit_3', title: 'Times Ten', description: 'Multiplying by 10', type: 'PRACTICE', position: { x: 60, y: 1050 }, targetLevel: 5, config: { type: 'multiplication', max: 10 } },
            { id: 'n3_9', unitId: 'unit_3', title: 'Climb Higher', description: 'Mixed Review', type: 'CHALLENGE', position: { x: 50, y: 1200 }, targetLevel: 5 },
            { id: 'n3_10', unitId: 'unit_3', title: 'Boss: Eagle', description: 'To the Summit!', type: 'CHALLENGE', position: { x: 50, y: 1350 }, targetLevel: 5 },
        ]
    },
    {
        id: 'unit_4',
        title: 'Division Desert',
        theme: 'beach', // Reuse beach theme for desert for now or add new
        order: 4,
        backgroundClass: 'bg-orange-50',
        nodes: [
            { id: 'n4_1', unitId: 'unit_4', title: 'Sharing is Caring', description: 'Divide items', type: 'LESSON', position: { x: 50, y: 0 }, targetLevel: 5 },
            // Story micro-lesson: halving by dealing items into two equal piles.
            { id: 'n4_2', unitId: 'unit_4', title: 'Divide by 2', description: 'Lesson: half of...', type: 'LESSON', position: { x: 30, y: 150 }, targetLevel: 5 },
            { id: 'n4_3', unitId: 'unit_4', title: 'Subtraction 20', description: '20 - 5', type: 'PRACTICE', position: { x: 70, y: 300 }, targetLevel: 4, config: { type: 'sub_simple', max: 20 } },
            // Story micro-lesson: 3× and 4× as rectangular arrays.
            { id: 'n4_3a', unitId: 'unit_4', title: 'Dune Arrays', description: 'Lesson: 3 × 4', type: 'LESSON', position: { x: 80, y: 375 }, targetLevel: 5 },
            { id: 'n4_4', unitId: 'unit_4', title: 'Missing Part', description: '10 - ? = 4', type: 'PRACTICE', position: { x: 50, y: 450 }, targetLevel: 5, config: { type: 'algebraic', max: 20 } },
            // Story micro-lesson: sharing into groups of five.
            { id: 'n4_5', unitId: 'unit_4', title: 'Divide by 5', description: 'Lesson: 20 / 5', type: 'LESSON', position: { x: 40, y: 600 }, targetLevel: 5 },
            { id: 'n4_6', unitId: 'unit_4', title: 'Logic Pattern', description: '2, 4, 8, 16', type: 'PRACTICE', position: { x: 60, y: 750 }, targetLevel: 6, config: { type: 'series_geometric' } },
            { id: 'n4_7', unitId: 'unit_4', title: 'Word Problems', description: 'Advanced Stories', type: 'PRACTICE', position: { x: 50, y: 900 }, targetLevel: 5, config: { type: 'word' } },
            { id: 'n4_8', unitId: 'unit_4', title: 'Sub Master', description: 'Sub up to 100', type: 'PRACTICE', position: { x: 30, y: 1050 }, targetLevel: 6, config: { type: 'sub_simple', max: 100 } },
            { id: 'n4_9', unitId: 'unit_4', title: 'Oasis Challenge', description: 'Don\'t dry up!', type: 'CHALLENGE', position: { x: 70, y: 1200 }, targetLevel: 6 },
            { id: 'n4_10', unitId: 'unit_4', title: 'Boss: Scorpion', description: 'Sting like a bee', type: 'CHALLENGE', position: { x: 50, y: 1350 }, targetLevel: 6 },
        ]
    },
    {
        id: 'unit_5',
        title: 'Space Station',
        theme: 'space',
        order: 5,
        backgroundClass: 'bg-slate-900', // Dark mode!
        nodes: [
            { id: 'n5_1', unitId: 'unit_5', title: 'Blast Off', description: 'Countdown 10-0', type: 'SENSORY', position: { x: 50, y: 0 }, config: { isMathSensory: true, target: 10, itemCount: 20 } },
            // Story micro-lesson: division that does not come out even.
            { id: 'n5_1a', unitId: 'unit_5', title: 'Leftovers', description: 'Lesson: 7 / 2', type: 'LESSON', position: { x: 75, y: 75 }, targetLevel: 7 },
            // Story micro-lesson: adding zero changes nothing.
            { id: 'n5_2', unitId: 'unit_5', title: 'Zero Gravity', description: 'Lesson: adding 0', type: 'LESSON', position: { x: 30, y: 150 }, targetLevel: 7 },
            { id: 'n5_3', unitId: 'unit_5', title: 'Binary Star', description: 'Compare 50 vs 20+30', type: 'PRACTICE', position: { x: 70, y: 300 }, targetLevel: 7, config: { type: 'comparison_complex' } },
            { id: 'n5_4', unitId: 'unit_5', title: 'Velocity', description: 'Speed Math', type: 'CHALLENGE', position: { x: 50, y: 450 }, targetLevel: 8 },
            { id: 'n5_5', unitId: 'unit_5', title: 'Black Hole', description: 'Subtraction w/ Borrow', type: 'PRACTICE', position: { x: 20, y: 600 }, targetLevel: 8, config: { type: 'sub_borrow' } },
            // Story micro-lesson: breaking a ten open to borrow from it.
            { id: 'n5_5a', unitId: 'unit_5', title: 'Break a Ten', description: 'Lesson: 23 - 7', type: 'LESSON', position: { x: 78, y: 675 }, targetLevel: 8 },
            { id: 'n5_6', unitId: 'unit_5', title: 'Galaxy Brain', description: 'Mixed Operations', type: 'PRACTICE', position: { x: 80, y: 750 }, targetLevel: 9 },
            { id: 'n5_7', unitId: 'unit_5', title: 'Nebula', description: 'Advanced Series', type: 'PRACTICE', position: { x: 40, y: 900 }, targetLevel: 9 },
            // Story micro-lesson: a guided sweep back through the tables.
            { id: 'n5_8', unitId: 'unit_5', title: 'Supernova', description: 'Lesson: tables review', type: 'LESSON', position: { x: 60, y: 1050 }, targetLevel: 10 },
            { id: 'n5_9', unitId: 'unit_5', title: 'The Void', description: 'Final Challenge 1', type: 'CHALLENGE', position: { x: 50, y: 1200 }, targetLevel: 10 },
            { id: 'n5_10', unitId: 'unit_5', title: 'Boss: Alien King', description: 'Save the Galaxy!', type: 'CHALLENGE', position: { x: 50, y: 1350 }, targetLevel: 10 },
        ]
    }
];
