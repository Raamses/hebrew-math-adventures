export const useResponsivePath = (nodeCount: number, width: number, height: number) => {
    // Logic for path generation
    const points = [];
    const amplitude = Math.min(width * 0.4, 200); // Max amplitude 200px or 40% of width
    const verticalSpacing = height / (nodeCount + 1);

    for (let i = 0; i < nodeCount; i++) {
        const y = (i + 1) * verticalSpacing;
        // Sine wave: x oscillates around center
        // We use i to determine phase.
        const x = width / 2 + Math.sin(i * 0.8) * amplitude;

        points.push({ x, y });
    }
    return points;
};
