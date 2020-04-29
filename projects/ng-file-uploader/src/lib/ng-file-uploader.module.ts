import { NgModule } from '@angular/core';
import { NgFileDropDirective } from './directives/ng-file-drop.directive';
import { NgFileSelectDirective } from './directives/ng-file-select.directive';
import { HttpClientModule } from '@angular/common/http';

@NgModule({
  declarations: [NgFileDropDirective, NgFileSelectDirective],
  imports: [
  ],
  exports: [
    NgFileDropDirective,
    NgFileSelectDirective,
    HttpClientModule
  ]
})
export class NgFileUploaderModule { }
