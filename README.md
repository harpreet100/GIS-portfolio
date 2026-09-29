# Harpreet Singh - GIS & Automation Portfolio

This is a completely static portfolio website built with HTML5, CSS3, and Vanilla JavaScript. It requires no backend, databases, or complex frameworks.

## 1. How to run the website locally
Simply double-click the `index.html` file in your file explorer. It will open in your default web browser. Because it uses relative paths and no backend API, everything will function offline exactly as it will online.

## 2. How to replace placeholder information
Open the HTML files in VS Code (or your preferred editor) and search (Ctrl+F) for the following exact placeholder strings, then replace them with your actual links/data:
* `YOUR_GITHUB_URL`
* `YOUR_LINKEDIN_URL`
* `YOUR_GITHUB_PROJECT_URL`
* `YOUR_RESUME_URL`
* `YOUR_EMAIL` (Format as: `mailto:name@example.com`)
* `[ADD RESULT]`
* `[ADD IMAGE: assets/images/...]`
* `STORYMAP_URL`

## 3. How to add a project
1. Duplicate an existing project file (e.g., `projects/transit.html`) and rename it.
2. Update the text, tags, and image placeholders inside the new HTML file.
3. Open `projects.html` and add a new `<div class="card project-card project-item"...>` block matching the others.
4. Set the correct `data-category` attribute on the card so the JavaScript filter knows how to sort it (e.g., `data-category="analysis cartography"`).

## 4. How to replace images
1. Place your exported maps, screenshots, or diagrams into the `/assets/images/` folder.
2. In the HTML files, replace the `[ADD IMAGE...]` text placeholders with actual image tags:
   `<img src="../assets/images/your-image-name.jpg" alt="Description of map">`

## 5. How to deploy to GitHub Pages (Free Hosting)
1. Create a new repository on GitHub named `yourusername.github.io` (or any portfolio name).
2. Upload all these folders and files directly to the root of that repository.
3. In the repository settings on GitHub, navigate to **Pages**.
4. Set the source branch to `main` (or `master`) and save.
5. In a few minutes, your portfolio will be live at `https://yourusername.github.io`.