# Codex Project Portfolio

A curated portfolio of application prototypes built **entirely using Codex** (OpenAI’s code generation model). This project showcases how Codex can rapidly create interactive prototypes, web apps, and creative experiments with minimal manual coding.

## 🚀 Overview

- **Purpose**: Explore and demonstrate the capabilities of Codex for end-to-end prototyping.  
- **Contents**: Each prototype highlights a unique use case — from games to planners, visual demos, and beyond.  
- **Audience**: Developers, designers, and AI enthusiasts interested in AI-assisted coding workflows.

## 🧠 How It Was Built

1. **Prompt-driven development**  
   Each prototype begins with a carefully crafted natural language prompt describing the app’s goals, UI, and interactivity.

2. **Codex generation**  
   Codex generates HTML, CSS, and JavaScript snippets or entire files, which are refined and tested iteratively.

3. **Testing & iteration**  
   Prototypes are run in the browser, with refinements guided by additional Codex prompts and manual tweaks.

4. **Polishing**  
   Styles, responsiveness, and usability are adjusted to bring prototypes closer to production-ready quality.

## ✅ Running Locally

1. Clone this repository:
   ```bash
   git clone https://github.com/jakecastillo/codex-project-portfolio.git
   cd codex-project-portfolio

## 🌍 Deploying to GitHub Pages

Deployment is handled automatically by the GitHub Actions workflow in `.github/workflows/deploy.yml`.

1. Push or merge changes into `main`.
2. Verify the `Deploy to GitHub Pages` workflow completes successfully (GitHub → Actions tab).
3. Enable GitHub Pages once (Settings → Pages → "Build and deployment" → Source: GitHub Actions).
4. Visit the published site at `https://<your-user>.github.io/codex-project-portfolio/` (adjust for your username and repo name).

The workflow uploads a static copy of the repository (minus CI files) and places a `.nojekyll` marker so assets with underscores are served correctly.
