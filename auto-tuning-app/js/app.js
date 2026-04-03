/**
 * Main Application Module
 * Ties together all components of the Auto Tuning Binary Editor.
 */
const App = (() => {
    'use strict';

    let currentFile = null;
    let currentFileName = '';

    /**
     * Initialize the application.
     */
    function init() {
        setupNavigation();
        setupFileHandlers();
        setupHexEditorControls();
        setupMapViewerControls();
        setupSearchControls();
        setupKeyboardShortcuts();
        showTab('hex-editor');
    }

    /**
     * Set up tab navigation.
     */
    function setupNavigation() {
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const tabId = tab.dataset.tab;
                showTab(tabId);
            });
        });
    }

    /**
     * Show a specific tab.
     * @param {string} tabId
     */
    function showTab(tabId) {
        document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

        const tab = document.querySelector(`.nav-tab[data-tab="${tabId}"]`);
        const content = document.getElementById(tabId);
        if (tab) tab.classList.add('active');
        if (content) content.classList.add('active');

        if (tabId === 'checksum' && HexEditor.getData()) {
            Checksum.renderTool(HexEditor.getData());
        }
        if (tabId === 'diff') {
            BinaryDiff.renderTool(null, null);
        }
    }

    /**
     * Switch to hex editor and navigate to a specific offset.
     * @param {number} offset
     */
    function switchToHexEditor(offset) {
        showTab('hex-editor');
        HexEditor.goToOffset(offset);
    }

    /**
     * Set up file loading and saving handlers.
     */
    function setupFileHandlers() {
        const fileInput = document.getElementById('file-input');
        const loadBtn = document.getElementById('load-file-btn');
        const saveBtn = document.getElementById('save-file-btn');
        const dropZone = document.getElementById('drop-zone');

        loadBtn.addEventListener('click', () => fileInput.click());

        fileInput.addEventListener('change', async (e) => {
            if (e.target.files.length > 0) {
                await loadFile(e.target.files[0]);
            }
        });

        saveBtn.addEventListener('click', () => {
            const data = HexEditor.getData();
            if (!data) {
                alert('Nu există date de salvat. Încărcați mai întâi un fișier.');
                return;
            }
            const modSuffix = HexEditor.isModified() ? '_modified' : '';
            const parts = currentFileName.split('.');
            let saveName;
            if (parts.length > 1) {
                const ext = parts.pop();
                saveName = parts.join('.') + modSuffix + '.' + ext;
            } else {
                saveName = currentFileName + modSuffix + '.bin';
            }
            BinaryUtils.saveFile(data, saveName);
        });

        if (dropZone) {
            dropZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropZone.classList.add('drag-over');
            });
            dropZone.addEventListener('dragleave', () => {
                dropZone.classList.remove('drag-over');
            });
            dropZone.addEventListener('drop', async (e) => {
                e.preventDefault();
                dropZone.classList.remove('drag-over');
                if (e.dataTransfer.files.length > 0) {
                    await loadFile(e.dataTransfer.files[0]);
                }
            });
        }
    }

    /**
     * Load a binary file into the application.
     * @param {File} file
     */
    async function loadFile(file) {
        try {
            const data = await BinaryUtils.readFile(file);
            currentFile = data;
            currentFileName = file.name;

            HexEditor.init(data);
            updateFileStatus(file.name, data.length);
            showTab('hex-editor');

            document.getElementById('save-file-btn').disabled = false;
            document.getElementById('drop-zone').style.display = 'none';
            document.getElementById('editor-area').style.display = 'flex';
        } catch (err) {
            alert('Eroare la încărcarea fișierului: ' + err.message);
        }
    }

    /**
     * Update the file status bar.
     * @param {string} name
     * @param {number} size
     */
    function updateFileStatus(name, size) {
        const statusEl = document.getElementById('file-status');
        if (statusEl) {
            statusEl.innerHTML =
                `<span class="status-item">📁 <strong>${escapeHtml(name)}</strong></span>` +
                `<span class="status-item">📏 ${BinaryUtils.formatFileSize(size)}</span>`;
        }
    }

    /**
     * Escape HTML special characters.
     * @param {string} text
     * @returns {string}
     */
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Set up hex editor control buttons.
     */
    function setupHexEditorControls() {
        document.getElementById('hex-prev').addEventListener('click', () => HexEditor.prevPage());
        document.getElementById('hex-next').addEventListener('click', () => HexEditor.nextPage());
        document.getElementById('hex-undo').addEventListener('click', () => HexEditor.undo());
        document.getElementById('hex-redo').addEventListener('click', () => HexEditor.redo());

        document.getElementById('edit-apply').addEventListener('click', () => HexEditor.applyEdit());
        document.getElementById('edit-cancel').addEventListener('click', () => HexEditor.cancelEdit());

        document.getElementById('goto-offset-btn').addEventListener('click', () => {
            const input = document.getElementById('goto-offset-input');
            const offset = parseInt(input.value.trim(), 16);
            if (isNaN(offset) || offset < 0) {
                alert('Offset invalid! Introduceți o adresă hex validă.');
                return;
            }
            HexEditor.goToOffset(offset);
        });

        document.getElementById('goto-offset-input').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                document.getElementById('goto-offset-btn').click();
            }
        });
    }

    /**
     * Set up map viewer controls.
     */
    function setupMapViewerControls() {
        document.getElementById('map-load-btn').addEventListener('click', () => {
            const data = HexEditor.getData();
            if (!data) {
                alert('Încărcați mai întâi un fișier binar.');
                return;
            }

            const offsetHex = document.getElementById('map-offset').value.trim();
            const rows = parseInt(document.getElementById('map-rows').value, 10);
            const cols = parseInt(document.getElementById('map-cols').value, 10);
            const dataType = document.getElementById('map-data-type').value;
            const name = document.getElementById('map-name').value.trim() || 'Hartă ECU';
            const multiplier = parseFloat(document.getElementById('map-multiplier').value) || 1;
            const unit = document.getElementById('map-unit').value.trim();

            const offset = parseInt(offsetHex, 16);
            if (isNaN(offset) || offset < 0) {
                alert('Offset invalid!');
                return;
            }
            if (isNaN(rows) || rows < 1 || isNaN(cols) || cols < 1) {
                alert('Număr de rânduri/coloane invalid!');
                return;
            }

            MapViewer.loadMap(data, {
                offset,
                rows,
                cols,
                dataType,
                name,
                multiplier,
                addend: 0,
                unit
            });
        });
    }

    /**
     * Set up search and replace controls.
     */
    function setupSearchControls() {
        document.getElementById('search-btn').addEventListener('click', () => {
            const data = HexEditor.getData();
            if (!data) {
                alert('Încărcați mai întâi un fișier binar.');
                return;
            }

            const pattern = document.getElementById('search-pattern').value.trim();
            if (!pattern) {
                alert('Introduceți un pattern de căutare hex.');
                return;
            }

            const results = BinaryUtils.searchHexPattern(data, pattern);
            const resultsContainer = document.getElementById('search-results');

            if (results.length === 0) {
                resultsContainer.innerHTML = '<p class="no-results">Nu s-au găsit rezultate.</p>';
            } else {
                let html = `<p>S-au găsit <strong>${results.length}</strong> rezultate:</p><ul class="search-results-list">`;
                const maxShow = Math.min(results.length, 100);
                for (let i = 0; i < maxShow; i++) {
                    html += `<li><a href="#" class="search-result-link" data-offset="${results[i]}">` +
                        `0x${results[i].toString(16).toUpperCase().padStart(8, '0')}</a></li>`;
                }
                if (results.length > maxShow) {
                    html += `<li>... și încă ${results.length - maxShow} rezultate</li>`;
                }
                html += '</ul>';
                resultsContainer.innerHTML = html;

                resultsContainer.querySelectorAll('.search-result-link').forEach(link => {
                    link.addEventListener('click', (e) => {
                        e.preventDefault();
                        const offset = parseInt(link.dataset.offset, 10);
                        switchToHexEditor(offset);
                    });
                });
            }
        });

        document.getElementById('replace-btn').addEventListener('click', () => {
            const data = HexEditor.getData();
            if (!data) {
                alert('Încărcați mai întâi un fișier binar.');
                return;
            }

            const searchPattern = document.getElementById('search-pattern').value.trim();
            const replacePattern = document.getElementById('replace-pattern').value.trim();

            if (!searchPattern || !replacePattern) {
                alert('Introduceți atât pattern-ul de căutare cât și cel de înlocuire.');
                return;
            }

            const cleanSearch = searchPattern.replace(/\s+/g, '');
            const cleanReplace = replacePattern.replace(/\s+/g, '');
            if (cleanSearch.length !== cleanReplace.length) {
                alert('Pattern-urile de căutare și înlocuire trebuie să aibă aceeași lungime.');
                return;
            }

            const results = BinaryUtils.searchHexPattern(data, searchPattern);
            if (results.length === 0) {
                alert('Pattern-ul nu a fost găsit.');
                return;
            }

            const confirmMsg = `S-au găsit ${results.length} potriviri. Doriți să le înlocuiți pe toate?`;
            if (!confirm(confirmMsg)) return;

            for (const offset of results) {
                BinaryUtils.replaceAtOffset(data, offset, replacePattern);
            }

            HexEditor.init(HexEditor.getOriginalData());
            for (let i = 0; i < data.length; i++) {
                if (data[i] !== HexEditor.getOriginalData()[i]) {
                    HexEditor.setByte(i, data[i]);
                }
            }

            HexEditor.render();
            alert(`${results.length} potriviri au fost înlocuite.`);
        });

        document.getElementById('search-pattern').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                document.getElementById('search-btn').click();
            }
        });
    }

    /**
     * Set up keyboard shortcuts.
     */
    function setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'z') {
                e.preventDefault();
                HexEditor.undo();
            }
            if (e.ctrlKey && e.key === 'y') {
                e.preventDefault();
                HexEditor.redo();
            }
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                document.getElementById('save-file-btn').click();
            }
            if (e.ctrlKey && e.key === 'o') {
                e.preventDefault();
                document.getElementById('load-file-btn').click();
            }
            if (e.ctrlKey && e.key === 'g') {
                e.preventDefault();
                document.getElementById('goto-offset-input').focus();
            }
        });
    }

    return {
        init,
        showTab,
        switchToHexEditor
    };
})();

document.addEventListener('DOMContentLoaded', () => App.init());
