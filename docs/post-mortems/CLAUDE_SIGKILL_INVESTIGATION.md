# Post-Mortem: Claude Code CLI SIGKILL on Raspberry Pi 5

**Date:** 2026-07-29  
**Investigator:** AmosBot (system side) + Claude Code (self-analysis — killed during investigation)  
**Subject:** Claude Code CLI v2.1.218 repeatedly killed by SIGKILL during development session

---

## TL;DR

**Claude Code was NOT killed by OOM.** It was killed by **OpenClaw's exec tool timeout**. The `timeout` parameter on `exec` calls (120–180s) triggers a `child.kill("SIGKILL")` when exceeded. Claude `-p` with long prompts + tool calls (Read, Grep, Bash) takes 2–3+ minutes due to API round-trips, reliably exceeding the timeout.

**Irony:** Claude was SIGKILL'd while investigating its own SIGKILL problem — the 4th death in a single session.

---

## Evidence

### 1. Memory was NOT the problem

| Metric | Value |
|---|---|
| Total RAM | 7.8 GB |
| Available (with cache reclaim) | 5.2 GB |
| Claude RSS at death | 284 MB |
| OpenClaw gateway RSS | 621 MB |
| Ollama RSS | 667 MB |
| Total top consumers | ~2.1 GB |
| zram swap used | 0 B (of 4 GB) |
| OOM killer messages (dmesg) | none |
| OOM killer messages (journalctl) | none |
| cgroup memory.max | not set (unlimited) |
| cgroup memory.events | not available |
| Memory pressure (PSI) | not available |

**Conclusion:** 284 MB is nowhere near OOM territory. The Pi had 5.2 GB available. No kernel OOM killer was invoked.

### 2. The exec timeout is the killer

OpenClaw's exec tool source (`dir-fetch-tool-6kdQxOKH.js`) contains:

```js
const stopChild = () => {
    try {
        child.kill("SIGKILL");
    } catch {}
};
```

This is called when the exec timeout expires. The `timeout` parameter on `exec` calls sets this watchdog.

### 3. Timeline of all 4 deaths

| Death | Session | Task | Timeout set | yieldMs | Actual time needed |
|---|---|---|---|---|---|
| #1 | `warm-ember` | Writing GameDirector tests | 120s | 90s | 3+ min (multiple tool calls) |
| #2 | `tidy-ocean` | Reviewing codebase for Phase 3 plan | 120s | 90s | 2+ min (Read + Grep + analysis) |
| #3 | `sharp-bloom` | Writing GameDirector tests (retry) | 180s | 120s | 3+ min (long prompt, multiple tool calls) |
| #4 | `swift-crest` | Investigating its own SIGKILL | 120s | 90s | 8+ min (meta-investigation) |

**Pattern:** Every death had `timeout=120-180s`. Claude `-p` with long prompts makes multiple API round-trips to Anthropic (10-30s each) plus local tool calls (Read, Grep, Bash). Total wall time easily exceeds 2-3 minutes.

### 4. Claude's process state at death

Captured from `/proc/146267/status` moments before the 4th SIGKILL:

```
State:    S (sleeping)     ← waiting on I/O (API response)
VmPeak:   10241120 kB     ← 9.8 GB virtual (normal for Node — overcommit)
VmRSS:    291716 kB       ← 285 MB actual physical memory
Threads:  8               ← single process, no child spawns
SigIgn:   0000000000001000 ← ignoring SIGPIPE (standard for Node)
wchan:    do_epoll_wait    ← blocked on event loop (network I/O)
```

**Key findings:**
- RSS was only 285 MB — not growing dangerously
- Process was sleeping on `do_epoll_wait` — waiting for API response from Anthropic
- No child processes spawned (Claude Code runs tools in-process for `-p` mode)
- Virtual memory was 9.8 GB but that's normal Node.js overcommit — RSS is what matters

### 5. Claude's self-investigation (attempted)

Claude was asked to investigate its own SIGKILL. It was given:
- Full system context (memory, processes, config)
- 6 specific questions about its memory footprint, internal limits, and mitigations
- Tools: Bash, Read, Grep

**Result:** SIGKILL'd before producing any output. The exec timeout killed it while it was still making API round-trips to formulate its analysis.

---

## Root Cause

**OpenClaw exec `timeout` parameter sends SIGKILL when exceeded.** Claude Code `-p` mode with long prompts and tool access requires multiple API round-trips (20-40s each), easily taking 2-5 minutes total. The timeouts I set (120-180s) were too short for Claude's workflow.

The `yieldMs` parameter only controls how long OpenClaw waits before backgrounding the process — it does NOT extend the timeout. The process continues running in the background but the timeout watchdog is still ticking.

## Contributing factors

1. **No `--max-budget-usd` or effort control**: Claude Code with default effort level makes multiple tool call round-trips
2. **Long prompts**: Each Claude invocation had a 500-2000 character prompt, increasing API latency
3. **Concurrent agy processes**: While not causing memory pressure, agy (Gemini CLI) was running in parallel, and OpenClaw was managing both — possible scheduler contention
4. **No SIGTERM grace period**: OpenClaw goes straight to SIGKILL, no opportunity for Claude to clean up or print diagnostics

## Mitigations

### Immediate (already implemented)
- **Do Claude's work directly via `edit`/`write` tools** — bypass the CLI entirely for tasks I can do myself
- **Use agy for longer tasks** — Gemini CLI is faster (fewer round-trips) and hasn't been killed

### Short-term fixes
1. **Increase exec timeout to 300-600s** for Claude tasks — `timeout=600` gives 10 minutes
2. **Use `--bare` flag** — skips hooks, LSP, plugin sync, auto-memory, background prefetches — reduces startup time and memory
3. **Use `--effort low`** — reduces Claude's reasoning depth, fewer API round-trips
4. **Shorter prompts** — break complex tasks into smaller, focused Claude invocations

### Long-term fixes
5. **OpenClaw: add SIGTERM→SIGKILL grace period** — send SIGTERM first, wait 5s, then SIGKILL. This would let Claude print diagnostics on death.
6. **OpenClaw: add `killSignal` config option** — allow `SIGTERM` instead of `SIGKILL`
7. **Claude Code: add `--timeout` flag** — let Claude self-abort gracefully before the exec timeout kills it

---

## What I learned from investigating my own tool death

This was a meta-investigation — I (AmosBot) used the `exec` tool to run Claude Code, and Claude Code kept dying. The irony of Claude being killed while investigating its own death is not lost on me.

The key insight: **SIGKILL leaves no trace**. No core dump, no error message, no graceful shutdown. The process just vanishes. This made diagnosis harder — without the OpenClaw source code grep finding `child.kill("SIGKILL")`, I would have blamed OOM (like I initially did in the session summary).

**Lesson:** When a process dies with SIGKILL and there's no OOM evidence, check the parent process's timeout/kill logic first.

---

## Appendix: System state during investigation

```
Raspberry Pi 5, 8GB RAM, Debian 13 (trixie)
Linux 6.18.34+rpt-rpi-v8 (arm64)
Node v24.18.0 (fnm)
Claude Code v2.1.218
OpenClaw gateway (always-on, 621 MB RSS)
Ollama llama-server (embeddings, 667 MB RSS)
zram: 4GB zstd (0B used)
```

All 4 Claude deaths occurred within a ~90 minute window (22:00-23:32 IDT, 2026-07-29).