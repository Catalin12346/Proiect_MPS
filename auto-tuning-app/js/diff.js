/**
 * Binary Diff Module
 * Compares two binary files and displays differences.
 */
const BinaryDiff = (() => {
    'use strict';

    /**
     * Compare two Uint8Arrays and return a list of differences.
     * @param {Uint8Array} original - The original data.
     * @param {Uint8Array} modified - The modified data.
     * @returns {Array<{offset: number, original: number, modified: number}>}
     */
    function compare(original, modified) {
        const diffs = [];
        const len = Math.max(original.length, modified.length);
        for (let i = 0; i < len; i++) {
            const origByte = i < original.length ? original[i] : -1;
            const modByte = i < modified.length ? modified[i] : -1;
            if (origByte !== modByte) {
                diffs.push({
                    offset: i,
                    original: origByte,
                    modified: modByte
                });
            }
        }
        return diffs;
    }

    /**
     * Group consecutive differences into blocks.
     * @param {Array} diffs - List of differences from compare().
     * @param {number} [gap=4] - Maximum gap between differences to merge into one block.
     * @returns {Array<{start: number, end: number, diffs: Array}>}
     */
    function groupDiffs(diffs, gap = 4) {
        if (diffs.length === 0) return [];

        const blocks = [];
        let blockStart = diffs[0].offset;
        let blockDiffs = [diffs[0]];

        for (let i = 1; i < diffs.length; i++) {
            if (diffs[i].offset - diffs[i - 1].offset <= gap) {
                blockDiffs.push(diffs[i]);
            } else {
                blocks.push({
                    start: blockStart,
                    end: blockDiffs[blockDiffs.length - 1].offset,
                    diffs: blockDiffs
                });
                blockStart = diffs[i].offset;
                blockDiffs = [diffs[i]];
            }
        }
        blocks.push({
            start: blockStart,
            end: blockDiffs[blockDiffs.length - 1].offset,
            diffs: blockDiffs
        });

        return blocks;
    }

    /**
     * Generate a statistics summary of the comparison.
     * @param {Uint8Array} original
     * @param {Uint8Array} modified
     * @param {Array} diffs
     * @returns {object}
     */
    function getStats(original, modified, diffs) {
        return {
            originalSize: original.length,
            modifiedSize: modified.length,
            sizeDiff: modified.length - original.length,
            totalDiffs: diffs.length,
            percentChanged: original.length > 0
                ? ((diffs.length / original.length) * 100).toFixed(4)
                : '0.0000'
        };
    }

    /**
     * Render the diff comparison tool.
     * @param {Uint8Array|null} fileA - First file data (or null).
     * @param {Uint8Array|null} fileB - Second file data (or null).
     */
    function renderTool(fileA, fileB) {
        const container = document.getElementById('diff-content');
        if (!container) return;

        if (!fileA && !fileB) {
            container.innerHTML = `
                <div class="diff-upload-area">
                    <h3>Comparare Fișiere Binare</h3>
                    <p>Încărcați două fișiere binare pentru comparare.</p>
                    <div class="diff-file-inputs">
                        <div class="diff-file-box">
                            <label>Fișier Original:</label>
                            <input type="file" id="diff-file-a" accept=".bin,.rom,.hex,.ecu,.ori,.mod">
                            <span id="diff-file-a-info" class="file-info">Niciun fișier selectat</span>
                        </div>
                        <div class="diff-file-box">
                            <label>Fișier Modificat:</label>
                            <input type="file" id="diff-file-b" accept=".bin,.rom,.hex,.ecu,.ori,.mod">
                            <span id="diff-file-b-info" class="file-info">Niciun fișier selectat</span>
                        </div>
                    </div>
                    <button id="diff-compare-btn" class="btn btn-primary" disabled>Compară</button>
                </div>
                <div id="diff-results"></div>`;

            const fileAInput = document.getElementById('diff-file-a');
            const fileBInput = document.getElementById('diff-file-b');
            const compareBtn = document.getElementById('diff-compare-btn');

            let dataA = null, dataB = null;

            fileAInput.addEventListener('change', async (e) => {
                if (e.target.files.length > 0) {
                    dataA = await BinaryUtils.readFile(e.target.files[0]);
                    document.getElementById('diff-file-a-info').textContent =
                        `${e.target.files[0].name} (${BinaryUtils.formatFileSize(dataA.length)})`;
                    compareBtn.disabled = !(dataA && dataB);
                }
            });

            fileBInput.addEventListener('change', async (e) => {
                if (e.target.files.length > 0) {
                    dataB = await BinaryUtils.readFile(e.target.files[0]);
                    document.getElementById('diff-file-b-info').textContent =
                        `${e.target.files[0].name} (${BinaryUtils.formatFileSize(dataB.length)})`;
                    compareBtn.disabled = !(dataA && dataB);
                }
            });

            compareBtn.addEventListener('click', () => {
                if (dataA && dataB) {
                    renderDiffResults(dataA, dataB);
                }
            });

            return;
        }

        renderDiffResults(fileA, fileB);
    }

    /**
     * Render the diff results.
     * @param {Uint8Array} dataA
     * @param {Uint8Array} dataB
     */
    function renderDiffResults(dataA, dataB) {
        const resultsContainer = document.getElementById('diff-results') ||
            document.getElementById('diff-content');
        if (!resultsContainer) return;

        const diffs = compare(dataA, dataB);
        const blocks = groupDiffs(diffs);
        const stats = getStats(dataA, dataB, diffs);

        let html = '<div class="diff-stats">';
        html += '<h3>Rezumat Comparare</h3>';
        html += `<div class="stats-grid">`;
        html += `<div class="stat-item"><span class="stat-label">Dimensiune original:</span><span class="stat-value">${BinaryUtils.formatFileSize(stats.originalSize)}</span></div>`;
        html += `<div class="stat-item"><span class="stat-label">Dimensiune modificat:</span><span class="stat-value">${BinaryUtils.formatFileSize(stats.modifiedSize)}</span></div>`;
        html += `<div class="stat-item"><span class="stat-label">Diferență dimensiune:</span><span class="stat-value ${stats.sizeDiff !== 0 ? 'text-warning' : ''}">${stats.sizeDiff > 0 ? '+' : ''}${stats.sizeDiff} bytes</span></div>`;
        html += `<div class="stat-item"><span class="stat-label">Bytes diferite:</span><span class="stat-value text-warning">${stats.totalDiffs}</span></div>`;
        html += `<div class="stat-item"><span class="stat-label">Procent modificat:</span><span class="stat-value">${stats.percentChanged}%</span></div>`;
        html += `<div class="stat-item"><span class="stat-label">Blocuri diferite:</span><span class="stat-value">${blocks.length}</span></div>`;
        html += '</div></div>';

        if (diffs.length === 0) {
            html += '<div class="diff-identical"><p>✅ Fișierele sunt identice!</p></div>';
        } else {
            html += '<div class="diff-table-wrapper"><h3>Diferențe Detaliate</h3>';
            html += '<table class="diff-table"><thead><tr>';
            html += '<th>Offset</th><th>Original (Hex)</th><th>Original (Dec)</th>';
            html += '<th>Modificat (Hex)</th><th>Modificat (Dec)</th><th>Diferență</th>';
            html += '</tr></thead><tbody>';

            const maxDisplay = 1000;
            const displayDiffs = diffs.slice(0, maxDisplay);

            for (const diff of displayDiffs) {
                const origHex = diff.original >= 0 ? BinaryUtils.byteToHex(diff.original) : '--';
                const modHex = diff.modified >= 0 ? BinaryUtils.byteToHex(diff.modified) : '--';
                const origDec = diff.original >= 0 ? diff.original.toString() : '--';
                const modDec = diff.modified >= 0 ? diff.modified.toString() : '--';
                const delta = (diff.modified >= 0 && diff.original >= 0)
                    ? (diff.modified - diff.original) : 'N/A';
                const deltaStr = typeof delta === 'number' ? (delta > 0 ? `+${delta}` : `${delta}`) : delta;

                html += `<tr>`;
                html += `<td class="mono">0x${diff.offset.toString(16).toUpperCase().padStart(8, '0')}</td>`;
                html += `<td class="mono diff-orig">${origHex}</td>`;
                html += `<td class="diff-orig">${origDec}</td>`;
                html += `<td class="mono diff-mod">${modHex}</td>`;
                html += `<td class="diff-mod">${modDec}</td>`;
                html += `<td class="mono ${typeof delta === 'number' && delta > 0 ? 'text-up' : typeof delta === 'number' && delta < 0 ? 'text-down' : ''}">${deltaStr}</td>`;
                html += '</tr>';
            }

            html += '</tbody></table>';

            if (diffs.length > maxDisplay) {
                html += `<p class="diff-truncated">Se afișează primele ${maxDisplay} din ${diffs.length} diferențe.</p>`;
            }

            html += '</div>';
        }

        resultsContainer.innerHTML = html;
    }

    return {
        compare,
        groupDiffs,
        getStats,
        renderTool,
        renderDiffResults
    };
})();
