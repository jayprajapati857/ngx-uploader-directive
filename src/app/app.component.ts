// tslint:disable: max-line-length
import { Component, EventEmitter } from '@angular/core';
import { IUploadOptions, ISelectedFile, IUploadInput, IUploadOutput } from 'ngx-uploader-directive';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})

export class AppComponent {
  title = 'ngx-uploader-directive';
  options: IUploadOptions;
  formData: FormData;
  files: Array<ISelectedFile>;
  uploadInput: EventEmitter<IUploadInput>;
  dragOver: boolean;
  uploadUrl = 'http://192.168.0.224:8099/api/blocklists/uploadblockednumberfile';

  /**
   * Default Constructor
   */
  constructor() {
    this.options = { requestConcurrency: 1, maxFilesToAddInSingleRequest: 10, maxFileUploads: 5, maxFileSize: 1000000, logs: true };
    this.files = new Array<ISelectedFile>();
    this.uploadInput = new EventEmitter<IUploadInput>();
    this.formData = new FormData();
  }

  onUploadOutput(output: IUploadOutput): void {
    // console.log(output);
    switch (output.type) {
      case 'init':
        this.files = new Array<ISelectedFile>();
        break;
      case 'allAddedToQueue':
        // uncomment this if you want to auto upload files when added
        // this.startUpload();
        break;
      case 'addedToQueue':
        if (typeof output.file !== 'undefined') {
          this.files.push(output.file);
          // console.log(this.files);
        }
        break;
      case 'uploading':
        if (typeof output.file !== 'undefined') {
          // update current data in files array for uploading file
          const index = this.files.findIndex((file) => typeof output.file !== 'undefined' && file.id === output.file.id);
          this.files[index] = output.file;
        }
        break;
      case 'removed':
        // remove file from array when removed
        this.files = this.files.filter((file: ISelectedFile) => file !== output.file);
        break;
      case 'dragOver':
        this.dragOver = true;
        break;
      case 'dragOut':
      case 'drop':
        this.dragOver = false;
        break;
      case 'done':
        // The file is downloaded
        break;
    }
  }

  startUpload(): void {
    this.formData.append('fileHasHeader', 'false');
    this.formData.append('delimiter', ',');

    const event: IUploadInput = {
      type: 'uploadAll',
      url: this.uploadUrl,
      method: 'POST',
      formData: this.formData,
      headers: { Authorization: 'bearer ' + 'aetklsndfl' }
    };

    this.uploadInput.emit(event);
  }

  cancelUpload(id: string): void {
    this.uploadInput.emit({ type: 'cancel', id });
  }

  removeFile(id: string): void {
    this.uploadInput.emit({ type: 'remove', id });
  }

  removeAllFiles(): void {
    this.uploadInput.emit({ type: 'removeAll' });
  }
}
