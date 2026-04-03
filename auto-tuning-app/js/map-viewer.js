/**
 * Map Viewer Module
 * Visualizes ECU data maps (fuel maps, ignition maps, etc.) as 2D color tables.
 */
const MapViewer = (() => {
    'use strict';

    let mapConfig = null;
    let mapData = null;

    /**
     * Create a map from binary data region.
     * @param {Uint8Array} data - Source binary data.
     * @param {object} config - Map configuration.
     * @param {number} config.offset - Start offset in the binary data.
     * @param {number} config.rows - Number of rows.
     * @param {number} config.cols - Number of columns.
     * @param {string} config.name - Map name.
     * @param {string} [config.dataType='uint8'] - Data type: 'uint8' or 'uint16le' or 'uint16be'.
     * @param {number} [config.multiplier=1] - Value multiplier for display.
     * @param {number} [config.addend=0] - Value addend for display.
     * @param {string} [config.unit=''] - Unit string for display.
     */
    function loadMap(data, config) {
        if (!data || !config) return;

        mapConfig = {
            offset: config.offset || 0,
            rows: config.rows || 16,
            cols: config.cols || 16,
            name: config.name || 'Hartă ECU',
            dataType: config.dataType || 'uint8',
            multiplier: config.multiplier || 1,
            addend: config.addend || 0,
            unit: config.unit || ''
        };

        const bytesPerCell = mapConfig.dataType === 'uint8' ? 1 : 2;
        const totalBytes = mapConfig.rows * mapConfig.cols * bytesPerCell;

        if (mapConfig.offset + totalBytes > data.length) {
            alert('Regiunea selectată depășește dimensiunea fișierului.');
            return;
        }

        mapData = [];
        for (let r = 0; r < mapConfig.rows; r++) {
            const row = [];
            for (let c = 0; c < mapConfig.cols; c++) {
                const cellOffset = mapConfig.offset + (r * mapConfig.cols + c) * bytesPerCell;
                let rawValue;
                if (mapConfig.dataType === 'uint16le') {
                    rawValue = BinaryUtils.readUint16LE(data, cellOffset);
                } else if (mapConfig.dataType === 'uint16be') {
                    rawValue = BinaryUtils.readUint16BE(data, cellOffset);
                } else {
                    rawValue = data[cellOffset];
                }
                row.push(rawValue);
            }
            mapData.push(row);
        }

        render();
    }

    /**
     * Get the display value for a raw cell value.
     * @param {number} rawValue
     * @returns {number}
     */
    function displayValue(rawValue) {
        return rawValue * mapConfig.multiplier + mapConfig.addend;
    }

    /**
     * Get a color for a value based on min/max range.
     * Uses a blue (low) → green (mid) → red (high) gradient.
     * @param {number} value - The raw value.
     * @param {number} min - Minimum value in the dataset.
     * @param {number} max - Maximum value in the dataset.
     * @returns {string} CSS color string.
     */
    function valueToColor(value, min, max) {
        if (max === min) return 'rgb(0, 128, 255)';
        const ratio = (value - min) / (max - min);

        let r, g, b;
        if (ratio < 0.5) {
            const t = ratio * 2;
            r = 0;
            g = Math.round(255 * t);
            b = Math.round(255 * (1 - t));
        } else {
            const t = (ratio - 0.5) * 2;
            r = Math.round(255 * t);
            g = Math.round(255 * (1 - t));
            b = 0;
        }
        return `rgb(${r}, ${g}, ${b})`;
    }

    /**
     * Get text color (black or white) for best contrast.
     * @param {number} r
     * @param {number} g
     * @param {number} b
     * @returns {string}
     */
    function contrastColor(r, g, b) {
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        return luminance > 0.5 ? '#000' : '#fff';
    }

    /**
     * Escape HTML special characters to prevent XSS.
     * @param {string} text
     * @returns {string}
     */
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Render the map as a color-coded table.
     */
    function render() {
        const container = document.getElementById('map-content');
        if (!container || !mapData || !mapConfig) {
            if (container) container.innerHTML = '<p class="placeholder">Configurați și încărcați o hartă pentru vizualizare.</p>';
            return;
        }

        let min = Infinity, max = -Infinity;
        for (const row of mapData) {
            for (const val of row) {
                if (val < min) min = val;
                if (val > max) max = val;
            }
        }

        const safeName = escapeHtml(mapConfig.name);
        const safeUnit = escapeHtml(mapConfig.unit);
        const safeDataType = escapeHtml(mapConfig.dataType);

        let html = `<h3>${safeName}</h3>`;
        html += `<div class="map-info">`;
        html += `<span>Offset: 0x${mapConfig.offset.toString(16).toUpperCase()}</span>`;
        html += `<span>Dimensiune: ${mapConfig.rows}×${mapConfig.cols}</span>`;
        html += `<span>Tip date: ${safeDataType}</span>`;
        html += `<span>Min: ${displayValue(min).toFixed(2)}${safeUnit} | Max: ${displayValue(max).toFixed(2)}${safeUnit}</span>`;
        html += `</div>`;

        html += '<div class="map-table-wrapper"><table class="map-table"><thead><tr><th></th>';
        for (let c = 0; c < mapConfig.cols; c++) {
            html += `<th>${c}</th>`;
        }
        html += '</tr></thead><tbody>';

        for (let r = 0; r < mapConfig.rows; r++) {
            html += `<tr><th>${r}</th>`;
            for (let c = 0; c < mapConfig.cols; c++) {
                const rawVal = mapData[r][c];
                const dispVal = displayValue(rawVal);
                const color = valueToColor(rawVal, min, max);
                const rgb = color.match(/\d+/g).map(Number);
                const textColor = contrastColor(rgb[0], rgb[1], rgb[2]);
                const byteOffset = mapConfig.offset +
                    (r * mapConfig.cols + c) * (mapConfig.dataType === 'uint8' ? 1 : 2);

                html += `<td class="map-cell" style="background-color:${color};color:${textColor}" ` +
                    `data-row="${r}" data-col="${c}" data-offset="${byteOffset}" ` +
                    `title="[${r},${c}] Offset: 0x${byteOffset.toString(16).toUpperCase()}\nRaw: ${rawVal}\nValoare: ${dispVal.toFixed(2)}${safeUnit}">` +
                    `${dispVal.toFixed(mapConfig.multiplier === 1 && mapConfig.addend === 0 ? 0 : 2)}</td>`;
            }
            html += '</tr>';
        }
        html += '</tbody></table></div>';

        html += '<div class="map-legend"><div class="legend-bar"></div>';
        html += `<div class="legend-labels"><span>${displayValue(min).toFixed(2)}${safeUnit}</span>`;
        html += `<span>${displayValue((min + max) / 2).toFixed(2)}${safeUnit}</span>`;
        html += `<span>${displayValue(max).toFixed(2)}${safeUnit}</span></div></div>`;

        container.innerHTML = html;

        container.querySelectorAll('.map-cell').forEach(cell => {
            cell.addEventListener('click', () => {
                const offset = parseInt(cell.dataset.offset, 10);
                if (typeof App !== 'undefined' && App.switchToHexEditor) {
                    App.switchToHexEditor(offset);
                }
            });
        });
    }

    /**
     * Get the current map configuration.
     * @returns {object|null}
     */
    function getConfig() {
        return mapConfig;
    }

    /**
     * Get the current map data.
     * @returns {Array<Array<number>>|null}
     */
    function getMapData() {
        return mapData;
    }

    return {
        loadMap,
        render,
        getConfig,
        getMapData
    };
})();
