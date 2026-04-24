# Project Specification: WebGPU Cyber-Sphere Portfolio

## 1. Project Vision
An ultra-modern, interactive 3D personal portfolio built with **WebGPU** and Three.js. The experience takes place on a continuously rotating, cyberpunk-styled spherical world. The user acts as a neon snake, constantly moving forward around the globe, navigating between interactive "portfolio sections" and collecting food, blending gamification with professional showcasing.

## 2. Visual Identity & Theme
The aesthetic is pure neon-noir cyberspace, utilizing high-contrast glowing elements against a dark void.
* **Background / Void:** `#050505` (Deep Void Black).
* **Primary Accent (The Snake):** `#00F0FF` (Neon Fluorescent Cyan). Must utilize Three.js **Bloom (Post-processing)** to ensure the snake visibly radiates light onto the dark globe.
* **Core Highlight (Key Sections):** `#FF0055` (Neon Pink). Strictly reserved for high-priority sections like "Projects" or "Resume" to instantly grab the user's attention.
* **Secondary/Food:** `#ADFF00` (Lime Green) for collectable items.
* **Visual Effects:** Scanlines, holographic text floating above the blocks, and emissive materials powered by WebGPU rendering.

## 3. Core Gameplay & Spherical Topology
* **The World:** A 3D sphere. Because the topology is spherical, moving continuously in any single direction will eventually loop the player back to their starting coordinates.
* **Continuous Motion:** The snake is in a state of perpetual forward motion ("crawling").
* **Player Controls:** The player cannot stop the forward movement. They can only steer left or right relative to the snake's current heading using the `A` and `D` keys or the `Left` and `Right` arrow keys.
* **Objective:** Collect randomly spawned food (Lime Green) to increase the score, while navigating toward or away from the 3D portfolio blocks scattered across the globe.

## 4. AI & "Autopilot" Logic (A* Pathfinding)
To ensure the website remains dynamic even when the user is passive, an intelligent autopilot system is implemented:
* **A* Pathfinding on a Sphere:** When active, the snake uses an A* algorithm (mapped over a spherical grid or nav-mesh) to automatically calculate the shortest path to the nearest randomly generated food item and navigates towards it.
* **Manual Override:** The moment the user provides input (`A`, `D`, `Left`, `Right`), the A* autopilot is instantly disabled, granting full control to the player.
* **Idle Resumption:** If the system detects no user keyboard input for exactly **3 seconds**, the A* autopilot automatically re-engages and takes over steering.

## 5. Collision & Navigation Mechanics
* **The Blocks:** The globe is populated with distinct 3D structures representing different website sections (e.g., *About Me, Tech Stack, Projects (Neon Pink), CV*).
* **Impact Sequence:** When the snake's head collides with a portfolio block, a **0.5-second visual feedback sequence** is triggered before the page routes:
    1.  The forward motion halts.
    2.  The struck block undergoes a visual distortion (e.g., rapid flashing, digital glitching, or pixelated collapsing/shattering).
    3.  A sound effect plays (optional).
    4.  After the 0.5s animation completes, the application transitions to the corresponding detailed content page.

## 6. Technical Stack & Execution
* **Graphics API:** **WebGPU** (via the latest Three.js `WebGPURenderer`) for superior performance, handling complex post-processing and hundreds of glowing segments efficiently.
* **Framework:** React with React Three Fiber (R3F).
* **Math/Physics:** Spherical coordinate math (`Spherical` class in Three.js) to pin the blocks, food, and snake segments to the surface of the globe, calculating surface normals to keep them upright.
* **Post-Processing:** `@react-three/postprocessing` using Bloom Pass (thresholds adjusted so only the neon colors glow) and Glitch Pass (triggered on collision).