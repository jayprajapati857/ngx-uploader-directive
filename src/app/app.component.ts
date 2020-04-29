import { Component, EventEmitter } from '@angular/core';
import { IUploadOptions, ISelectedFile, IUploadInput, IUploadOutput } from 'ng-file-uploader';
// tslint:disable-next-line: max-line-length
// import { IUploadOptions, ISelectedFile, IUploadInput, IUploadOutput } from 'projects/ng-file-uploader/src/lib/models/ng-file-uploader-models';
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})

export class AppComponent {
  title = 'ng-file-uploader';
  options: IUploadOptions;
  formData: FormData;
  files: Array<ISelectedFile>;
  uploadInput: EventEmitter<IUploadInput>;
  dragOver: boolean;

  /**
   * Default Constructor
   */
  constructor() {
    this.options = { concurrency: 1, maxFileUploads: 5, maxFileSize: 1000000, logs: true };
    this.files = new Array<ISelectedFile>();
    this.uploadInput = new EventEmitter<IUploadInput>();
    this.formData = new FormData();
  }

  onUploadOutput(output: IUploadOutput): void {
    console.log(output);
    switch (output.type) {
      case 'allAddedToQueue':
        // uncomment this if you want to auto upload files when added
        // const event: UploadInput = {
        //   type: 'uploadAll',
        //   url: '/upload',
        //   method: 'POST',
        //   data: { foo: 'bar' }
        // };
        // this.uploadInput.emit(event);
        break;
      case 'addedToQueue':
        if (typeof output.file !== 'undefined') {
          this.files.push(output.file);
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
      url: 'http://192.168.0.224:8099/api/blocklists/uploadblockednumberfile',
      method: 'POST',
      data: { foo: 'bar' },
      formData: this.formData
    };

    this.uploadInput.emit(event);
  }

  cancelUpload(id: string): void {
    this.uploadInput.emit({ type: 'cancel', id: id });
  }

  removeFile(id: string): void {
    this.uploadInput.emit({ type: 'remove', id: id });
  }

  removeAllFiles(): void {
    this.uploadInput.emit({ type: 'removeAll' });
  }
}
