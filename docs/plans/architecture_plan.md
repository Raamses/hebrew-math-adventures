# Architectural Plan & Design Patterns

## 1. Executive Summary
This document outlines the technical architecture for "Hebrew Math Adventures", transitioning from a simple React app to a robust, scalable educational platform.

## 2. Current Architecture (As-Is)
*   **Architecture Style**: Component-Based Architecture (React).
*   **State Management**: `React.Context` + `Hook` pattern (Provider Pattern).
*   **Logic Coupling**: Tightly coupled Game Loop in `App.tsx`.

## 3. Design Patterns Strategy

### A. Creational Patterns
**1. Singleton Pattern (`QuestionGenerator`)**
*   **Context**: The math engine needs to maintain state (bag deck, history) across the entire session lifecycle.
*   **Implementation**: `QuestionGenerator.ts` is implemented as a Singleton.
*   **Goal**: Ensure consistent non-repeating problem generation globally.

**2. Factory Pattern (Proposed for `Problem` Types)**
*   **Context**: We are introducing new problem types (Missing Operand, Comparison).
*   **Plan**: Implement an `AbstractProblemFactory` interface with concrete factories:
    *   `ArithmeticFactory` (Standard `3 + 2`)
    *   `AlgebraicFactory` (`3 + ? = 5`)
    *   `ComparisonFactory` (`5 ? 7`)
*   **Benefit**: Open/Closed Principle. We can add new problem types without modifying the consumer logic.

### B. Structural Patterns
**3. Facade Pattern (`MathEngine`)**
*   **Context**: The consumer (UI) shouldn't know about `QuestionGenerator`'s complex Bag Deck logic or `XP` formulas.
*   **Implementation**: `src/engines/MathEngine.ts` acts as a static Facade.
*   **Benefit**: Simplifies the API for the View Layer.

**4. Composite Pattern (UI Components)**
*   **Context**: The User Interface is built as a tree of components.
*   **Implementation**: `MathCard` contains `HintVisualizer`, which contains concrete hints like `BorrowingHint`.
*   **Benefit**: Uniform treatment of individual objects and compositions.

### C. Behavioral Patterns
**5. Strategy Pattern (Hints System)**
*   **Context**: Different math problems require completely different visualization strategies.
*   **Plan**: The `HintVisualizer` should select a rendering strategy at runtime based on `Problem.subType`.
    *   `SubtractionStrategy` (Crossing out particles)
    *   `MultiplicationStrategy` (Grid/Array visualization)
*   **Benefit**: Clean separation of algorithms (rendering logic) from the host class.

**6. Observer Pattern (State Management)**
*   **Implementation**: `ProfileContext` acts as the Subject, and consuming components (`Header`, `ParentDashboard`) are Observers.

## 4. Algorithmic Efficiency & Performance

### A. Time Complexity
1.  **Question Generation**: $O(1)$
    *   The "Bag Deck" shuffle is $O(N)$ but occurs rarely. Amortized cost is $O(1)$.
    *   Duplicate checking is $O(1)$ (fixed history buffer of size 3).

### B. Space Complexity
*   **Asset Footprint**: Low. Using CSS/SVG for most UI elements.
    *   **Optimization**: Dynamic imports for new "Lesson Mode" assets.

## 5. Mobile-First Optimization Strategy
*   **Render Performance**:
    *   Target: **60 FPS** consistently on low-end mobile devices.
    *   Technique: Use `transform` and `opacity` for animations (GPU accelerated).
*   **Memory Management**:
    *   Strict cleanup in `useEffect` for Audio contexts and Timers.

## 6. Refactoring Roadmap (Technical Debt)
1.  **Deprecate** `src/lib/gameLogic.ts` (Legacy) favoring `src/engines/*`.
2.  **Extract** `GameController` logic from `App.tsx`.
