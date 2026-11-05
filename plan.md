1. **Optimize FrenzyOverlay.tsx**
   - Use `replace_with_git_merge_diff` on `src/components/games/FrenzyOverlay.tsx`.
   - Add `useMemo` to the imports if missing (already there).
   - In `FrenzyOverlay`, wrap the particle data generation inside `useMemo` so it doesn't run on every render.

   Search Block:
   ```typescript
<<<<<<< SEARCH
    // Burst logic: show on activation or tier upgrade, auto-hide after 1.8s
    useEffect(() => {
        if (isActive && tier && tier !== prevTierRef.current) {
            setShowBurst(true);
            const timer = setTimeout(() => setShowBurst(false), 1800);
            prevTierRef.current = tier;
            return () => clearTimeout(timer);
        }
        if (!isActive) {
            prevTierRef.current = null;
        }
    }, [isActive, tier]);

    return (
=======
    // Burst logic: show on activation or tier upgrade, auto-hide after 1.8s
    useEffect(() => {
        if (isActive && tier && tier !== prevTierRef.current) {
            setShowBurst(true);
            const timer = setTimeout(() => setShowBurst(false), 1800);
            prevTierRef.current = tier;
            return () => clearTimeout(timer);
        }
        if (!isActive) {
            prevTierRef.current = null;
        }
    }, [isActive, tier]);

    const particles = React.useMemo(() => {
        if (!tier) return [];
        return Array.from({ length: PARTICLE_COUNT * (tier === 'mega' ? 3 : tier === 'super' ? 2 : 1) }).map((_, i) => ({
            id: i,
            xOffset: Math.random() * 50 - 25,
            duration: 1 + Math.random(),
        }));
    }, [tier]);

    return (
>>>>>>> REPLACE
   ```

   Search Block 2:
   ```typescript
<<<<<<< SEARCH
                    {/* Ember Particles (Lightweight) — more particles for higher tiers */}
                    {Array.from({ length: PARTICLE_COUNT * (tier === 'mega' ? 3 : tier === 'super' ? 2 : 1) }, (_, i) => (
                        <motion.div
                            key={i}
                            className={`absolute bottom-0 w-2 h-2 rounded-full ${
                                tier === 'mega' ? 'bg-rose-400' :
                                tier === 'super' ? 'bg-purple-400' :
                                'bg-orange-400'
                            }`}
                            style={{
                                left: `${10 + (i * 7) % 80}%`,
                            }}
                            initial={{ y: 0, opacity: 1 }}
                            animate={{
                                y: -500,
                                opacity: 0,
                                x: Math.random() * 50 - 25
                            }}
                            transition={{
                                duration: 1 + Math.random(),
                                repeat: Infinity,
                                delay: (i * 0.1) % 1.5,
                                ease: "easeOut"
                            }}
                        />
                    ))}
=======
                    {/* Ember Particles (Lightweight) — more particles for higher tiers */}
                    {particles.map((p, i) => (
                        <motion.div
                            key={p.id}
                            className={`absolute bottom-0 w-2 h-2 rounded-full ${
                                tier === 'mega' ? 'bg-rose-400' :
                                tier === 'super' ? 'bg-purple-400' :
                                'bg-orange-400'
                            }`}
                            style={{
                                left: `${10 + (i * 7) % 80}%`,
                            }}
                            initial={{ y: 0, opacity: 1 }}
                            animate={{
                                y: -500,
                                opacity: 0,
                                x: p.xOffset
                            }}
                            transition={{
                                duration: p.duration,
                                repeat: Infinity,
                                delay: (i * 0.1) % 1.5,
                                ease: "easeOut"
                            }}
                        />
                    ))}
>>>>>>> REPLACE
   ```

2. **Verify Changes**
   - Run tests and linting via `run_in_bash_session`:
     `pnpm lint && pnpm build && ./node_modules/.bin/vitest run && npx playwright test`

3. **Commit Changes**
   - Use `run_in_bash_session` to run `git add src/components/games/FrenzyOverlay.tsx && git commit -m "⚡ Bolt: Prevent layout thrashing in FrenzyOverlay" -m "💡 What: Extracted ember particles Math.random() logic into useMemo" -m "🎯 Why: FrenzyOverlay re-renders frequently causing layout thrashing due to inline Math.random" -m "📊 Impact: Reduces layout thrashing and improves FPS during active frenzy mode" -m "🔬 Measurement: Verify rendering performance in React profiler during gameplay with active frenzy"`

4. **Execute Pre-commit instructions**
   - Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.

5. **Submit**
   - Use the `submit` tool to finalize the task.
