if (!document.getElementById('maidenhead-css')) {
  const style = document.createElement('style');
  style.id = 'maidenhead-css';
  style.textContent = `
    .maidenhead-label {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
      text-align: center;
      font-weight: 900;
    }
  `;
  document.head.appendChild(style);
}

L.Maidenhead = L.LayerGroup.extend({

    options: {
        // Line and label color
        color: 'rgba(255, 0, 0, 0.4)',
        // Redraw on move or moveend
        redraw: 'move',
        // Grids to highlight
        highlights: [],
        // Title sizes by zoom level
        title_size: [0,10,12,16,20,26,12,16,24,36,10,14,20,36,60,12,20,36,7,12,24]
    },

    initialize: function (options) {
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

        var d3 = new Array(20,10,10,10,10,10,1 ,1 ,1 ,1 ,1/24,1/24,1/24,1/24,1/24,1/240,1/240,1/240,1/240/24,1/240/24,1/240/24 );

        var bounds = this._map.getBounds();
        var zoom = this._map.getZoom();

        var unit = d3[Math.round(zoom)];

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
    // Check for highlight rule at hierarchical levels of grid names
    let rule = this._highlightIndex.get(gridName.length)?.get(gridName);
    if (rule) return rule;

    // try shorter prefixes
    for (let len = gridName.length - 1; len > 0; len--) {
        rule = this._highlightIndex.get(len)?.get(gridName.slice(0, len));
        if (rule) return rule;
    }

    return null;
    },

    _getLabel: function (lon, lat) {
        var zoom = this._map.getZoom();
        var title_size = this.options.title_size;
        var size = title_size[Math.round(zoom)] + 'px';

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
        var d4 = new Array(0,1,1,1,1,1,2,2,2,2,3,3,3,3,3,4,4,4,5,5,5);

        var locator = "";
        var x = lon;
        var y = lat;

        var precision = d4[Math.round(this._map.getZoom())];

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
