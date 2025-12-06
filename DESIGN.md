# Time Series Plotter

A Node.js project to visualize time series data from CSV files.

## Features

- **Interactive Visualization**: High-performance time series charts built with D3.js and React.
- **Synchronized Details**: Hovering over the plot updates a dedicated details view with values for that timestamp.
- **Data Grid**: Full tabular view of the time series data.
- **Development Server**: Fast local development using esbuild.
- **CLI Utility**: A single-file Node.js utility to generate self-contained HTML reports from CSV files.
- **Responsive Design**: Modern UI that adapts to different screen sizes.

## UI Layout

The application follows a strict vertical layout (Top to Bottom):

1.  **Time Series Plot**: A large, interactive line plot occupying the top section.
    - Displays multiple series if applicable.
    - Vertical cursor line tracks mouse movement.
    - Min height is 300px, max height is 700px, default height is 66vh (i.e. 2/3 of the viewport height).
2.  **Hover Details**: A compact table/list showing the exact values for all series at the current cursor position.
    - Updates in real-time as the user hovers over the plot.
    - Before the user hovers over the plot, the "Hover Details" section displays all column names (series names) with their corresponding legend colors.
3.  **Full Data Table**: A comprehensive table listing all data points at the bottom of the page.

## UI Interactions

### 1. Plot Hover

- **Vertical Rule**: When the mouse or touch pointer hovers over the plot context, a vertical line (cursor) is rendered at that specific point in time.
- **Details Display**: The exact values for all series at that timestamp are rendered in the "Hover Details" section just below the plot.
- **Table Highlighting**: The corresponding row in the "Full Data Table" is highlighted to provide context within the full dataset.
- **Initial State**: Before any interaction, the "Hover Details" section displays all column names (series names) with their corresponding legend colors.

### 2. Series Isolation

- **Click to Isolate**: Clicking on a series name or value in the "Hover Details" section triggers a re-render of the plot, displaying _only_ that selected series.
- **Persistent Details**: Crucially, the "Hover Details" section acts as a legend and _continues to show values for all series_, even when only one is plotted.
- **Restore**: Clicking the isolated series again restores the view to show all series.

### 3. Sticky Headers

- **Table Header**: The header row of the "Full Data Table" sticks to the top of the viewport when scrolling down, ensuring column context is never lost.

### 4. Sticky Plot Toggle

- **Toggle Control**: A toggle switch is located above the plot area.
- **Behavior**: When enabled, the entire "Time Series Plot" section becomes sticky at the top of the viewport. This allows users to scroll through the long "Full Data Table" while keeping the plot visible for reference.

### 5. Table hover

When hovering over a row of the full data table, the cursor line is rendered at the specific point in time in the plot.

## Design Architecture

### 1. Core Logic (React + D3)

The core visualization logic is encapsulated in a reusable React component structure.

- **`TimeSeriesChart`**: The main D3 wrapper. It uses React for DOM rendering structure (SVG container) and D3 for the math/axis generation and path rendering.
- **`App`**: The main application container that handles:
  - Data fetching/parsing.
  - State management (loading, error, data).
  - Layout rendering.

### 2. Development Flow (esbuild)

We use **esbuild** for the development server.

- **CSV Handling**: In dev mode, the app looks for a specific `data.csv` in the public directory or uses a mock loader to simulate the CLI input.
- **Fast Rebuilds**: Changes to React components or D3 logic trigger fast rebuilds.

### 3. CLI Utility (`plot-csv`)

The "single file utility" requirement is met by a build script that produces a standalone HTML file.

- **Input**: A path to a `.csv` file.
- **Process**:
  1.  Reads the CSV file content.
  2.  Reads the built application assets (JS/CSS).
  3.  Inlines the CSV data into a global window variable (e.g., `window.__INITIAL_DATA__`).
  4.  Inlines the JS and CSS into a single HTML template.
- **Output**: A single `.html` file that can be opened in any browser to view the interactive plot, identical to the dev server output.

## Tech Stack

- **Runtime**: Node.js
- **Frontend**: React, ReactDOM
- **Visualization**: D3.js
- **Tooling**: esbuild, TypeScript
- **Styling**: Vanilla CSS (Modern CSS variables and Flexbox/Grid)

## Data Format

The input CSV should have the following structure:

```csv
date,value
2023-01-01,100
2023-01-02,105.5
...
```

- `date`: ISO 8601 string or standard date format.
- `value`: Numerical value.

## Usage

### Prerequisites

- Node.js (v16+)

### Installation

```bash
npm install
```

### Development

Start the dev server:

```bash
npm run dev
```

Place your test data at `public/data.csv` or modify the dev loader to point to your desired file.

### CLI Usage

Generate a report from a CSV file:

```bash
# Generate report.html
node scripts/plot-csv.js input.csv > report.html

# Open it
open report.html
```

### Testing

Run the test suite using the native Node.js test runner:

```bash
npm test
```

### Linting

Run ESLint to check for code style and quality issues:

```bash
npm run lint
```

### Type Checking

Run TypeScript compiler to check for type errors without emitting files:

```bash
npm run type-check
```
