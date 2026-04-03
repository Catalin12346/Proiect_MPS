/**
 * Binary Utilities Module
 * Provides core binary file manipulation functions for ECU tuning.
 */
const BinaryUtils = (() => {
    'use strict';

    /**
     * Read a binary file and return its content as a Uint8Array.
     * @param {File} file - The file to read.
     * @returns {Promise<Uint8Array>} The file content.
     */
    function readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(new Uint8Array(reader.result));
            reader.onerror = () => reject(new Error('Eroare la citirea fișierului.'));
            reader.readAsArrayBuffer(file);
        });
    }

    /**
     * Save a Uint8Array as a downloadable binary file.
     * @param {Uint8Array} data - The binary data to save.
     * @param {string} filename - The download filename.
     */
    function saveFile(data, filename) {
        const blob = new Blob([data], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * Convert a byte value (0-255) to a two-character hex string.
     * @param {number} byte - The byte value.
     * @returns {string} Two-character uppercase hex string.
     */
    function byteToHex(byte) {
        return byte.toString(16).toUpperCase().padStart(2, '0');
    }

    /**
     * Convert a hex string to a byte value.
     * @param {string} hex - A two-character hex string.
     * @returns {number} The byte value (0-255), or NaN if invalid.
     */
    function hexToByte(hex) {
        const val = parseInt(hex, 16);
        if (isNaN(val) || val < 0 || val > 255) return NaN;
        return val;
    }

    /**
     * Convert a Uint8Array region to a hex dump string.
     * @param {Uint8Array} data - The source data.
     * @param {number} offset - Start offset.
     * @param {number} length - Number of bytes.
     * @returns {string} Formatted hex dump.
     */
    function hexDump(data, offset, length) {
        const lines = [];
        const end = Math.min(offset + length, data.length);
        for (let i = offset; i < end; i += 16) {
            const addr = i.toString(16).toUpperCase().padStart(8, '0');
            const hexParts = [];
            let ascii = '';
            for (let j = 0; j < 16; j++) {
                if (i + j < end) {
                    hexParts.push(byteToHex(data[i + j]));
                    const ch = data[i + j];
                    ascii += (ch >= 32 && ch <= 126) ? String.fromCharCode(ch) : '.';
                } else {
                    hexParts.push('  ');
                    ascii += ' ';
                }
            }
            const hexStr = hexParts.slice(0, 8).join(' ') + '  ' + hexParts.slice(8).join(' ');
            lines.push(`${addr}  ${hexStr}  |${ascii}|`);
        }
        return lines.join('\n');
    }

    /**
     * Search for a hex pattern in binary data.
     * @param {Uint8Array} data - The data to search.
     * @param {string} hexPattern - Hex string pattern (e.g., "FF00AB").
     * @param {number} startOffset - Where to start searching.
     * @returns {number[]} Array of offsets where the pattern was found.
     */
    function searchHexPattern(data, hexPattern, startOffset = 0) {
        const cleanHex = hexPattern.replace(/\s+/g, '');
        if (cleanHex.length % 2 !== 0 || !/^[0-9A-Fa-f]+$/.test(cleanHex)) {
            return [];
        }
        const pattern = [];
        for (let i = 0; i < cleanHex.length; i += 2) {
            pattern.push(parseInt(cleanHex.substring(i, i + 2), 16));
        }
        const results = [];
        for (let i = startOffset; i <= data.length - pattern.length; i++) {
            let found = true;
            for (let j = 0; j < pattern.length; j++) {
                if (data[i + j] !== pattern[j]) {
                    found = false;
                    break;
                }
            }
            if (found) results.push(i);
        }
        return results;
    }

    /**
     * Replace a hex pattern in binary data.
     * @param {Uint8Array} data - The data to modify (modified in-place).
     * @param {number} offset - The offset at which to write.
     * @param {string} hexValues - Hex string of replacement bytes (e.g., "FF00AB").
     * @returns {boolean} True if replacement was successful.
     */
    function replaceAtOffset(data, offset, hexValues) {
        const cleanHex = hexValues.replace(/\s+/g, '');
        if (cleanHex.length % 2 !== 0 || !/^[0-9A-Fa-f]+$/.test(cleanHex)) {
            return false;
        }
        const bytes = [];
        for (let i = 0; i < cleanHex.length; i += 2) {
            bytes.push(parseInt(cleanHex.substring(i, i + 2), 16));
        }
        if (offset + bytes.length > data.length) return false;
        for (let i = 0; i < bytes.length; i++) {
            data[offset + i] = bytes[i];
        }
        return true;
    }

    /**
     * Read a 16-bit unsigned integer (little-endian) from data.
     * @param {Uint8Array} data
     * @param {number} offset
     * @returns {number}
     */
    function readUint16LE(data, offset) {
        return data[offset] | (data[offset + 1] << 8);
    }

    /**
     * Read a 16-bit unsigned integer (big-endian) from data.
     * @param {Uint8Array} data
     * @param {number} offset
     * @returns {number}
     */
    function readUint16BE(data, offset) {
        return (data[offset] << 8) | data[offset + 1];
    }

    /**
     * Write a 16-bit unsigned integer (little-endian) to data.
     * @param {Uint8Array} data
     * @param {number} offset
     * @param {number} value
     */
    function writeUint16LE(data, offset, value) {
        data[offset] = value & 0xFF;
        data[offset + 1] = (value >> 8) & 0xFF;
    }

    /**
     * Write a 16-bit unsigned integer (big-endian) to data.
     * @param {Uint8Array} data
     * @param {number} offset
     * @param {number} value
     */
    function writeUint16BE(data, offset, value) {
        data[offset] = (value >> 8) & 0xFF;
        data[offset + 1] = value & 0xFF;
    }

    /**
     * Extract a region of data as a new Uint8Array.
     * @param {Uint8Array} data
     * @param {number} offset
     * @param {number} length
     * @returns {Uint8Array}
     */
    function extractRegion(data, offset, length) {
        return data.slice(offset, offset + length);
    }

    /**
     * Format a file size in human-readable form.
     * @param {number} bytes
     * @returns {string}
     */
    function formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1048576) return (bytes / 1024).toFixed(2) + ' KB';
        return (bytes / 1048576).toFixed(2) + ' MB';
    }

    return {
        readFile,
        saveFile,
        byteToHex,
        hexToByte,
        hexDump,
        searchHexPattern,
        replaceAtOffset,
        readUint16LE,
        readUint16BE,
        writeUint16LE,
        writeUint16BE,
        extractRegion,
        formatFileSize
    };
})();
