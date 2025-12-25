# Time series plotting app and CLI tool

Tool + app for visualizing time series data.

[![Screenshot of time series plot](https://aaronstacy.com/plottimeseries/img/plottimeseries-screen-shot.png)](https://aaronstacy.com/plottimeseries)

## Usage

### App

Visit https://aaronstacy.com/plottimeseries

You can pass a CSV file as a query parameter like [this](https://aaronstacy.com/plottimeseries?csv=date%2Cpct_change%2Camount%2Ccategory%0A2023-01-01%2C0.15%2C45.5%2CHigh%0A2023-01-02%2C-0.8%2C-99.25%2CLow%0A2023-01-03%2C0.02%2C0.75%2CMedium%0A2023-01-04%2C1.0%2C100%2CHigh%0A2023-01-05%2C-0.33%2C-5.5%2CLow%0A2023-01-06%2C0.5%2C0.05%2CMedium).

I plan to also add the ability to open a CSV file from the website.

### CLI

1. Clone this repository
2. Install dependencies: `npm install`
3. Build the assets: `npm run build path/to/your/file.csv > index.html`
4. Open `index.html` in a web browser

## Developing

Do whatever is in `.github/workflows/ci.yml`, but roughly:

1. `npm install`
2. `npm run dev`
3. Open `http://localhost:3000` in a web browser

To validate changes:

1. `npm run lint`
2. `npm run typecheck`
3. `npm run test`
4. `mkdir -p pages-public && npm run build public/data.csv > pages-public/index.html`

## Background

This is an attempt at using AI, generated with Google's Antigravity.

DESIGN.md was mostly generated from an initial simple prompt:

> Create a README.md to design a node.js project that plots time series data from csv input. Use React for all UI, d3.js for all visualizations. Provide a hot-reloading development server that plots csv data from a local development directory in this repository, and provide a single file javascript utility that can be run via node.js that can take a csv file as input and generate the same output as the development server.

The UI was remarkably easy to generate. The logic to make it work either as a CLI or as a web site, and then to get tests and deployment to work on every change was surprisingly manual.