# Getting Started with Modernized DuckHunt-JS

## Prerequisites

- Node.js v14+ (tested on v23.2.0)
- npm v6+

## Installation

```bash
npm install
```

## Development

### Start Development Server
```bash
npm start
```

This will start webpack-dev-server on http://localhost:8080

### Build for Production
```bash
npm run build
```

Output will be in the `dist/` directory.

### Lint Code
```bash
npm run lint
```

### Build Assets

#### Generate Sprite Sheet
```bash
npm run images
```
Requires [TexturePacker](https://www.codeandweb.com/texturepacker) to be installed.

#### Generate Audio Sprite
```bash
npm run audio
```

## Project Structure

```
├── src/
│   ├── modules/       # Game classes (Game, Stage, Duck, Dog, etc.)
│   ├── libs/          # Utility libraries
│   ├── assets/        # Images and sounds
│   └── data/          # Game data (levels.json)
├── dist/              # Built files (after npm run build)
├── webpack.config.js  # Webpack 5 configuration
├── gulpfile.js        # Asset build tasks
└── main.js           # Entry point
```

## Key Technologies

- **Pixi.js v7** - 2D rendering engine (stable LTS version)
- **GSAP v3** - Animation library
- **Howler.js v2** - Audio library
- **Webpack 5** - Module bundler
- **Babel 7** - JavaScript transpiler

## Browser Support

Modern browsers with ES6+ support:
- Chrome 60+
- Firefox 60+
- Safari 12+
- Edge 79+

## Known Issues

None! The game has been fully modernized and tested.

## Troubleshooting

### Dev Server Won't Start

If you encounter fsevents errors on newer Node.js versions:
1. Delete `node_modules/` and `package-lock.json`
2. Run `npm install` again

The package.json includes overrides for fsevents v2 which should resolve compatibility issues.

### Build Errors

If the build fails:
1. Ensure all dependencies are installed: `npm install`
2. Check Node.js version: `node --version` (should be 14+)
3. Try cleaning and rebuilding: `rm -rf dist/ && npm run build`

## Development Tips

- The game preserves all original mechanics - no gameplay changes were made
- All changes are structural (modern JS, updated libraries)
- Hot Module Replacement (HMR) is enabled in dev mode
- Source maps are generated for debugging

## License

MIT - See LICENSE file for details

