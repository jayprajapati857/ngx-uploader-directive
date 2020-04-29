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
import { Directive, Input, EventEmitter, Output, ElementRef, HostListener } from '@angular/core';
import { IUploadOptions, IUploadInput, IUploadOutput } from '../models/ng-file-uploader-models';
import { Subscription } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { NgFileUploaderService } from '../ng-file-uploader.service';

@Directive({
  // tslint:disable-next-line: directive-selector
  selector: '[ngFileDrop]'
})

export class NgFileDropDirective {

  @Input() options: IUploadOptions;
  @Input() uploadInput: EventEmitter<IUploadInput>;
  @Output() uploadOutput: EventEmitter<IUploadOutput>;

  uploadService: NgFileUploaderService;
  element: HTMLInputElement;

  subscriptions: Array<Subscription>;

  constructor(
    public elementRef: ElementRef,
    private httpClient: HttpClient,
  ) {
    this.uploadOutput = new EventEmitter<IUploadOutput>();
  }

  // tslint:disable-next-line: use-life-cycle-interface
  ngOnInit() {
    this.subscriptions = new Array<Subscription>();
    const concurrency = this.options.requestConcurrency;
    const allowedFileTypes = this.options.allowedFileTypes;
    const maxFileUploads = this.options.maxFileUploads;
    const maxFileSize = this.options.maxFileSize;
    this.uploadService = new NgFileUploaderService(concurrency, this.options.maxFilesToAddInSingleRequest, allowedFileTypes, maxFileUploads, maxFileSize, this.httpClient, this.options.logs);

    // file upload element
    this.element = this.elementRef.nativeElement;

    this.element.addEventListener('drop', this.stopEvent, false);
    this.element.addEventListener('dragenter', this.stopEvent, false);
    this.element.addEventListener('dragover', this.stopEvent, false);

    // Adding events to subscriptions
    this.subscriptions.push(
      this.uploadService.fileServiceEvents.subscribe((event: IUploadOutput) => {
        this.uploadOutput.emit(event);
      })
    );

    if (this.uploadInput instanceof EventEmitter) {
      // console.log('Input emit');
      this.subscriptions.push(this.uploadService.handleInputEvents(this.uploadInput));
    }
  }

  // tslint:disable-next-line: use-life-cycle-interface
  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  stopEvent = (event: Event) => {
    event.stopPropagation();
    event.preventDefault();
  }

  @HostListener('drop', ['$event'])
  public onDrop(event: any) {
    event.stopPropagation();
    event.preventDefault();

    const outputEvent: IUploadOutput = { type: 'drop' };
    this.uploadOutput.emit(outputEvent);
    this.uploadService.handleSelectedFiles(event.dataTransfer.files);
  }

  @HostListener('dragover', ['$event'])
  public onDragOver(event: Event) {
    if (!event) {
      return;
    }

    const outputEvent: IUploadOutput = { type: 'dragOver' };
    this.uploadOutput.emit(outputEvent);
  }

  @HostListener('dragleave', ['$event'])
  public onDragLeave(event: Event) {
    if (!event) {
      return;
    }

    const outputEvent: IUploadOutput = { type: 'dragOut' };
    this.uploadOutput.emit(outputEvent);
  }

}
