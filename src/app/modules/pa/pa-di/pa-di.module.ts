import { NgModule }            from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { BusySpinnerModule } from 'app/modules/widget/busy-spinner/busy-spinner.module';
import { DatePipe } from '@angular/common';
import { SharedModule } from 'app/modules/shared/shared.module';
import { PADIAddEditComponent } from '../pa-di/components/pa-di-add-edit/pa-di-add-edit.component';
import { PADIService } from '../pa-di/services/pa-di-add-edit.service';
import { PADIViewDetailsComponent } from '../pa-di/components/pa-di-view-details/pa-di-view-details.component';
@NgModule({
  imports:      [
    ReactiveFormsModule,
    CommonModule,
    BrowserModule,
    BusySpinnerModule,
    SharedModule
  ],
  declarations: [
    PADIAddEditComponent,//add/edit
    PADIViewDetailsComponent//view
  ],
  
  exports: [
    PADIAddEditComponent,//add/edit
    PADIViewDetailsComponent//view
  ],
  providers : [    
    DatePipe,  
    PADIService//service  
  ]
})
export class PADIModule { }