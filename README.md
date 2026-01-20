# leaflet-maidenhead

> A Leaflet plugin for displaying and highlighting Maidenhead grid squares

This project is a fork of [Leaflet.Maidenhead](https://ha8tks.github.io/Leaflet.Maidenhead/) by HA8TKS that adds the ability to highlight specific grid squares.

## Usage

Include the script:

```html
<script src="https://unpkg.com/@saundersresearch/leaflet-maidenhead@latest/dist/leaflet-maidenhead.js"></script>
```

Then add the Maidenhead layer to your Leaflet map:

```javascript
L.maidenhead({
    color : 'rgba(255, 0, 0, 0.4)', 
    highlights: [
        { grids: ["JN82", "JO"], color: 'rgba(0, 255, 0, 0.4)', fillOpacity: 0.4 },
        { grids: ["KN16"], color: 'rgba(0, 0, 255, 0.4)', fillOpacity: 0.8 }
    ]
}).addTo(map);
```

See the example in `examples/` for a complete working demo.

### Options
- **redraw**: Redraw the grid on `'move'` or `'moveend'`. Default is `'move'`.
- **color**: The color of the lines and labels. Default is `rgba(255, 0, 0, 0.4)` 
- **highlights**: An array of objects defining grid squares to highlight. Each object can have:
  - **grids**: An array of Maidenhead grid squares to highlight (e.g., `["JN82", "JO"]`). They will be highlighted at the largest level matching the prefix and all sub-levels.
  - **color**: The color for the highlighted squares.
  - **fillOpacity**: The fill opacity for the highlighted squares.

## Installation for development

For local development, clone the repository and install the dependencies with `npm install`. Then, build and run the example in `examples/` with `npm run dev`.

To build for production, use `npm run build`. The output will be at `dist/leaflet-maidenhead.js`.

## License

This project is released under the [MIT license](https://github.com/saundersresearch/leaflet-maidenhead/blob/main/LICENSE).

## See also
- [Leaflet.Maidenhead by HA8TKS](https://ha8tks.github.io/Leaflet.Maidenhead/) is the original project this is forked from.
- [Leaflet.Maidenhead by IvanSanchez](https://gitlab.com/IvanSanchez/leaflet.maidenhead) is an official Leaflet plugin for Maidenhead grids.