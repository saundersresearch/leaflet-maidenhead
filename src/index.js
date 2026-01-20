L.Maidenhead = L.LayerGroup.extend({

    options: {
        // Line and label color
        color: 'rgba(255, 0, 0, 0.4)',
        // Redraw on move or moveend
        redraw: 'move',
        // Grids to highlight
        highlights: [],
    },

    initialize: function (options) {
        // Add styling
        if (!document.getElementById('maidenhead-css')) {
            const style = document.createElement('style');
            style.id = 'maidenhead-css';
            style.textContent = `
                .leaflet-marker-icon .maidenhead-label,
                .maidenhead-label {
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                width: 100% !important;
                height: 100% !important;
                text-align: center !important;
                font-weight: 900 !important;
                }
            `;
            document.head.appendChild(style);
            }

        L.LayerGroup.prototype.initialize.call(this);
        L.Util.setOptions(this, options);

        // Add highlight index by length for efficient lookup
        this._highlightIndex = new Map();
        for (const rule of this.options.highlights || []) {
            for (const grid of rule.grids) {
                const len = grid.length;

                if (!this._highlightIndex.has(len)) {
                    this._highlightIndex.set(len, new Map());
                }

                this._highlightIndex.get(len).set(grid, rule);
            }
        }
    },

    onAdd: function (map) {
        this._map = map;
        var grid = this.redraw();

        this._map.on('viewreset ' + this.options.redraw, function () {
            grid.redraw();
        });

        this.eachLayer(map.addLayer, map);
    },

    onRemove: function (map) {
        // remove layer listeners and elements
        map.off('viewreset ' + this.options.redraw, this.map);
        this.eachLayer(this.removeLayer, this);
    },

    redraw: function () {
        var bounds = this._map.getBounds();
        var zoom = this._map.getZoom();

        var level = this._getLevelForZoom(zoom);
        var unit = this._getUnitForLevel(level);

        var w = bounds.getWest();
        var e = bounds.getEast();
        var n = bounds.getNorth();
        var s = bounds.getSouth();

        if (n > 85) n = 85;
        if (s < -85) s = -85;

        var left = Math.floor(w/(unit*2))*(unit*2);
        var right = Math.ceil(e/(unit*2))*(unit*2);
        var top = Math.ceil(n/unit)*unit;
        var bottom = Math.floor(s/unit)*unit;

        this.eachLayer(this.removeLayer, this);

        for (var lon = left; lon < right; lon += (unit * 2)) {
            for (var lat = bottom; lat < top; lat += unit) {

                var rectBounds = [[lat, lon], [lat + unit, lon + (unit * 2)]];
                this.addLayer(L.rectangle(rectBounds, {color: this.options.color, weight: 1, fill: false, interactive: false}));
                
                var gridName = this._getLocator(lon, lat);
                var highlight = this._getHighlight(gridName);
                if (highlight) {
                    this.addLayer(L.rectangle(rectBounds, {
                        color: highlight.color || this.options.color,
                        weight: 1,
                        fillOpacity: highlight.fillOpacity || 0.4,
                        fill: true,
                        interactive: false
                    }));
                }

                this.addLayer(
                    this._getLabel(
                        lon + unit,
                        lat + (unit / 2),
                    )
                );
            }
        }

        return this;
    },

    _getHighlight: function (gridName) {
        const zoom = this._map.getZoom();
        const level = this._getLevelForZoom(zoom);

        // locator length for the currently drawn grid
        const levelLengths = [2, 4, 6, 8, 10];
        const targetLen = levelLengths[level] || gridName.length;

        // normalize drawn grid to current level
        const drawn = gridName.slice(0, targetLen);

        // draw if any children or parent are highlighted
        for (const rules of this._highlightIndex.values()) {
            for (const [highlightGrid, rule] of rules.entries()) {
                const len = Math.min(highlightGrid.length, targetLen);

                if (
                    drawn.slice(0, len) === highlightGrid.slice(0, len)
                ) {
                    return rule;
                }
            }
        }

        return null;
    },


    _getLevelForZoom: function (zoom) {
        if (zoom <= 5)  return 0; // Field
        if (zoom <= 9.5)  return 1; // Square
        if (zoom <= 14) return 2; // Subsquare
        if (zoom <= 18) return 3; // Extended
        return 4;                // Extended+
    },

    _getUnitForLevel: function (level) {
        return [
            10,
            1,
            1 / 24,
            1 / 240,
            1 / 240 / 24
        ][level];
    },

    _getCellPixelSize: function (unit) {
        const p1 = this._map.latLngToContainerPoint([0, 0]);
        const p2 = this._map.latLngToContainerPoint([0, unit * 2]);

        return Math.abs(p2.x - p1.x);
    },

    _getFontSize: function (unit) {
        // infer grid depth from unit size
        var level = this._getLevelForZoom(this._map.getZoom());

        // bounds per level
        var bounds = {
            0: { min: 28, max: 42 },    
            1: { min: 18, max: 28 },
            2: { min: 12, max: 20 },
            3: { min: 8, max: 12 },
            4: { min: 8, max: 12 }
        }[level];

        var MIN = bounds.min;
        var MAX = bounds.max;

        // approximate pixel width of one grid cell
        var cellPx = this._map.latLngToContainerPoint([0, unit * 2]).x -
                    this._map.latLngToContainerPoint([0, 0]).x;

        var target = cellPx * 0.2;

        // first run
        if (this._labelSize === null) {
            this._labelSize = Math.max(MIN, Math.min(target, MAX));
        }

        // hysteresis: only update if out of bounds
        if (target < MIN) this._labelSize = MIN;
        if (target > MAX) this._labelSize = MAX;

        return Math.round(this._labelSize);
    },

    _getLabel: function (lon, lat) {
        var zoom = this._map.getZoom();
        var level = this._getLevelForZoom(zoom);
        var unit = this._getUnitForLevel(level);
        var size = this._getFontSize(unit) + "px";

        var title = '<span style="cursor: default;"><font style="color:' +
            this.options.color + '; font-size:' + size +
            '; font-weight: 900; ">' + this._getLocator(lon, lat) + '</font></span>';

        var myIcon = L.divIcon({
            className: 'maidenhead-label',
            html: title,
            iconSize: [0, 0],
            iconAnchor: [0, 0]
        });

        var marker = L.marker([lat, lon], { icon: myIcon, clickable: false });

        return marker;
    },

    _getLocator: function (lon, lat) {

        var ydiv_arr = new Array(10, 1, 1/24, 1/240, 1/240/24);
        var d1 = "ABCDEFGHIJKLMNOPQR".split("");
        var d2 = "ABCDEFGHIJKLMNOPQRSTUVWX".split("");

        var locator = "";
        var x = lon;
        var y = lat;

        var precision = this._getLevelForZoom(this._map.getZoom()) + 1;

        while (x < -180) { x += 360; }
        while (x > 180) { x -= 360; }

        x = x + 180;
        y = y + 90;

        locator = locator +
            d1[Math.floor(x / 20)] +
            d1[Math.floor(y / 10)];

        for (var i = 0; i < 4; i++) {
            if (precision > i + 1) {

                var rlon = x % (ydiv_arr[i] * 2);
                var rlat = y % (ydiv_arr[i]);

                if ((i % 2) == 0) {
                    locator += Math.floor(rlon/(ydiv_arr[i+1]*2))
                             + "" +
                             Math.floor(rlat/(ydiv_arr[i+1]));
                } else {
                    locator += d2[Math.floor(rlon/(ydiv_arr[i+1]*2))]
                             + "" +
                             d2[Math.floor(rlat/(ydiv_arr[i+1]))];
                }
            }
        }

        return locator;
    },

});

L.maidenhead = function (options) {
    return new L.Maidenhead(options);
};
