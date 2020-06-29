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

import { HttpResponse, HttpErrorResponse } from '@angular/common/http';

/**
 * File Upload Options.
 */
export interface IUploadOptions {
    requestConcurrency: number; // Number of request can be made at a time.
    maxFilesToAddInSingleRequest: number; // Number of files uploaded in single.
    allowedFileTypes?: Array<string>; // Allowed file content types.
    maxFileUploads?: number; // Max number of files that user can upload
    maxFileSize?: number; // Max size of the file in bytes that user can upload.
    logs?: boolean; // Flag to show the library logs. Default false
}

/**
 * Selected File Object.
 */
export interface ISelectedFile {
    requestId: string; // File request id generated by library.
    fileIndex: number; // file index of selected files.
    name: string; // Name of file.
    type: string; // Type of file.
    selectedEventType: 'DROP' | 'SELECT'; // Type of selection of file.
    progress?: IUploadProgress; // File upload Progress.
    nativeFile?: File; // Native File.
    response?: any; // Response for the selected file.
}

/**
 * File Upload Progress.
 */
export interface IUploadProgress {
    status: 'Queue' | 'Uploading' | 'Done' | 'Cancelled'; // Progress stauts.
    data?: {
        percentage: number; // Progress percentage.
        speed: number; // Progress speed.
        speedHuman: string; // Progress spped human.
        startTime: number | null; // Progress start time.
        endTime: number | null; // Progress end time.
        eta: number | null; // Progress eta.
        etaHuman: string | null; // Progress eta human.
    }; // Upload progress data.
}

/**
 * Upload Input events that can be emit to ngx-uploader-directive.
 */
export interface IUploadInput {
    type: 'uploadAll' | 'uploadFile' | 'cancel' | 'cancelAll' | 'remove' | 'removeAll'; // Input event type.
    /**
     * Input unique reference number to evalueate unique events.
     * Generate using Math.random().
     */
    inputReferenceNumber?: number; // Generate number using Math.random() and set it here.
    url?: string; // Input url.
    method?: string; // Input method.
    requestId?: string; // Input id of file to upload.
    fieldName?: string; // Input field name.
    fileIndex?: number; // Input file index to upload.
    file?: ISelectedFile; // Input array selected file.
    data?: { [key: string]: string | Blob }; // Input data to pass with file.
    headers?: { [key: string]: string }; // Input headers to pass with upload request.
}

/**
 * File Upload Output Events that emitted by ngx-uploader-directive.
 */
export interface IUploadOutput {
    type: 'init' | 'addedToQueue' | 'allAddedToQueue' | 'uploading' | 'done' | 'start' | 'cancelled' | 'dragOver'
    | 'dragOut' | 'drop' | 'removed' | 'removedAll' | 'rejected' | 'error'; // Output events.
    requestId?: string; // id of selected file.
    files?: Array<ISelectedFile>; // array selected file.
    fileSelectedEventType?: 'DROP' | 'SELECT' | 'ALL'; // Type of selection of file.
    progress?: IUploadProgress; // Progress
    response?: any; // File upload api response.
}
