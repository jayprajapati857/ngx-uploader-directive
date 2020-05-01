/**
 * @license
 * The MIT License (MIT)
 * Copyright (c) 2015-2018 Jan Kuri jan@bleenco.com
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

// tslint:disable: max-line-length
// tslint:disable: no-console
import { Injectable, EventEmitter } from '@angular/core';
import { ISelectedFile, IUploadOutput, IUploadInput, IUploadProgress } from './models/ngx-uploader-directive-models';
import { Observable, Subscription, Subject } from 'rxjs';
import { finalize, mergeMap } from 'rxjs/operators';
import { HttpRequest, HttpClient, HttpEventType, HttpHandler, HttpHeaders } from '@angular/common/http';

// @Injectable({
//   providedIn: 'root'
// })

export class NgxUploaderDirectiveService {

  public static queue: Array<ISelectedFile> = new Array<ISelectedFile>();

  private devEnv = true;

  subscriptions: Array<{ id: string, sub: Subscription }>;
  fileServiceEvents: EventEmitter<IUploadOutput>;
  uploadScheduler: Subject<{ files: Array<ISelectedFile>, event: IUploadInput }>;
  fileTypes: Array<string>;
  maxFileUploads: number;
  maxFileSize: number;
  requestConcurrency: number;
  maxFilesToAddInSingleRequest: number;

  constructor(
    requestConcurrency: number = Number.POSITIVE_INFINITY,
    maxFilesToAddInSingleRequest: number = Number.POSITIVE_INFINITY,
    fileTypes: Array<string> = ['*'],
    maxFileUploads: number = Number.POSITIVE_INFINITY,
    maxFileSize: number = Number.POSITIVE_INFINITY,
    private httpClient: HttpClient,
    private logs?: boolean,
  ) {
    this.fileServiceEvents = new EventEmitter<IUploadOutput>();
    this.uploadScheduler = new Subject();
    this.requestConcurrency = requestConcurrency;
    this.fileTypes = fileTypes;
    this.maxFileUploads = maxFileUploads;
    this.maxFileSize = maxFileSize;
    this.subscriptions = new Array<{ id: string, sub: Subscription }>();

    this.uploadScheduler
      .pipe(
        mergeMap(upload => this.startUpload(upload), requestConcurrency)
      )
      .subscribe(uploadOutput => this.fileServiceEvents.emit(uploadOutput));
  }

  /**
   * Handles uploaded files
   * @param selectedFiles Selected Files
   */
  handleSelectedFiles(selectedFiles: FileList, selectedEventType: 'DROP' | 'SELECT') {

    NgxUploaderDirectiveService.queue = new Array<ISelectedFile>();
    this.fileServiceEvents.emit({ type: 'init', fileSelectedEventType: selectedEventType });

    if (this.logs && this.devEnv) {
      console.info('Handling selected files', selectedFiles);
    }

    // verify files with allowed files and max uploads
    const allowedFiles: Array<File> = new Array<File>();
    // tslint:disable-next-line: prefer-for-of
    for (let checkingFileIndex = 0; checkingFileIndex < selectedFiles.length; checkingFileIndex++) {
      const checkingFile = selectedFiles[checkingFileIndex];
      const queueLength = allowedFiles.length + NgxUploaderDirectiveService.queue.length + 1;

      if (this.isFileTypeAllowed(checkingFile.type) && queueLength <= this.maxFileUploads && this.isFileSizeAllowed(checkingFile.size)) {
        allowedFiles.push(checkingFile);
      } else {
        const rejectedFile: ISelectedFile = this.convertToSelectedFile(checkingFile, checkingFileIndex, selectedEventType);
        this.fileServiceEvents.emit({ type: 'rejected', file: rejectedFile, id: rejectedFile.id, fileSelectedEventType: selectedEventType });
      }
    }

    if (this.logs) {
      console.info('Allowed Files', allowedFiles);
    }

    // Adding files to queue
    // tslint:disable-next-line: prefer-for-of
    for (let fileIndex = 0; fileIndex < allowedFiles.length; fileIndex++) {
      const file = allowedFiles[fileIndex];
      if (this.logs && this.devEnv) {
        console.info('Adding files to queue file index: ' + fileIndex, file);
      }
      const selectedFile: ISelectedFile = this.convertToSelectedFile(file, fileIndex, selectedEventType);
      NgxUploaderDirectiveService.queue.push(selectedFile);
      this.fileServiceEvents.emit({ type: 'addedToQueue', file: selectedFile, id: selectedFile.id, fileSelectedEventType: selectedEventType });
    }

    if (NgxUploaderDirectiveService.queue.length > 0) {
      this.fileServiceEvents.emit({ type: 'allAddedToQueue', fileSelectedEventType: selectedEventType });
    }

    if (this.logs) {
      console.info('Queue', NgxUploaderDirectiveService.queue);
    }
  }

  /**
   * Handles input events upload | remove | cancel
   * @param inputEvnets Input events of file upload process
   */
  handleInputEvents(inputEvnets: EventEmitter<IUploadInput>): Subscription {
    return inputEvnets.subscribe((event: IUploadInput) => {
      if (this.logs && this.devEnv) {
        console.info('Input event', event);
      }

      switch (event.type) {
        case 'uploadFile':
          const fileIndex = NgxUploaderDirectiveService.queue.findIndex(file => file === event.file);
          if (fileIndex !== -1 && event.file) {
            this.uploadScheduler.next({
              files: NgxUploaderDirectiveService.queue.filter((file) => {
                return file.fileIndex === fileIndex;
              }), event
            });
          }

          break;

        case 'uploadAll':
          this.uploadScheduler.next({ files: NgxUploaderDirectiveService.queue, event });
          break;

        case 'cancel':
          const id = event.id || null;
          if (!id) {
            return;
          }
          const subs = this.subscriptions.filter(sub => sub.id === id);
          subs.forEach(sub => {
            if (sub.sub) {
              sub.sub.unsubscribe();
              // tslint:disable-next-line: no-shadowed-variable
              const fileIndex = NgxUploaderDirectiveService.queue.findIndex(file => file.id === id);
              if (fileIndex !== -1) {
                NgxUploaderDirectiveService.queue[fileIndex].progress.status = 'Cancelled';
                this.fileServiceEvents.emit({ type: 'cancelled', file: NgxUploaderDirectiveService.queue[fileIndex], id: NgxUploaderDirectiveService.queue[fileIndex].id, fileSelectedEventType: NgxUploaderDirectiveService.queue[fileIndex].selectedEventType });
              }
            }
          });
          break;

        case 'cancelAll':
          this.subscriptions.forEach(sub => {
            if (sub.sub) {
              sub.sub.unsubscribe();
            }

            const file = NgxUploaderDirectiveService.queue.find(uploadFile => uploadFile.id === sub.id);
            if (file) {
              file.progress.status = 'Cancelled';
              this.fileServiceEvents.emit({ type: 'cancelled', fileSelectedEventType: NgxUploaderDirectiveService.queue[fileIndex].selectedEventType });
            }
          });
          break;

        case 'remove':
          if (!event.id) {
            return;
          }

          const removeFileIndex = NgxUploaderDirectiveService.queue.findIndex(file => file.id === event.id);

          if (removeFileIndex !== -1) {
            const file = NgxUploaderDirectiveService.queue[removeFileIndex];
            NgxUploaderDirectiveService.queue.splice(removeFileIndex, 1);
            this.fileServiceEvents.emit({ type: 'removed', file, id: event.id, fileSelectedEventType: NgxUploaderDirectiveService.queue[fileIndex].selectedEventType });
          }
          break;

        case 'removeAll':
          if (NgxUploaderDirectiveService.queue.length) {
            NgxUploaderDirectiveService.queue = new Array<ISelectedFile>();
            this.fileServiceEvents.emit({ type: 'removedAll', fileSelectedEventType: 'ALL' });
          }
          break;
      }
    });
  }

  /**
   * Check for file type is valid or not
   * @param mimeType file mime type
   */
  isFileTypeAllowed(mimeType: string): boolean {
    const allAllowed = this.fileTypes.find((type: string) => type === '*') !== undefined;
    if (allAllowed) {
      return true;
    }
    return this.fileTypes.find((type: string) => type === mimeType) !== undefined;
  }

  /**
   * Start file upload
   * @param upload object with files and upload input event
   */
  startUpload(upload: { files: Array<ISelectedFile>, event: IUploadInput }): Observable<IUploadOutput> {
    return new Observable(observer => {
      const sub = this.uploadFiles(upload.files, upload.event)
        .pipe(finalize(() => {
          if (!observer.closed) {
            observer.complete();
          }
        }))
        .subscribe(output => {
          observer.next(output);
        }, err => {
          observer.error(err);
          observer.complete();
        }, () => {
          observer.complete();
        });

      // this.subscriptions.push({ id: upload.files[0].id, sub });
    });
  }

  /**
   * Upload files to server
   * @param files Array of files input
   * @param event Upload inout event
   */
  uploadFiles(files: Array<ISelectedFile>, event: IUploadInput): Observable<IUploadOutput> {
    return new Observable(observer => {
      const time: number = new Date().getTime();

      let speed = 0;
      let eta: number | null = null;

      const fileList = files;
      const headers = event.headers || {};

      if (this.logs && this.devEnv) {
        console.info('Files to Upload', files);
        console.info('Files upload with input event', event);
      }

      if (fileList.length > 0) {
        let formData: FormData = new FormData();

        if (event.formData !== undefined) {
          formData = event.formData;
        }

        if (fileList.length > 1) {
          // tslint:disable-next-line: prefer-for-of
          for (let fileIndex = 0; fileIndex < files.length; fileIndex++) {
            const element = files[fileIndex];
            formData.append('file_' + (fileIndex + 1), fileList[fileIndex].nativeFile, fileList[fileIndex].name);
          }
        } else {
          formData.append('file', fileList[0].nativeFile, fileList[0].name);
        }

        this.httpRequest(event.method, event.url, formData, new HttpHeaders(headers)).subscribe(
          // tslint:disable-next-line: no-shadowed-variable
          (data) => {
            switch (data.type) {
              case HttpEventType.UploadProgress:
                const percentage = Math.round((data.loaded * 100) / data.total);
                const diff = new Date().getTime() - time;
                speed = Math.round(data.loaded / diff * 1000);
                // progressStartTime = (files[0].progress.data && files[0].progress.data.startTime) || new Date().getTime();
                eta = Math.ceil((data.total - data.loaded) / speed);

                // console.log('Progress: ' + this.fileUploadProgress);
                const fileProgress: IUploadProgress = {
                  status: 'Uploading',
                  data: {
                    percentage,
                    speed,
                    speedHuman: `${this.humanizeBytes(speed)}/s`,
                    startTime: null,
                    endTime: null,
                    eta,
                    etaHuman: this.secondsToHuman(eta)
                  }
                };

                observer.next({ type: 'uploading', progress: fileProgress, fileSelectedEventType: files[0].selectedEventType });
                break;

              case HttpEventType.Response:
                files[0].response = data.body;
                const progress: IUploadProgress = {
                  status: 'Done',
                  data: {
                    percentage: 100,
                    speed,
                    speedHuman: `${this.humanizeBytes(speed)}/s`,
                    startTime: null,
                    endTime: new Date().getTime(),
                    eta,
                    etaHuman: this.secondsToHuman(eta || 0)
                  }
                };
                observer.next({ type: 'done', response: data.body, progress, fileSelectedEventType: files[0].selectedEventType });
                observer.complete();
                break;
            }

          },
          (error) => {
            console.log(error);
            observer.next({ type: 'error', response: error, fileSelectedEventType: files[0].selectedEventType });
            observer.complete();
          }
        );
      } else {
        observer.next({ type: 'error', response: 'No file selected' });
        observer.complete();
      }
    });
  }

  /**
   * Http Request to upload file(s).
   * @param requestMethod Request method POST | GET
   * @param apiUrl Url to send request
   * @param body FormData to passwith
   */
  public httpRequest(requestMethod: string, apiUrl: string, body: FormData, headers?: HttpHeaders): Observable<any> {
    const req = new HttpRequest(requestMethod, apiUrl, body, {
      headers,
      reportProgress: true
    });
    return this.httpClient.request(req);
  }

  /**
   * Converting seconds to human readable
   * @param sec Seconds
   */
  secondsToHuman(sec: number): string {
    return new Date(sec * 1000).toISOString().substr(11, 8);
  }

  /**
   * Check for max file size is allowed or not
   * @param fileSize file size
   */
  isFileSizeAllowed(fileSize: number): boolean {
    if (!this.maxFileSize) {
      return true;
    }
    return fileSize <= this.maxFileSize;
  }

  /**
   * Generate Randome file id
   */
  generateRandomeId(): string {
    return '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Humanize file Bytes
   * @param bytes file bytes
   */
  humanizeBytes(bytes: number): string {
    if (bytes === 0) {
      return '0 Byte';
    }

    const k = 1024;
    const sizes: Array<string> = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i: number = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Convert selected file to Selected file Interface
   * @param file Selected File
   * @param fileIndex File index in array
   */
  convertToSelectedFile(file: File, fileIndex: number, selectedEventType: 'DROP' | 'SELECT'): ISelectedFile {
    if (this.logs && this.devEnv) {
      console.info('Converting file to Input Selected File index: ' + fileIndex, file);
    }

    return {
      fileIndex,
      id: this.generateRandomeId(),
      name: file.name,
      nativeFile: file,
      type: file.type,
      selectedEventType,
      progress: {
        status: 'Queue',
        data: {
          percentage: 0,
          eta: 0,
          speed: 0,
          speedHuman: this.humanizeBytes(0),
          startTime: null,
          endTime: null,
          etaHuman: null,
        }
      }
    };
  }
}
