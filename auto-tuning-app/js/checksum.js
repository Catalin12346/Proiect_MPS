/**
 * Checksum Module
 * Provides checksum calculation algorithms commonly used in ECU binary files.
 */
const Checksum = (() => {
    'use strict';

    /**
     * Calculate a simple 8-bit sum checksum.
     * @param {Uint8Array} data
     * @param {number} [start=0]
     * @param {number} [end=data.length]
     * @returns {number} Checksum value (0-255).
     */
    function sum8(data, start = 0, end = data.length) {
        let sum = 0;
        for (let i = start; i < end; i++) {
            sum = (sum + data[i]) & 0xFF;
        }
        return sum;
    }

    /**
     * Calculate a 16-bit sum checksum.
     * @param {Uint8Array} data
     * @param {number} [start=0]
     * @param {number} [end=data.length]
     * @returns {number} Checksum value (0-65535).
     */
    function sum16(data, start = 0, end = data.length) {
        let sum = 0;
        for (let i = start; i < end; i++) {
            sum = (sum + data[i]) & 0xFFFF;
        }
        return sum;
    }

    /**
     * Calculate a 32-bit sum checksum.
     * @param {Uint8Array} data
     * @param {number} [start=0]
     * @param {number} [end=data.length]
     * @returns {number} Checksum value (32-bit unsigned).
     */
    function sum32(data, start = 0, end = data.length) {
        let sum = 0;
        for (let i = start; i < end; i++) {
            sum = (sum + data[i]) >>> 0;
        }
        return sum;
    }

    /**
     * CRC-16 (CCITT) lookup table.
     */
    const crc16Table = (() => {
        const table = new Uint16Array(256);
        for (let i = 0; i < 256; i++) {
            let crc = i << 8;
            for (let j = 0; j < 8; j++) {
                crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1);
                crc &= 0xFFFF;
            }
            table[i] = crc;
        }
        return table;
    })();

    /**
     * Calculate CRC-16 CCITT.
     * @param {Uint8Array} data
     * @param {number} [start=0]
     * @param {number} [end=data.length]
     * @param {number} [init=0xFFFF]
     * @returns {number}
     */
    function crc16(data, start = 0, end = data.length, init = 0xFFFF) {
        let crc = init;
        for (let i = start; i < end; i++) {
            crc = ((crc << 8) ^ crc16Table[((crc >> 8) ^ data[i]) & 0xFF]) & 0xFFFF;
        }
        return crc;
    }

    /**
     * CRC-32 lookup table.
     */
    const crc32Table = (() => {
        const table = new Uint32Array(256);
        for (let i = 0; i < 256; i++) {
            let crc = i;
            for (let j = 0; j < 8; j++) {
                crc = (crc & 1) ? ((crc >>> 1) ^ 0xEDB88320) : (crc >>> 1);
            }
            table[i] = crc >>> 0;
        }
        return table;
    })();

    /**
     * Calculate CRC-32.
     * @param {Uint8Array} data
     * @param {number} [start=0]
     * @param {number} [end=data.length]
     * @returns {number}
     */
    function crc32(data, start = 0, end = data.length) {
        let crc = 0xFFFFFFFF;
        for (let i = start; i < end; i++) {
            crc = (crc32Table[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8)) >>> 0;
        }
        return (crc ^ 0xFFFFFFFF) >>> 0;
    }

    /**
     * Calculate all available checksums for a data region.
     * @param {Uint8Array} data
     * @param {number} [start=0]
     * @param {number} [end=data.length]
     * @returns {object} Object with all checksum values.
     */
    function calculateAll(data, start = 0, end = data.length) {
        return {
            sum8: sum8(data, start, end),
            sum16: sum16(data, start, end),
            sum32: sum32(data, start, end),
            crc16: crc16(data, start, end),
            crc32: crc32(data, start, end)
        };
    }

    /**
     * Format checksum results as an HTML table.
     * @param {object} checksums - Result from calculateAll().
     * @returns {string} HTML string.
     */
    function formatResults(checksums) {
        return `<table class="checksum-table">
            <thead><tr><th>Algoritm</th><th>Valoare (Hex)</th><th>Valoare (Dec)</th></tr></thead>
            <tbody>
                <tr><td>SUM-8</td><td>0x${checksums.sum8.toString(16).toUpperCase().padStart(2, '0')}</td><td>${checksums.sum8}</td></tr>
                <tr><td>SUM-16</td><td>0x${checksums.sum16.toString(16).toUpperCase().padStart(4, '0')}</td><td>${checksums.sum16}</td></tr>
                <tr><td>SUM-32</td><td>0x${checksums.sum32.toString(16).toUpperCase().padStart(8, '0')}</td><td>${checksums.sum32}</td></tr>
                <tr><td>CRC-16 (CCITT)</td><td>0x${checksums.crc16.toString(16).toUpperCase().padStart(4, '0')}</td><td>${checksums.crc16}</td></tr>
                <tr><td>CRC-32</td><td>0x${checksums.crc32.toString(16).toUpperCase().padStart(8, '0')}</td><td>${checksums.crc32}</td></tr>
            </tbody>
        </table>`;
    }

    /**
     * Render the checksum tool UI.
     * @param {Uint8Array} data
     */
    function renderTool(data) {
        const container = document.getElementById('checksum-content');
        if (!container) return;

        if (!data) {
            container.innerHTML = '<p class="placeholder">Încărcați un fișier binar pentru a calcula checksum-uri.</p>';
            return;
        }

        const checksums = calculateAll(data);

        let html = '<h3>Checksum Fișier Complet</h3>';
        html += `<p>Regiunea: 0x00000000 - 0x${(data.length - 1).toString(16).toUpperCase().padStart(8, '0')} (${BinaryUtils.formatFileSize(data.length)})</p>`;
        html += formatResults(checksums);

        html += '<h3>Checksum Regiune Personalizată</h3>';
        html += '<div class="checksum-custom">';
        html += '<label>Offset start (hex): <input type="text" id="checksum-start" value="0" placeholder="0"></label>';
        html += '<label>Offset final (hex): <input type="text" id="checksum-end" value="' +
            (data.length - 1).toString(16).toUpperCase() + '" placeholder="' +
            (data.length - 1).toString(16).toUpperCase() + '"></label>';
        html += '<button id="checksum-calc-btn" class="btn">Calculează</button>';
        html += '</div>';
        html += '<div id="checksum-custom-result"></div>';

        container.innerHTML = html;

        document.getElementById('checksum-calc-btn').addEventListener('click', () => {
            const startHex = document.getElementById('checksum-start').value.trim();
            const endHex = document.getElementById('checksum-end').value.trim();
            const startVal = parseInt(startHex, 16);
            const endVal = parseInt(endHex, 16);

            if (isNaN(startVal) || isNaN(endVal) || startVal < 0 || endVal >= data.length || startVal > endVal) {
                document.getElementById('checksum-custom-result').innerHTML =
                    '<p class="error">Offset-uri invalide!</p>';
                return;
            }

            const regionChecksums = calculateAll(data, startVal, endVal + 1);
            document.getElementById('checksum-custom-result').innerHTML =
                `<p>Regiunea: 0x${startVal.toString(16).toUpperCase().padStart(8, '0')} - 0x${endVal.toString(16).toUpperCase().padStart(8, '0')}</p>` +
                formatResults(regionChecksums);
        });
    }

    return {
        sum8,
        sum16,
        sum32,
        crc16,
        crc32,
        calculateAll,
        formatResults,
        renderTool
    };
})();
