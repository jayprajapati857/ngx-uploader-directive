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
import { finalize, mergeMap, switchMap } from 'rxjs/operators';
import { HttpRequest, HttpClient, HttpEventType, HttpHandler, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { environment } from './configs/config';

// @Injectable({
//   providedIn: 'root'
// })

export class NgxUploaderDirectiveService {

  public static inputEventReferenceNumber = 0;

  private devEnv = !environment.production;
  public queue: Array<ISelectedFile> = new Array<ISelectedFile>();
  public MaxNumberOfRequest = 10;

  subscriptions: Array<{ id: string, sub: Subscription }>;
  fileServiceEvents: EventEmitter<IUploadOutput>;
  uploadScheduler: Subject<{ files: Array<ISelectedFile>, event: IUploadInput }>;
  fileTypes: Array<string>;
  maxFileUploads: number;
  maxFileSize: number;
  requestConcurrency: number;
  maxFilesToAddInSingleRequest: number;
  httpErrorResponse: HttpErrorResponse;

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
    this.maxFilesToAddInSingleRequest = 0;
    this.fileTypes = fileTypes;
    this.maxFileUploads = maxFileUploads;
    this.maxFilesToAddInSingleRequest = maxFilesToAddInSingleRequest;
    this.maxFileSize = maxFileSize;
    this.subscriptions = new Array<{ id: string, sub: Subscription }>();

    this.uploadScheduler
      .pipe(
        mergeMap(upload => this.startUpload(upload), requestConcurrency === 0 ? this.MaxNumberOfRequest : requestConcurrency)
      )
      .subscribe(uploadOutput => this.fileServiceEvents.emit(uploadOutput));
  }

  /**
   * Handles uploaded files
   * @param selectedFiles Selected Files
   */
  handleSelectedFiles(selectedFiles: FileList, selectedEventType: 'DROP' | 'SELECT') {

    this.queue = new Array<ISelectedFile>();
    this.fileServiceEvents.emit({ type: 'init', fileSelectedEventType: selectedEventType });

    if (this.logs && this.devEnv) {
      console.info('Handling selected files', selectedFiles);
    }

    if (selectedFiles.length > this.maxFileUploads) {
      this.httpErrorResponse = new HttpErrorResponse({ status: 0, error: 'Maxium ' + this.maxFileUploads + ' files can be upload' });
      this.fileServiceEvents.emit({ type: 'error', response: this.httpErrorResponse, fileSelectedEventType: selectedEventType });
      return;
    }

    // verify files with allowed files and max uploads
    const allowedFiles: Array<File> = new Array<File>();
    const rejectedFiles: Array<ISelectedFile> = new Array<ISelectedFile>();
    // tslint:disable-next-line: prefer-for-of
    for (let checkingFileIndex = 0; checkingFileIndex < selectedFiles.length; checkingFileIndex++) {
      const checkingFile = selectedFiles[checkingFileIndex];
      const queueLength = allowedFiles.length + this.queue.length + 1;

      if (this.isFileTypeAllowed(checkingFile.type) && this.isFileSizeAllowed(checkingFile.size)) {
        allowedFiles.push(checkingFile);
      } else {
        const rejectedFile: ISelectedFile = this.convertToSelectedFile(checkingFile, checkingFileIndex, this.generateRandomeId(), selectedEventType);
        rejectedFiles.push(rejectedFile);
      }
    }

    if (rejectedFiles.length > 0) {
      this.httpErrorResponse = new HttpErrorResponse({ status: 0, error: 'Invalid file type or file size exceeded the limit ' + this.humanizeBytes(this.maxFileSize), statusText: 'Invalid Input' });
      this.fileServiceEvents.emit({ type: 'rejected', files: rejectedFiles, fileSelectedEventType: selectedEventType, response: this.httpErrorResponse });
    }

    if (this.logs) {
      console.info('Allowed Files', allowedFiles);
    }

    // Adding files to queue
    let filesAddedToQueue: Array<ISelectedFile>;
    const totalFilesAdded: Array<ISelectedFile> = new Array<ISelectedFile>();

    if (this.maxFilesToAddInSingleRequest === 0 || this.maxFilesToAddInSingleRequest === 1) {
      if (this.logs && this.devEnv) {
        console.info('Single file or Single Request');
      }
      const eventId = this.generateRandomeId();
      // tslint:disable-next-line: prefer-for-of
      for (let fileIndex = 0; fileIndex < allowedFiles.length; fileIndex++) {

        const file = allowedFiles[fileIndex];
        let selectedFile: ISelectedFile;
        if (this.maxFilesToAddInSingleRequest === 0) {
          selectedFile = this.convertToSelectedFile(file, fileIndex, eventId, selectedEventType);
        } else if (this.maxFilesToAddInSingleRequest === 1) {
          selectedFile = this.convertToSelectedFile(file, fileIndex, this.generateRandomeId(), selectedEventType);
        }

        this.queue.push(selectedFile);
        filesAddedToQueue = new Array<ISelectedFile>();
        filesAddedToQueue.push(selectedFile);
        totalFilesAdded.push(selectedFile);
        this.fileServiceEvents.emit({ type: 'addedToQueue', files: filesAddedToQueue, requestId: selectedFile.requestId, fileSelectedEventType: selectedEventType });
      }
    } else {
      if (this.logs && this.devEnv) {
        console.info('Multiple file multiple request');
      }
      // generate id for max files to add in single request.
      const chunkedArray = this.chunkArray(allowedFiles, this.maxFilesToAddInSingleRequest);
      let fileIndex = 0;
      // tslint:disable-next-line: prefer-for-of
      for (let chukedQueueArrayIndex = 0; chukedQueueArrayIndex < chunkedArray.length; chukedQueueArrayIndex++) {
        const chunkedElement = chunkedArray[chukedQueueArrayIndex];
        const eventId = this.generateRandomeId();
        filesAddedToQueue = new Array<ISelectedFile>();
        // tslint:disable-next-line: prefer-for-of
        for (let chunkElementIndex = 0; chunkElementIndex < chunkedElement.length; chunkElementIndex++) {
          const selectedFileElement = chunkedElement[chunkElementIndex];
          const convertdFile = this.convertToSelectedFile(selectedFileElement, fileIndex, eventId, selectedEventType);
          this.queue.push(convertdFile);
          filesAddedToQueue.push(convertdFile);
          totalFilesAdded.push(convertdFile);
          fileIndex += 1;
        }
        this.fileServiceEvents.emit({ type: 'addedToQueue', files: filesAddedToQueue, requestId: eventId, fileSelectedEventType: selectedEventType });
      }
    }

    if (this.queue.length > 0) {
      this.fileServiceEvents.emit({ type: 'allAddedToQueue', files: totalFilesAdded, fileSelectedEventType: selectedEventType });
    }

    if (this.logs) {
      console.info('Queue', this.queue);
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

      if (this.queue.length === 0) {
        return;
      }

      const requestId = event.requestId;

      switch (event.type) {
        case 'uploadFile':
          if (!requestId) {
            this.httpErrorResponse = new HttpErrorResponse({ status: 0, error: 'Invalid request id.', statusText: 'Invalid Input' });
            this.fileServiceEvents.emit({ type: 'error', response: this.httpErrorResponse, fileSelectedEventType: 'ALL' });
            return;
          }

          this.uploadScheduler.next({
            files: this.queue.filter(
              (file) => {
                return file.requestId === event.requestId;
              }
            ), event
          });

          break;

        case 'uploadAll':
          const groupOfRequests = this.groupByArray(this.queue.filter((file) => file.progress.status === 'Queue'), 'requestId');
          if (this.logs) {
            console.info('Group of request', groupOfRequests);
          }

          for (const request in groupOfRequests) {
            if (groupOfRequests.hasOwnProperty(request)) {
              const requestFiles = groupOfRequests[request];
              if (this.logs && this.devEnv) {
                console.info('Requesting for id ' + request, requestFiles);
              }
              this.uploadScheduler.next({ files: requestFiles, event });
            }
          }
          break;

        case 'cancel':
          if (!requestId) {
            this.httpErrorResponse = new HttpErrorResponse({ status: 0, error: 'Invalid request id.', statusText: 'Invalid Input' });
            this.fileServiceEvents.emit({ type: 'error', response: this.httpErrorResponse, fileSelectedEventType: 'ALL' });
            return;
          }
          const subs = this.subscriptions.filter(sub => sub.id === requestId);
          if (this.logs && this.devEnv) {
            console.info('subscriptions ', subs);
          }
          subs.forEach(sub => {
            if (sub.sub) {
              sub.sub.unsubscribe();

              // tslint:disable-next-line: no-shadowed-variable
              const cancelledFilesArray = this.queue.filter((file) => file.requestId === requestId);
              if (cancelledFilesArray.length > 0) {
                this.queue.forEach((file, fileIndex, queue) => {
                  queue[fileIndex].progress.status = 'Cancelled';
                });
                this.fileServiceEvents.emit({ type: 'cancelled', requestId, files: cancelledFilesArray, fileSelectedEventType: cancelledFilesArray[0].selectedEventType });
              } else {
                this.httpErrorResponse = new HttpErrorResponse({ status: 0, error: 'Files not found with request id ' + requestId });
                this.fileServiceEvents.emit({ type: 'error', response: this.httpErrorResponse, fileSelectedEventType: 'ALL' });
              }
            }
          });
          break;

        case 'cancelAll':
          this.subscriptions.forEach(sub => {
            if (sub.sub) {
              sub.sub.unsubscribe();
            }

            const canceldFileArray = this.queue.filter((uploadFile) => uploadFile.requestId === sub.id);
            if (canceldFileArray.length > 0) {
              this.queue.forEach((file, fileIndex, queue) => {
                queue[fileIndex].progress.status = 'Cancelled';
              });
              this.fileServiceEvents.emit({ type: 'cancelled', files: canceldFileArray, fileSelectedEventType: canceldFileArray[0].selectedEventType });
            } else {
              this.httpErrorResponse = new HttpErrorResponse({ status: 0, error: 'Files not found with request id ' + requestId, statusText: 'Invalid Input' });
              this.fileServiceEvents.emit({ type: 'error', response: this.httpErrorResponse, fileSelectedEventType: 'ALL' });
            }
          });
          break;

        case 'remove':
          if (!requestId) {
            this.httpErrorResponse = new HttpErrorResponse({ status: 0, error: 'Invalid request id.', statusText: 'Invalid Input' });
            this.fileServiceEvents.emit({ type: 'error', response: this.httpErrorResponse, fileSelectedEventType: 'ALL' });
            return;
          }

          const filesToRemove = this.queue.filter((file) => file.requestId === event.requestId);

          if (filesToRemove.length > 0) {
            const remainingFilesArray = this.queue.filter((file) => file.requestId !== event.requestId);
            this.queue = remainingFilesArray;
            this.fileServiceEvents.emit({ type: 'removed', requestId: event.requestId, files: filesToRemove, fileSelectedEventType: 'ALL' });
          } else {
            this.httpErrorResponse = new HttpErrorResponse({ status: 0, error: 'Files not found with request id ' + requestId, statusText: 'Invalid Input' });
            this.fileServiceEvents.emit({ type: 'error', response: this.httpErrorResponse, fileSelectedEventType: 'ALL' });
          }

          break;

        case 'removeAll':
          if (this.queue.length) {
            this.queue = new Array<ISelectedFile>();
            this.fileServiceEvents.emit({ type: 'removedAll', files: this.queue, fileSelectedEventType: 'ALL' });
          }
          break;
      }

      // Temporary taken reference number not in use any where
      if (NgxUploaderDirectiveService.inputEventReferenceNumber !== event.inputReferenceNumber) {
        NgxUploaderDirectiveService.inputEventReferenceNumber = event.inputReferenceNumber;
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

      this.subscriptions.push({ id: upload.files[0].requestId, sub });
      if (this.logs && this.devEnv) {
        console.info('subscriptions ', this.subscriptions);
      }
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
        console.info('Files to Upload', fileList);
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

        const cancelledFiles = this.queue.filter(file => file.requestId === fileList[0].requestId);
        if (cancelledFiles[0].progress.status === 'Cancelled') {
          observer.complete();
        }

        observer.next({ type: 'start', requestId: files[0].requestId, files, fileSelectedEventType: files[0].selectedEventType });

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

                observer.next({ type: 'uploading', requestId: files[0].requestId, files, progress: fileProgress, fileSelectedEventType: files[0].selectedEventType });
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
                observer.next({ type: 'done', requestId: files[0].requestId, response: data, progress, fileSelectedEventType: files[0].selectedEventType, files });
                observer.complete();
                break;
            }
          },
          (error) => {
            // console.log(error);
            observer.next({ type: 'error', requestId: files[0].requestId, response: error, fileSelectedEventType: files[0].selectedEventType });
            observer.complete();
          }
        );
      } else {
        this.httpErrorResponse = new HttpErrorResponse({ status: 0, error: 'Files not available for upload', statusText: 'Invalid Input' });
        observer.next({ type: 'error', requestId: files[0].requestId, response: this.httpErrorResponse });
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
  convertToSelectedFile(file: File, fileIndex: number, id: string, selectedEventType: 'DROP' | 'SELECT'): ISelectedFile {
    // if (this.logs && this.devEnv) {
    //   console.info('Converting file to Input Selected File index: ' + fileIndex, file);
    // }
    return {
      fileIndex,
      requestId: id,
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

  /**
   * Make chunks of array.
   * @param array Array to make chunks.
   * @param chunkSize Chunk size.
   */
  chunkArray(array: Array<any>, chunkSize: number): Array<any> {
    const chunkedArray: Array<any> = new Array<any>();

    let index = 0;
    const arrayLength = array.length;

    for (index = 0; index < arrayLength; index += chunkSize) {
      const myChunk = array.slice(index, index + chunkSize);
      // Do something if you want with the group
      chunkedArray.push(myChunk);
    }

    return chunkedArray;
  }

  /**
   * Group by an Array.
   * @param array Array of objects
   * @param key key
   */
  groupByArray(array: Array<any>, key: string) {
    return array.reduce(
      (previousValue, currentValue) => {
        (previousValue[currentValue[key]] = previousValue[currentValue[key]] || []).push(currentValue);
        return previousValue;
      }, {}
    );
  }
}
