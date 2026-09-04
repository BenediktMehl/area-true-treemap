# Area-True Treemap 2D Demo

A modern, interactive 2D visualization of the area-true treemap algorithm from the thesis. Built with Svelte + Vite.

## Features

- **2D SVG Rendering**: Clean, color-coded treemap visualization with depth-based lava gradient
- **Thesis-Aligned Settings**:
  - Margin control (0.5% to 3% relative distance, or auto)
  - Label configuration (top N levels, size as percentage)
  - Toggle: Collapse single-child folder chains
  - Toggle: Apply sibling margins (gaps between nodes)
  - Adjustable minimum render size for filtering
- **File Upload**: Load custom JSON data (CodeCharta-like format)
- **Sample Data**: Pre-loaded example for quick testing
- **Modern UI**: Dark gradient background with glassmorphism, Tailwind CSS styling

## Getting Started

### Prerequisites

- Node.js 16+
- npm or yarn

### Installation

```bash
cd demo
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build

```bash
npm run build
```

## Input Data Format

The app expects a CodeCharta-like JSON tree structure:

```json
{
  "name": "root",
  "attributes": {
    "size": 10000
  },
  "children": [
    {
      "name": "folder",
      "attributes": {
        "size": 5000
      },
      "children": [
        {
          "name": "file",
          "attributes": {
            "size": 2500
          }
        }
      ]
    }
  ]
}
```

**Required fields:**
- `name`: Node identifier
- `attributes.size` (or custom metric): Numeric value for area sizing
- `children`: Array of child nodes (optional for leaves)

## Settings

### Margin
- **Auto**: Default ~1.5% relative distance
- **0.5%, 1%, 2%, 3%**: Fixed relative margins
- Applied based on first-pass layout (thesis approximation)

### Labels
- **Top N**: Number of hierarchy levels to show folder labels (0-10)
- **Size (%)**: Height of label area as percentage of parent (1-20%)

### Toggles
- **Collapse Folders**: Merge single-child folder chains into parent name
- **Sibling Gaps**: Apply margins between sibling nodes

### Min Size
- Minimum pixel dimension for nodes to render
- Useful for filtering noise in large datasets

## Algorithm Parameters (Thesis Defaults, Fixed)

- Aspect ratio: 1 (square containers)
- Sort order: Descending by size
- Sizing mode: Relative (proportional to data)
- Algorithm passes: Single run
- Reorder on second pass: Enabled

## Architecture

```
src/
├── App.svelte                 # Main UI and controls
├── main.ts                    # Entry point
├── lib/
│   ├── algorithms/
│   │   └── areaTrue/
│   │       ├── adapter.ts     # High-level layout orchestration
│   │       └── squarify.ts    # Core squarify algorithm
│   ├── components/
│   │   └── TreemapSvg.svelte  # 2D SVG renderer
│   ├── state/
│   │   └── settings.ts        # Svelte stores for settings
│   ├── types.ts               # TypeScript interfaces
│   ├── codeCharta.model.ts    # Minimal CodeCharta stubs
│   ├── layoutNode.ts          # Layout node class
│   └── data/
│       └── sample.json        # Sample dataset
```

## Known Limitations

- No 3D rendering (intentionally 2D only)
- Nested layouts not included (focus on area-true squarify)
- Metric rendering: area only (no height/color by secondary metrics)
- Label approximation: based on first-pass layout (thesis constraint)

## License

See repository LICENSE.
