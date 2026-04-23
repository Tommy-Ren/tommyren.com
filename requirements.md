import os

# Define the content for the markdown file
markdown_content = """# Project Specification: Cyber-Snake Portfolio

## 1. Project Vision
A highly interactive, gamified personal portfolio website with a **Cyberpunk 2077** aesthetic. The homepage features a 3D "Snake" game built with **Three.js**, where navigation is driven by both game mechanics (collision) and traditional UI interaction.

## 2. Visual Identity & Theme
The design must strictly adhere to a neon-noir, cyberpunk color palette to create a high-contrast, high-tech atmosphere.

* **Background Color:** `#050505` (Deep Void Black)
* **Primary Color:** `#00F0FF` (Neon Fluorescent Cyan) - For the snake, main UI borders, and active states.
* **Secondary Color A:** `#ADFF00` (Lime Green) - For "Food" items and success states.
* **Secondary Color B:** `#FF0055` (Neon Pink) - For interactive blocks, warnings, or hover highlights.
* **Styling Cues:** Glitch effects, scanlines, glowing bloom (Post-processing), and semi-transparent glassmorphism.

## 3. Core Gameplay & Navigation Logic
### 3.1 The "Cyber-Snake" Mechanism
* **Movement:** A 3D snake (composed of glowing segments) constantly crawls in a "snake-like" serpentine pattern in the center of the viewport.
* **Standard Game Loop:** * Randomly spawned "Food" items (Neon Lime) appear on the map.
    * Eating food increases the snake's length and increments the **Scoreboard**.
* **Collision Navigation:** Several large 3D interactive blocks represent site sections (e.g., **Resume, Background, Portfolio, Projects, CV**).
    * If the snake head collides with a block, the browser triggers a transition to the corresponding sub-page.

### 3.2 Dual-Mode Interaction
* **Game Mode (Auto-Crawl ON):**
    * The snake moves autonomously or is user-controlled (WASD/Arrows).
    * A **Scoreboard** is visible in the HUD.
    * Since the snake is moving, clicking blocks with a mouse is challenging (high-skill interaction).
* **Static Mode (Auto-Crawl OFF):**
    * A global toggle switch allows the user to disable the snake's movement.
    * When OFF: The snake freezes or disappears, the Scoreboard is hidden.
    * Users can easily navigate by clicking the static 3D blocks with the mouse.

## 4. Layout & Components
* **Center Stage:** The 3D Grid/Arena where the snake and navigation blocks reside.
* **Navigation Blocks:** Floating, glowing 3D cubes or panels with holographic text labels.
* **HUD (Heads-Up Display):**
    * **Top Left:** Project Title / Name.
    * **Top Right:** Scoreboard (Only visible in Game Mode).
    * **Bottom Center/Right:** The "Auto-Crawl" Toggle Switch (Cyberpunk-styled).

## 5. Technical Stack (Recommended)
* **Frontend:** React.js
* **3D Engine:** Three.js with **React Three Fiber (R3F)**.
* **Physics:** `@react-three/rapier` for collision detection between the snake and navigation blocks.
* **Post-processing:** UnrealBloomPass (for that neon glow) and GlitchPass.
* **State Management:** Zustand or React Context (to handle the Game/Static mode toggle).

## 6. Functional Requirements
1.  **Responsiveness:** The 3D canvas must resize dynamically to fit the window.
2.  **Performance:** Optimize geometry and lighting to ensure a smooth 60 FPS experience.
3.  **Route Integration:** Use `react-router-dom` to handle the transition between the 3D home screen and the detailed content pages.
"""

# Save the markdown file
file_path = "Cyber_Snake_Portfolio_Specs.md"
with open(file_path, "w", encoding="utf-8") as f:
    f.write(markdown_content)

print(f"File saved to {file_path}")