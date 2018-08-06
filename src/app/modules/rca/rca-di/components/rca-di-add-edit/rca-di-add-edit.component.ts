import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, Validators, FormControl } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs/Subscription';//to get route param
import { DatePipe } from '@angular/common';
import { NgbModal, NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ROUTE_PATHS } from '../../../../router/router-paths';
import { LocalStorageService } from "../../../../shared/services/local-storage.service";
import { SessionErrorService } from "../../../../shared/services/session-error.service";
import { RCADIService } from "../../services/rca-di-add-edit.service";
import { NgbdModalComponent } from '../../../../widget/modal/components/modal-component';
import { ComplaintDIService } from '../../../../shared/services/complaint-di.service';

@Component({
  selector: 'ispl-rca-di-add-edit',
  templateUrl: 'rca-di-add-edit.component.html',
  styleUrls: ['rca-di-add-edit.component.css']

})
export class RCADIAddEditComponent implements OnInit {

  // form data for file upload
  private formData: FormData = new FormData();
  private totalFileSize: number = 0;//file upload error
  private fileSizeLimit: number = 104857600;
  private fileData: FormData;
  public fileList: FileList;
  public title: string = "RCA";//to show titlee on html page
  public rcaDIAddEditFormGroup: FormGroup;
  public routeParam: any = {
    complaintReferenceNo: '',//to get complaint reference no from route param
    complaintStatus: ''//to fetch complaint status from route
  };
  //for busy spinner
  public busySpinner: boolean = false;
  //for error msg
  public errorMsgObj: any = {
    errorMsg: '',
    errMsgShowFlag: false
  };

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private activatedroute: ActivatedRoute,
    private datePipe: DatePipe,//for date
    private modalService: NgbModal,
    private localStorageService: LocalStorageService,
    private sessionErrorService: SessionErrorService,
    private rCADIService: RCADIService,
    private complaintDIService: ComplaintDIService
  ) {
    this.buildForm();//build form
  }//end of constructor

  ngOnInit(): void {
    console.log("onInit of RCADIAddEditComponent..");
    this.getRouteParam();//calling method to get route param 
    this.getSystemDate();//method to get system date
  }//end of on init

  //a method named buildform for creating the rcaDIAddEditFormGroup and its formControl
  private buildForm(): void {
    this.rcaDIAddEditFormGroup = this.formBuilder.group({
      'complaintReferenceNo': [''
      ],
      'rcaAddEditDate': [''
        , [
          Validators.required,
        ]
      ],
      'rcaAddEditDetails': [''
        , [
          Validators.required,
        ]
      ]
    });
  }//end of method buildForm

  //method to get route param
  private getRouteParam() {
    let routeSubscription: Subscription;
    routeSubscription = this.activatedroute.params.subscribe(params => {
      this.routeParam.complaintReferenceNo = params.complaintReferenceNo ? params.complaintReferenceNo : '';
      this.routeParam.complaintStatus = params.complaintStatus ? params.complaintStatus : '';
    });
    console.log("complaintReferenceNo for rca di add/edit: ", this.routeParam.complaintReferenceNo);
    console.log("this.complaintStatus for rca di view::", this.routeParam.complaintStatus);
    this.rcaDIAddEditFormGroup.controls['complaintReferenceNo'].setValue(this.routeParam.complaintReferenceNo);
  }//end of method

  //method to get system date
  private getSystemDate() {
    //formatting the current date
    let date = new Date();
    let currentDate: string = this.datePipe.transform(date, 'yyyy-MM-dd');
    this.rcaDIAddEditFormGroup.controls["rcaAddEditDate"].setValue(currentDate);
  }//end of method

  //onOpenModal for opening modal from modalService
  private onOpenModal(modalMsg) {
    const modalRef = this.modalService.open(NgbdModalComponent);
    modalRef.componentInstance.modalTitle = 'Information';
    modalRef.componentInstance.modalMessage = modalMsg;
  }
  //end of method onOpenModal

  //file upload event  
  public fileChangeRCADIAddEdit(event) {
    this.fileData = new FormData();
    this.totalFileSize = 0;
    this.fileList = event.target.files;
    if (this.fileList.length > 0) {
      for (let i: number = 0; i < this.fileList.length; i++) {
        let file: File = this.fileList[i];
        this.fileData.append('uploadFile' + i.toString(), file, file.name);
        this.totalFileSize = this.totalFileSize + file.size;
        console.log("this.totalFileSize:::::::::::", this.totalFileSize);
      }//end of for
    }//end of if
  }//end of filechange method 

  //method of submit modify allocate complaint
  public onRCADIAddEditRejectSubmit(rcaAcceptReject: string) {
    this.busySpinner = true;//to load spinner
    console.log("form value of rca DI add/modify/reject submit : ", this.rcaDIAddEditFormGroup.value);
    let rcaDIAddEditSubmitDet: any = {};
    let rcaWsInfo: any = {};
    rcaWsInfo.activityId = 50;
    rcaWsInfo.plantType = this.localStorageService.user.plantType;
    rcaWsInfo.action = "";
    let rcaJsonForHeaderTable: any = {};
    rcaJsonForHeaderTable.lastActivityId = rcaWsInfo.activityId;
    rcaJsonForHeaderTable.userId = this.localStorageService.user.userId;
    rcaJsonForHeaderTable.complaintReferenceNo = this.rcaDIAddEditFormGroup.value.complaintReferenceNo;
    console.log("rca json for header table::", rcaJsonForHeaderTable);
    let rcaJsonForDetTable: any = {};
    rcaJsonForDetTable.activityId = rcaWsInfo.activityId;
    rcaJsonForDetTable.complaintReferenceNo = this.rcaDIAddEditFormGroup.value.complaintReferenceNo;
    rcaJsonForDetTable.rootCauseAnanysisRemarks = this.rcaDIAddEditFormGroup.value.paAddEditDetails;
    rcaJsonForDetTable.rootCauseAnanysisDate = this.rcaDIAddEditFormGroup.value.paAddEditDate;
    rcaJsonForDetTable.userId = this.localStorageService.user.userId;
    console.log("rca json for Det table::", rcaJsonForDetTable);
    this.complaintDIService.putHeader(rcaJsonForHeaderTable, rcaWsInfo.plantType, rcaWsInfo.action).
      subscribe(res => {
        if (res.msgType === 'Info') {
          this.complaintDIService.postDetail(rcaJsonForDetTable, rcaWsInfo.plantType, rcaWsInfo.action).
            subscribe(res => {
              if (res.msgType === 'Info') {
                console.log(" rca Det submitted successfully");
                this.onOpenModal(res.msg);//open modal to show the msg
                this.router.navigate([ROUTE_PATHS.RouteComplainDIView]);
              } else {
                this.errorMsgObj.errMsgShowFlag = true;
                this.errorMsgObj.errorMsg = res.msg;
              }
              this.busySpinner = false;//to stop spinner
            },
              err => {
                console.log(err);
                this.errorMsgObj.errMsgShowFlag = true;
                this.errorMsgObj.errorMsg = err.msg;
                this.busySpinner = false;//to stop spinner
                this.sessionErrorService.routeToLogin(err._body);
              });
        } else {
          this.errorMsgObj.errMsgShowFlag = true;
          this.errorMsgObj.errorMsg = res.msg;
          this.busySpinner = false;//to stop spinner
        }
      },
        err => {
          console.log(err);
          this.busySpinner = false;//to stop spinner
          this.errorMsgObj.errMsgShowFlag = true;
          this.errorMsgObj.errorMsg = err.msg;
          this.sessionErrorService.routeToLogin(err._body);
        });

  } //end of method submit modify capa actn pi

  //for clicking cancel button this method will be invoked
  public onCancel(): void {
    this.router.navigate([ROUTE_PATHS.RouteHome]);
  }// end of onCancel method

  //method to delete error msg
  public deleteResErrorMsgOnClick() {
    this.errorMsgObj.errMsgShowFlag = false;
    this.errorMsgObj.errorMsg = "";
  }//end of method delete error msg
}//end of class