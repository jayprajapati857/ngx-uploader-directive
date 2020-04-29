import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { NgFileUploaderModule } from 'ng-file-uploader';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    NgFileUploaderModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
