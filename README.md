# Method Mosaic

![Method Mosaic logo](./logo.svg)

Method Mosaic is a web application for building moodboards quickly. Drop images into a flexible canvas, experiment with layouts and branding, and export polished boards for sharing.

## Features
- Drag-and-drop images
- Multiple layout templates with shuffle mode
- Image cropping and repositioning
- Branding controls for logos, fonts, and colors
- Reusable asset panel with search and drag-to-place
- Export to PNG, JPEG, WEBP, or PDF
- One-command deployment to GitHub Pages

## Tech Stack
- React 18
- Vite 5
- Tailwind CSS
- html-to-image and jspdf for export utilities

## Prerequisites
- Node.js v18+ and npm

## Quick Start
```bash
npm install
npm run dev
```
Open <http://localhost:5173> to view the app.

## Usage
1. Drag images onto the canvas or upload via the asset panel.
2. Adjust layout, branding, and cropping from the sidebar.
3. Reuse assets from the panel with search and drag-to-place.
4. Export your board as PNG, JPEG, WEBP, or PDF.

## Scripts
```bash
npm run dev      # Start development server
npm run build    # Create production build in dist/
npm run preview  # Preview the production build locally
npm run deploy   # Build and publish dist/ to GitHub Pages
```
`npm run deploy` requires the [`gh-pages`](https://www.npmjs.com/package/gh-pages) CLI.

## Project Structure
```
.
├── index.html
├── src/
│   ├── App.jsx
│   ├── main.jsx
│   ├── index.css
│   └── components/
└── ...
```

## Contributing
Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for workflow and guidelines.

## Security
Report vulnerabilities privately via GitHub Security Advisories. See [SECURITY.md](SECURITY.md).

## License
Add your chosen license in a `LICENSE` file and reference it here.
