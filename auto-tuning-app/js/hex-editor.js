/**
 * Hex Editor Module
 * Interactive hex editor for viewing and editing binary ECU data.
 */
const HexEditor = (() => {
    'use strict';

    let currentData = null;
    let originalData = null;
    let currentOffset = 0;
    let selectedOffset = -1;
    let bytesPerPage = 512;
    let undoStack = [];
    let redoStack = [];
    const MAX_UNDO = 100;

    /**
     * Initialize the hex editor with binary data.
     * @param {Uint8Array} data
     */
    function init(data) {
        originalData = new Uint8Array(data);
        currentData = new Uint8Array(data);
        currentOffset = 0;
        selectedOffset = -1;
        undoStack = [];
        redoStack = [];
        render();
        updateInfo();
    }

    /**
     * Get the current binary data.
     * @returns {Uint8Array|null}
     */
    function getData() {
        return currentData;
    }

    /**
     * Get the original (unmodified) binary data.
     * @returns {Uint8Array|null}
     */
    function getOriginalData() {
        return originalData;
    }

    /**
     * Check if data has been modified.
     * @returns {boolean}
     */
    function isModified() {
        if (!currentData || !originalData) return false;
        for (let i = 0; i < currentData.length; i++) {
            if (currentData[i] !== originalData[i]) return true;
        }
        return false;
    }

    /**
     * Record an undo entry before making a change.
     * @param {number} offset
     * @param {number} oldValue
     * @param {number} newValue
     */
    function recordUndo(offset, oldValue, newValue) {
        undoStack.push({ offset, oldValue, newValue });
        if (undoStack.length > MAX_UNDO) undoStack.shift();
        redoStack = [];
    }

    /**
     * Undo the last edit.
     */
    function undo() {
        if (undoStack.length === 0) return;
        const entry = undoStack.pop();
        currentData[entry.offset] = entry.oldValue;
        redoStack.push(entry);
        render();
        updateInfo();
    }

    /**
     * Redo the last undone edit.
     */
    function redo() {
        if (redoStack.length === 0) return;
        const entry = redoStack.pop();
        currentData[entry.offset] = entry.newValue;
        undoStack.push(entry);
        render();
        updateInfo();
    }

    /**
     * Modify a single byte.
     * @param {number} offset
     * @param {number} value
     */
    function setByte(offset, value) {
        if (!currentData || offset < 0 || offset >= currentData.length) return;
        if (value < 0 || value > 255) return;
        const oldValue = currentData[offset];
        if (oldValue === value) return;
        recordUndo(offset, oldValue, value);
        currentData[offset] = value;
        render();
        updateInfo();
    }

    /**
     * Navigate to a specific offset.
     * @param {number} offset
     */
    function goToOffset(offset) {
        if (!currentData) return;
        offset = Math.max(0, Math.min(offset, currentData.length - 1));
        currentOffset = Math.floor(offset / 16) * 16;
        selectedOffset = offset;
        render();
    }

    /**
     * Go to the next page.
     */
    function nextPage() {
        if (!currentData) return;
        currentOffset = Math.min(currentOffset + bytesPerPage, currentData.length - bytesPerPage);
        if (currentOffset < 0) currentOffset = 0;
        render();
    }

    /**
     * Go to the previous page.
     */
    function prevPage() {
        if (!currentData) return;
        currentOffset = Math.max(0, currentOffset - bytesPerPage);
        render();
    }

    /**
     * Render the hex editor view.
     */
    function render() {
        const container = document.getElementById('hex-content');
        if (!container || !currentData) return;

        const end = Math.min(currentOffset + bytesPerPage, currentData.length);
        let html = '';

        for (let i = currentOffset; i < end; i += 16) {
            const addr = i.toString(16).toUpperCase().padStart(8, '0');
            let hexCells = '';
            let asciiCells = '';

            for (let j = 0; j < 16; j++) {
                const byteOffset = i + j;
                if (byteOffset < currentData.length) {
                    const byte = currentData[byteOffset];
                    const hexVal = BinaryUtils.byteToHex(byte);
                    const isModified = originalData && byte !== originalData[byteOffset];
                    const isSelected = byteOffset === selectedOffset;
                    let classes = 'hex-byte';
                    if (isModified) classes += ' modified';
                    if (isSelected) classes += ' selected';

                    hexCells += `<span class="${classes}" data-offset="${byteOffset}" title="Offset: 0x${byteOffset.toString(16).toUpperCase()} (${byteOffset})\nValoare: 0x${hexVal} (${byte})">${hexVal}</span>`;

                    const ch = (byte >= 32 && byte <= 126) ? String.fromCharCode(byte) : '.';
                    const safeChar = ch === '<' ? '&lt;' : ch === '>' ? '&gt;' : ch === '&' ? '&amp;' : ch === '"' ? '&quot;' : ch;
                    asciiCells += `<span class="${classes}" data-offset="${byteOffset}">${safeChar}</span>`;
                } else {
                    hexCells += '<span class="hex-byte empty">  </span>';
                    asciiCells += '<span class="hex-byte empty"> </span>';
                }
                if (j === 7) hexCells += '<span class="hex-separator"> </span>';
            }

            html += `<div class="hex-row">` +
                `<span class="hex-addr">${addr}</span>` +
                `<span class="hex-bytes">${hexCells}</span>` +
                `<span class="hex-ascii">${asciiCells}</span>` +
                `</div>`;
        }

        container.innerHTML = html;
        attachByteClickHandlers();
        updateNavigation();
    }

    /**
     * Attach click handlers to hex byte elements.
     */
    function attachByteClickHandlers() {
        document.querySelectorAll('#hex-content .hex-byte:not(.empty)').forEach(el => {
            el.addEventListener('click', () => {
                const offset = parseInt(el.dataset.offset, 10);
                selectedOffset = offset;
                showEditDialog(offset);
                render();
            });
        });
    }

    /**
     * Show a dialog to edit a byte at the given offset.
     * @param {number} offset
     */
    function showEditDialog(offset) {
        const currentVal = BinaryUtils.byteToHex(currentData[offset]);
        const editPanel = document.getElementById('edit-panel');
        if (!editPanel) return;

        document.getElementById('edit-offset').textContent =
            `0x${offset.toString(16).toUpperCase()} (${offset})`;
        document.getElementById('edit-current-value').textContent =
            `0x${currentVal} (${currentData[offset]})`;

        const input = document.getElementById('edit-new-value');
        input.value = currentVal;
        input.focus();
        input.select();

        editPanel.style.display = 'block';
    }

    /**
     * Apply the byte edit from the edit panel.
     */
    function applyEdit() {
        if (selectedOffset < 0) return;
        const input = document.getElementById('edit-new-value');
        const newVal = BinaryUtils.hexToByte(input.value.trim());
        if (isNaN(newVal)) {
            alert('Valoare hex invalidă! Introduceți o valoare între 00 și FF.');
            return;
        }
        setByte(selectedOffset, newVal);
        document.getElementById('edit-panel').style.display = 'none';
    }

    /**
     * Cancel the byte edit.
     */
    function cancelEdit() {
        document.getElementById('edit-panel').style.display = 'none';
    }

    /**
     * Update the file info display.
     */
    function updateInfo() {
        const infoEl = document.getElementById('hex-info');
        if (!infoEl || !currentData) return;

        const modified = isModified();
        let changedCount = 0;
        if (originalData) {
            for (let i = 0; i < currentData.length; i++) {
                if (currentData[i] !== originalData[i]) changedCount++;
            }
        }

        infoEl.innerHTML =
            `<span>Dimensiune: ${BinaryUtils.formatFileSize(currentData.length)}</span>` +
            `<span>Bytes modificați: <strong class="${changedCount > 0 ? 'text-warning' : ''}">${changedCount}</strong></span>` +
            `<span>Undo: ${undoStack.length} | Redo: ${redoStack.length}</span>`;
    }

    /**
     * Update navigation buttons state.
     */
    function updateNavigation() {
        const prevBtn = document.getElementById('hex-prev');
        const nextBtn = document.getElementById('hex-next');
        if (prevBtn) prevBtn.disabled = currentOffset === 0;
        if (nextBtn) nextBtn.disabled = !currentData || currentOffset + bytesPerPage >= currentData.length;

        const pageInfo = document.getElementById('hex-page-info');
        if (pageInfo && currentData) {
            const totalPages = Math.ceil(currentData.length / bytesPerPage);
            const currentPage = Math.floor(currentOffset / bytesPerPage) + 1;
            pageInfo.textContent = `Pagina ${currentPage} / ${totalPages}`;
        }
    }

    /**
     * Get the count of modified bytes.
     * @returns {number}
     */
    function getModifiedCount() {
        if (!currentData || !originalData) return 0;
        let count = 0;
        for (let i = 0; i < currentData.length; i++) {
            if (currentData[i] !== originalData[i]) count++;
        }
        return count;
    }

    /**
     * Get list of modified offsets and values.
     * @returns {Array<{offset: number, original: number, current: number}>}
     */
    function getModifications() {
        const mods = [];
        if (!currentData || !originalData) return mods;
        for (let i = 0; i < currentData.length; i++) {
            if (currentData[i] !== originalData[i]) {
                mods.push({
                    offset: i,
                    original: originalData[i],
                    current: currentData[i]
                });
            }
        }
        return mods;
    }

    return {
        init,
        getData,
        getOriginalData,
        isModified,
        setByte,
        goToOffset,
        nextPage,
        prevPage,
        undo,
        redo,
        applyEdit,
        cancelEdit,
        render,
        getModifiedCount,
        getModifications
    };
})();
