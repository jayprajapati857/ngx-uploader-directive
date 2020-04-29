import { NgModule } from '@angular/core';
import { NgxUploaderDropDirective } from './directives/ngx-uploader-drop.directive';
import { NgxUploaderSelectDirective } from './directives/ngx-uploader-select.directive';
import { HttpClientModule } from '@angular/common/http';

@NgModule({
  declarations: [NgxUploaderDropDirective, NgxUploaderSelectDirective],
  imports: [
  ],
  exports: [
    NgxUploaderDropDirective,
    NgxUploaderSelectDirective,
    HttpClientModule
  ]
})
export class NgxUploaderDirectiveModule { }
