/*
 * File Sharing
 *
 * @copyright Copyright (c) 2022-2025 Go Johansson (nekunekus) <neku@pomf.se> <github.com/nokonoko>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

/*jshint esversion: 6 */

document.addEventListener('DOMContentLoaded', () => {
    let uploadedFiles = [];
    /**
     * Sets up the elements inside file upload rows.
     *
     * @param {File} file
     * @return {HTMLLIElement} row
     */
    const formatSize = (bytes) => {
        const units = ['B', 'KB', 'MB', 'GB'];
        let value = bytes, unit = 0;
        while (value >= 1024 && unit < units.length - 1) { value /= 1024; unit += 1; }
        return `${value < 10 && unit > 0 ? value.toFixed(1) : Math.round(value)} ${units[unit]}`;
    };

    const addRow = (file) => {
        const row = document.createElement('li');

        const icon = document.createElement('span');
        icon.className = 'file-icon';
        const ext = file.name.includes('.') ? file.name.split('.').pop() : '';
        icon.textContent = ext.length > 0 && ext.length <= 4 ? ext : 'file';

        const name = document.createElement('span');
        name.textContent = file.name;
        name.className = 'file-name';

        const size = document.createElement('span');
        size.className = 'file-size';
        size.textContent = formatSize(file.size);

        const progressIndicator = document.createElement('span');
        progressIndicator.className = 'progress-percent';
        progressIndicator.textContent = '0%';

        const progressBar = document.createElement('progress');
        progressBar.className = 'file-progress';
        progressBar.setAttribute('max', '100');
        progressBar.setAttribute('value', '0');

        row.appendChild(icon);
        row.appendChild(name);
        row.appendChild(size);
        row.appendChild(progressBar);
        row.appendChild(progressIndicator);

        document.getElementById('upload-filelist').appendChild(row);
        return row;
    };

    /**
     * Updates the page while the file is being uploaded.
     *
     * @param {ProgressEvent} evt
     */
    const handleUploadProgress = (evt) => {
        const xhr = evt.target;
        const bar = xhr.bar;
        const percentIndicator = xhr.percent;

        if (evt.lengthComputable) {
            const progressPercent = Math.floor((evt.loaded / evt.total) * 100);
            bar.setAttribute('value', progressPercent);
            percentIndicator.textContent = `${progressPercent}%`;
        }
    };
    /**
     * Copies text to the clipboard and briefly confirms on the button.
     */
    const copyText = (text, button, label) => {
        const done = () => {
            button.textContent = 'Copied ✓';
            button.classList.add('copied');
            setTimeout(() => { button.textContent = label; button.classList.remove('copied'); }, 1600);
        };
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text).then(done);
        } else {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            done();
        }
    };

    /**
     * Creates a button that copies all links from successfully uploaded files.
     */
    const createCopyAllButton = () => {
        if (document.getElementById('copy-all-btn')) {
            return;
        }
        const copyAll = document.createElement('button');
        copyAll.id = 'copy-all-btn';
        copyAll.className = 'upload-clipboard-btn';
        copyAll.textContent = 'Copy all links';
        const fileList = document.getElementById('upload-filelist');
        fileList.parentNode.insertBefore(copyAll, fileList.nextSibling);
        copyAll.addEventListener('click', () => copyText(uploadedFiles.join('\n'), copyAll, 'Copy all links'));
    };

    /**
     * Complete the uploading process by checking the response status and, if the
     * upload was successful, writing the URL(s) and creating the copy element(s)
     * for the files.
     *
     * @param {ProgressEvent} evt
     */
    const handleUploadComplete = (evt) => {
        const xhr = evt.target;
        const bar = xhr.bar;
        const row = xhr.row;
        const percentIndicator = xhr.percent;

        row.removeChild(bar);
        row.removeChild(percentIndicator);

        const url = document.createElement('span');
        url.className = 'file-url';
        row.appendChild(url);

        const fail = (message) => {
            row.classList.add('failed');
            url.classList.add('error');
            url.textContent = message || 'Upload failed.';
        };

        let response = {};
        try { response = JSON.parse(xhr.responseText); } catch (e) { /* risposta non JSON */ }

        if (xhr.status === 200 && response.success) {
            const fileUrl = response.files[0].url;
            const link = document.createElement('a');
            link.textContent = fileUrl.replace(/.*?:\/\//g, '');
            link.href = fileUrl;
            link.target = '_blank';
            link.rel = 'noopener';
            url.appendChild(link);
            uploadedFiles.push(fileUrl);

            const copy = document.createElement('button');
            copy.className = 'upload-clipboard-btn';
            copy.type = 'button';
            copy.textContent = 'Copy';
            copy.addEventListener('click', () => copyText(fileUrl, copy, 'Copy'));
            url.appendChild(copy);
            row.classList.add('done');

            if (uploadedFiles.length > 1) {
                createCopyAllButton();
            }
        } else if (xhr.status === 413) {
            fail('File too big!');
        } else {
            fail(response.description);
        }
    };

    /**
     * Updates the page while the file is being uploaded.
     *
     * @param {File} file
     * @param {HTMLLIElement} row
     */
    const uploadFile = async (file, row) => {
        const bar = row.querySelector('.file-progress');
        const percent = row.querySelector('.progress-percent');
        const max = parseInt(document.getElementById('upload-input').dataset.maxSize, 10) * 1024 * 1024;
        const chunkSize = 8 * 1024 * 1024;
        const finish = (status, response) => handleUploadComplete({target: {
            status, responseText: JSON.stringify(response), row, bar, percent
        }});
        if (file.size > max) {
            finish(413, {description: 'File too big!'});
            return;
        }
        try {
            let id = '';
            let offset = 0;
            do {
                const chunked = file.size > chunkSize;
                const end = chunked ? Math.min(offset + chunkSize, file.size) : file.size;
                const form = new FormData();
                if (chunked) {
                    form.append('id', id);
                    form.append('name', file.name);
                    form.append('total', String(file.size));
                    form.append('offset', String(offset));
                    form.append('chunk', file.slice(offset, end), 'chunk.bin');
                } else {
                    form.append('files[]', file);
                }
                const result = await new Promise((resolve, reject) => {
                    const xhr = new XMLHttpRequest();
                    xhr.open('POST', chunked ? 'chunk.php' : 'upload.php');
                    xhr.timeout = 300000;
                    xhr.upload.onprogress = (event) => {
                        if (event.lengthComputable) {
                            const value = Math.floor(100 * (offset + (end - offset) * event.loaded / event.total) / (file.size || 1));
                            bar.value = value;
                            percent.textContent = value === 100 ? 'Processing…' : `${value}%`;
                        }
                    };
                    xhr.onerror = () => reject(new Error('Connection failed. Please retry.'));
                    xhr.ontimeout = () => reject(new Error('Upload timed out. Please retry.'));
                    xhr.onload = () => {
                        try {
                            const data = JSON.parse(xhr.responseText);
                            if (xhr.status !== 200 || !data.success) throw new Error(data.description || 'Upload failed.');
                            resolve(data);
                        } catch (error) {
                            reject(new Error(xhr.status === 413 ? 'File too big!' : (error instanceof SyntaxError ? 'Upload failed. Please retry.' : error.message)));
                        }
                    };
                    xhr.send(form);
                });
                if (!chunked || end === file.size) {
                    finish(200, result);
                    return;
                }
                if (result.offset !== end || !result.id) throw new Error('Invalid upload response. Please retry.');
                id = result.id;
                offset = end;
            } while (offset < file.size);
        } catch (error) {
            finish(400, {description: error.message});
        }
    };

    /**
     * Prevents the browser for allowing the normal actions associated with an event.
     * This is used by event handlers to allow custom functionality without
     * having to worry about the other consequences of that action.
     *
     * @param {Event} evt
     */
    const stopDefaultEvent = (evt) => {
        evt.stopPropagation();
        evt.preventDefault();
    };

    /**
     * Adds 1 to the state and changes the text.
     *
     * @param {Object} state
     * @param {HTMLButtonElement} element
     * @param {DragEvent} evt
     */
    const handleDrag = (state, element, evt) => {
        stopDefaultEvent(evt);
        if (state.dragCount === 0) {
            document.body.classList.add('dragging');
            document.getElementById('upload-label').textContent = 'Drop to upload';
        }
        state.dragCount += 1;
    };

    /**
     * Subtracts 1 from the state and changes the text back.
     *
     * @param {Object} state
     * @param {HTMLButtonElement} element
     * @param {DragEvent} evt
     */
    const handleDragAway = (state, element, evt) => {
        stopDefaultEvent(evt);
        state.dragCount = Math.max(0, state.dragCount - 1);
        if (state.dragCount === 0) {
            document.body.classList.remove('dragging');
            document.getElementById('upload-label').textContent = 'Drop files, paste, or click to choose';
        }
    };

    /**
     * Prepares files for uploading after being added via drag-drop.
     *
     * @param {Object} state
     * @param {HTMLButtonElement} element
     * @param {DragEvent} evt
     */
    const handleDragDrop = (state, element, evt) => {
        stopDefaultEvent(evt);
        state.dragCount = 1;
        handleDragAway(state, element, evt);
        const len = evt.dataTransfer.files.length;
        for (let i = 0; i < len; i++) {
            const file = evt.dataTransfer.files[i];
            const row = addRow(file);
            uploadFile(file, row);
        }
    };

    /**
     * Prepares the files to be uploaded when they're added to the <input> element.
     *
     * @param {InputEvent} evt
     */
    const uploadFiles = (evt) => {
        const len = evt.target.files.length;
        // For each file, make a row, and upload the file.
        for (let i = 0; i < len; i++) {
            const file = evt.target.files[i];
            const row = addRow(file);
            uploadFile(file, row);
        }
    };

    /**
     * Opens up a "Select files" dialog window to allow users to select files to upload.
     *
     * @param {HTMLInputElement} target
     * @param {InputEvent} evt
     */
    const selectFiles = (target, evt) => {
        stopDefaultEvent(evt);
        target.click();
    };

    /* Handles the pasting function */
    window.addEventListener("paste", e => {
        const len = e.clipboardData.files.length;
        for (let i = 0; i < len; i++) {
            const file = e.clipboardData.files[i];
            const row = addRow(file);
            uploadFile(file, row);
        }
    });

    /* Set up the event handlers for the <button>, <input> and the window itself
      */
    const state = {dragCount: 0};
    const uploadButton = document.getElementById('upload-btn');
    window.addEventListener('dragenter', (evt) => handleDrag(state, uploadButton, evt), false);
    window.addEventListener('dragleave', (evt) => handleDragAway(state, uploadButton, evt), false);
    // rilascio ovunque nella pagina, non solo sul riquadro
    window.addEventListener('drop', (evt) => handleDragDrop(state, uploadButton, evt), false);
    window.addEventListener('dragover', stopDefaultEvent, false);

    const uploadInput = document.getElementById('upload-input');
    uploadInput.addEventListener('change', uploadFiles);
    uploadButton.addEventListener('click', () => selectFiles(uploadInput, event));
    uploadButton.addEventListener('drop', (evt) => handleDragDrop(state, uploadButton, evt), false);
});