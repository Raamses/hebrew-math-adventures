const { performance } = require('perf_hooks');
const n = 10;
const profiles = Array.from({ length: n }, (_, i) => ({ id: `profile-${i}`, streak: i }));

function runMap() {
    const id = `profile-${n-1}`;
    const safeUpdates = { streak: -1 };
    return profiles.map(p => {
        if (p.id === id) {
            return { ...p, ...safeUpdates };
        }
        return p;
    });
}

function runFindIndex() {
    const id = `profile-${n-1}`;
    const safeUpdates = { streak: -1 };
    const index = profiles.findIndex(p => p.id === id);
    if (index !== -1) {
        const newProfiles = [...profiles];
        newProfiles[index] = { ...profiles[index], ...safeUpdates };
        return newProfiles;
    }
    return profiles;
}

// Warmup
for (let i = 0; i < 10000; i++) {
    runMap();
    runFindIndex();
}

const mapStart = performance.now();
for (let i = 0; i < 1000000; i++) {
    runMap();
}
const mapEnd = performance.now();

const findIndexStart = performance.now();
for (let i = 0; i < 1000000; i++) {
    runFindIndex();
}
const findIndexEnd = performance.now();

console.log(`Map: ${mapEnd - mapStart} ms`);
console.log(`FindIndex: ${findIndexEnd - findIndexStart} ms`);
