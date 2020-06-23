// tslint:disable: max-line-length
import { Component, EventEmitter } from '@angular/core';
import { IUploadOptions, ISelectedFile, IUploadInput, IUploadOutput } from 'ngx-uploader-directive';
import { IUploadProgress } from 'projects/ngx-uploader-directive/src/public-api';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})

export class AppComponent {
  title = 'ngx-uploader-directive';
  uploadNew = false;

  fileId: string;
  options: IUploadOptions;
  files: Array<ISelectedFile>;
  uploadInput: EventEmitter<IUploadInput>;
  dragOver: boolean;
  uploadUrl = 'http://upload.jayprajapati.in/uploadmedia';

  /**
   * Default Constructor
   */
  constructor() {
    this.options = { requestConcurrency: 3, maxFilesToAddInSingleRequest: 2, maxFileUploads: 10, maxFileSize: 10000000, logs: true };
    this.files = new Array<ISelectedFile>();
    this.uploadInput = new EventEmitter<IUploadInput>();
  }

  addNew() {
    this.uploadNew = true;
    this.removeAllFiles();
  }

  attachFile() {
    this.uploadNew = false;
  }

  /**
   * Upload output events.
   * @param output IUploadOutput Model on output.
   */
  onUploadOutput(output: IUploadOutput): void {
    console.log(output);
    switch (output.type) {
      case 'init':
        this.files = new Array<ISelectedFile>();
        break;
      case 'allAddedToQueue':
        // uncomment this if you want to auto upload files when added
        // this.startUpload();
        break;
      case 'addedToQueue':
        this.files = this.files.concat(output.files);
        break;
      case 'start':
        // uploading start
        break;
      case 'uploading':
        this.files = this.updateFiles(this.files, output.files, output.progress, 'UPDATE');
        console.log(this.files);
        break;
      case 'removed':
        this.files = this.updateFiles(this.files, output.files, output.progress, 'REMOVE');
        console.log(this.files);
        break;
      case 'removedAll':
        this.files = new Array<ISelectedFile>();
        console.log(this.files);
        break;
      case 'dragOver':
        this.dragOver = true;
        break;
      case 'dragOut':
      case 'drop':
        this.dragOver = false;
        break;
      case 'done':
        // The files are uploaded
        this.files = this.updateFiles(this.files, output.files, output.progress, 'UPDATE');
        console.log(this.files);
        break;
      case 'error':
        console.log(output);
        break;
    }
  }

  /**
   * Update files on output events
   * @param currentFiles Current Files Array
   * @param updatedFiles Updated Files Array
   * @param progress File progress
   * @param action Remove or Update
   */
  updateFiles(currentFiles: Array<ISelectedFile>, updatedFiles: Array<ISelectedFile>, progress: IUploadProgress, action: 'REMOVE' | 'UPDATE') {
    if (updatedFiles !== undefined) {
      if (action === 'UPDATE') {
        updatedFiles.forEach(updateFile => {
          currentFiles.forEach(
            (currentFile, currentFileIndex, currentFilesArray) => {
              if (currentFile.name === updateFile.name) {
                currentFilesArray[currentFileIndex] = updateFile;
                if (progress !== undefined) {
                  currentFilesArray[currentFileIndex].progress = progress;
                }
              }
            }
          );
        });
      } else if (action === 'REMOVE') {
        if (updatedFiles.length > 0) {
          currentFiles = currentFiles.filter((file) => file.requestId !== updatedFiles[0].requestId);
        } else {
          currentFiles = updatedFiles;
        }
      }
    }
    return currentFiles;
  }

  /**
   * Start Upload
   */
  startUpload(): void {
    if (this.files.length > 0) {

      const event: IUploadInput = {
        type: 'uploadAll',
        inputReferenceNumber: Math.random(),
        url: this.uploadUrl,
        method: 'POST',
        data: {
          foo: 'bar'
        },
        headers: { Authorization: 'bearer ' + 'aetklsndfl' }
      };

      this.uploadInput.emit(event);
    } else {
      console.error('No files selected');
    }
  }

  /**
   * Cancel file uploads.
   * @param requestId RequestId.
   */
  cancelUpload(requestId: string): void {
    console.log(requestId);
    this.uploadInput.emit({ type: 'cancel', inputReferenceNumber: Math.random(), requestId });
  }

  /**
   * Remoce files.
   * @param requestId Request id
   */
  removeFile(requestId: string): void {
    console.log(requestId);
    this.uploadInput.emit({ type: 'remove', inputReferenceNumber: Math.random(), requestId });
  }

  /**
   * Remoce all file uploads.
   */
  removeAllFiles(): void {
    this.uploadInput.emit({ type: 'removeAll', inputReferenceNumber: Math.random() });
  }
}
