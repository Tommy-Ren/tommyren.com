# Update Specification: WebGPU Cyber-Sphere Portfolio (Phase 2)

## 1. Overview of Upgrades
This document outlines the Phase 2 feature enhancements for the Tommy Ren 3D Cyber-Sphere Portfolio. The focus is on improving gameplay physics, expanding the playable arena, and adding accessible traditional navigation for recruiters.

## 2. World Scale & Camera Adjustments
* **Sphere Enlargement:** The radius of the 3D spherical world must be increased by **5x** its current size. This will make the curvature appear more gradual to the player and provide a significantly larger surface area for navigation blocks and food spawning.
* **Camera Integrity:** Despite the sphere expanding, the camera's relative distance, FOV (Field of View), and follow-target logic must remain exactly the same. The camera should maintain its tight, third-person tracking of the snake's head to preserve the current visual scale of the snake.

## 3. Snake Growth Mechanics
* **Dynamic Length:** The snake must now visually grow when it successfully collides with "Food" (Lime Green nodes).
* **Implementation:** Upon scoring, append a new glowing segment to the tail of the snake array. Ensure the new segment accurately follows the historical path (spherical coordinates) of the segment immediately preceding it.

## 4. Physics-Based Speed Control
The snake's forward movement will transition from a static constant speed to a dynamic, physics-based throttle system simulating vehicle acceleration.

* **Controls:** `W` or `Up Arrow` to accelerate. `S` or `Down Arrow` to brake/decelerate.
* **Speed States:**
    * `Base Speed` ($V_{base}$): The default cruising speed when no keys are pressed.
    * `Max Speed` ($V_{max}$): The absolute top speed when accelerating.
    * `Min Speed` ($V_{min}$): The slowest possible crawl speed when braking (should not be zero, the snake must keep moving).
* **Parabolic/Easing Logic:**
    * **Throttle On:** When holding `W`, the speed interpolates towards $V_{max}$ using a parabolic ease-in curve (e.g., accelerating faster initially, then plateauing near the top speed).
    * **Throttle Release (Auto-Return):** When `W` or `S` is released, the snake's speed does not snap back immediately. Instead, it uses a friction/damping calculation to smoothly ease back to $V_{base}$.
    * **Braking:** When holding `S`, the speed interpolates downwards to $V_{min}$ following a similar smoothing curve.

## 5. UI: Universal Top Navigation Menu
To ensure usability for visitors (such as HR personnel) who may not want to interact with the 3D game, a traditional navigation bar must be superimposed over the canvas.

* **Position:** Fixed at the absolute top of the viewport (`top: 0`, `width: 100%`, `z-index` higher than the WebGPU canvas).
* **Styling:** Cyberpunk minimalist. Transparent background with a slight glassmorphism blur, neon text hover effects matching the primary cyan (`#00F0FF`) or pink (`#FF0055`) theme.
* **Menu Items & Routing:**
    1.  **Home** (Resets camera/state to the central game view)
    2.  **About Me** (Directly opens the About overlay/page)
    3.  **Projects** (Directly opens the Projects overlay/page)
    4.  **CV / Resume** (Directly opens the Resume overlay/page)
    5.  **Contact** (Directly opens the Contact overlay/page)
* **Interaction:** Clicking any link in the Top Navigation should instantly pause the game loop (or let the A* autopilot take over in the background) and display the relevant HTML content, bypassing the need to physically steer the snake into the 3D blocks.