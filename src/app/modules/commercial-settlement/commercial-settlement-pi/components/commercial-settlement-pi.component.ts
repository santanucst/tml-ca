import { Component, OnInit } from '@angular/core';
import { FormGroup, FormControl, Validator, Validators } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs/Subscription';//to get route param
import { ROUTE_PATHS } from '../../../router/router-paths';
import { ComplaintPIRegisterDataService } from '../../../complain/complain-pi/services/complaint-pi-register-data.service';
import { SessionErrorService } from '../../../shared/services/session-error.service';
import { LocalStorageService } from "../../../shared/services/local-storage.service";
import { CommercialSettlementPIDataService } from '../services/commercial-settlement-pi-data.service';

@Component({
    selector: 'ispl-comm-set',
    templateUrl: './commercial-settlement-pi.component.html',
    styleUrls: ['./commercial-settlement-pi.component.css']
})

export class CommercialSettlementPIComponent implements OnInit {

    private routeParam: any = {
        complaintReferenceNo: '',//
        complaintStatus: ''
    }
    private totalCompensationAmount: number = 0;
    public invoiceItemErrFlag: boolean = false;//to check invoice item have error or not
    public commerCialSettlementFromGroup: FormGroup;
    public itemListFormGroup: FormGroup;//to create dynamic formControl for compensation qty n rate
    public errorMsgObj: any = {
        errMsgShowFlag: false,
        errorMsg: ''
    }
    public itemDetails: any[] = [];// to store item deatils from response
    public busySpinner: boolean = false;//to load n stop the spinner
    public commSetlmntLevel: number = 0;//taking a var to maintain the user access

    public previousCommSettDetArr: any[] = [];//to store previous commercial settlement details

    constructor(
        private datePipe: DatePipe,
        private router: Router,
        private activatedroute: ActivatedRoute,
        private localStorageService: LocalStorageService,
        private complaintPIRegisterDataService: ComplaintPIRegisterDataService,
        private sessionErrorService: SessionErrorService,
        private commercialSettlementPIDataService: CommercialSettlementPIDataService
    ) {
        this.commSetlmntLevel = this.localStorageService.user.commSetlmntLevel;
        this.initForm();//init form
        if (this.commSetlmntLevel == 3 || this.commSetlmntLevel == 4) {
            this.commerCialSettlementFromGroup.controls['compensation'].setValidators(Validators.required);
        }
    }
    ngOnInit(): void {
        console.log("Oninit of CommercialSettlementComponent class");
        this.getRouteParam();
    }//end of on init

    /**
     * @description
     */
    private initForm() {
        this.commerCialSettlementFromGroup = new FormGroup({
            complaintReferenceNo: new FormControl(''),
            date: new FormControl(''),
            totalCompensationAmount: new FormControl(''),
            compensation: new FormControl(''),
            remarks: new FormControl('', Validators.required)
        });
        // creating initial formcontrol for itemListFormGroup 
        this.itemListFormGroup = new FormGroup({
            dummyformcontrol: new FormControl(''),
        });
    }//end of method

    private getRouteParam() {
        let routeSubscription: Subscription;
        routeSubscription = this.activatedroute.params.subscribe(params => {
            this.routeParam.complaintReferenceNo = params.complaintReferenceNo ? params.complaintReferenceNo : '';
            this.routeParam.complaintStatus = params.complaintStatus ? params.complaintStatus : '';
            this.routeParam.commsettcount = params.commsettcount ? params.commsettcount : 0;
        });
        this.commerCialSettlementFromGroup.controls["complaintReferenceNo"].setValue(this.routeParam.complaintReferenceNo);

        if (this.routeParam.commsettcount > 0) {
            this.getcommSetViewWSCall();
        } else if (this.routeParam.commsettcount == 0) {
            let date = new Date();
            let currentDate = this.generateDate();
            this.commerCialSettlementFromGroup.controls["date"].setValue(this.datePipe.transform(currentDate, 'dd-MMM-yyyy'));
            this.getInvoiceItemDetailWSCall(this.routeParam.complaintReferenceNo, this.localStorageService.appSettings.complaintRegistrationActivityId);
        }
    }//end of method route param

     //method to generate date
     private generateDate():string {
        let date = new Date();
        let currentDate: string = this.datePipe.transform(date, 'yyyy-MM-dd');
    return currentDate;
    }//end of method

    //method to get commercial settlement details
    private getcommSetViewWSCall() {
        this.busySpinner = true;//to load spinner
        this.commercialSettlementPIDataService.getCommercialSettlementViewDetails(this.routeParam.complaintReferenceNo, this.routeParam.complaintStatus, "PI").
            subscribe(res => {
                if (res.msgType == 'Info') {
                    let json: any = JSON.parse(res.mapDetails);
                    console.log("comm sett view det json::::", json);
                    json.forEach(el => {
                        let prevCommSettJson: any = {};
                        prevCommSettJson.remarks = el.remarks;
                        prevCommSettJson.commercialSettlementDate = this.datePipe.transform(el.commercialSettlementDate, 'dd-MMM-yyyy');
                        switch (el.status) {
                            case 'C': {
                                prevCommSettJson.action = "Requested";
                                break;
                            }
                            case 'A': {
                                prevCommSettJson.action = "Accept";
                                break;
                            }
                            case 'R': {
                                prevCommSettJson.action = "Reject";
                                break;
                            }
                            case 'Q': {
                                prevCommSettJson.action = "Query";
                                break;
                            }
                        }//end of switch 
                        this.previousCommSettDetArr.push(prevCommSettJson);
                    });
                    console.log(this.previousCommSettDetArr);
                    //taking the date value from array
                    let commSettDate: string = this.previousCommSettDetArr[0].commercialSettlementDate;
                    this.commerCialSettlementFromGroup.controls["date"].setValue(this.datePipe.transform(commSettDate, 'dd-MMM-yyyy'));
                    this.getCommSettInvItemDet(this.routeParam.complaintReferenceNo, "PI");
                } else {
                    this.errorMsgObj.errMsgShowFlag = true;
                    this.errorMsgObj.errorMsg = res.msg;
                    this.busySpinner = false;//to stop the spinner
                }
            }, err => {
                console.log(err);
                this.errorMsgObj.errMsgShowFlag = true;
                this.errorMsgObj.errorMsg = err.msg;
                this.busySpinner = false;//to stop the spinner
            });
    }//end of method

    //method to get comm sett inv item
    private getCommSettInvItemDet(compRefNo: string, plantType: string) {
        this.commercialSettlementPIDataService.getInvoiceItemDetail(compRefNo, plantType).
            subscribe(res => {
                if (res.msgType == 'Info') {
                    console.log("Comm Sett Inv Item::", res);
                    let json: any = JSON.parse(res.mapDetails);
                    this.itemDetails = json;
                    this.generateTotalCompensationAmount();//to generate total compensation amount
                    this.createItemFormgroupForSelectedItem();//creating dynamic formcontrol
                    this.busySpinner = false;//to stop the spinner
                } else {
                    this.errorMsgObj.errMsgShowFlag = true;
                    this.errorMsgObj.errorMsg = res.msg;
                    this.busySpinner = false;//to stop the spinner
                }
            }, err => {
                this.errorMsgObj.errMsgShowFlag = true;
                this.errorMsgObj.errorMsg = err.msg;
                this.busySpinner = false;//to stop the spinner
            })
    }//end of method

    //start method getInvoiceItemDetailWSCall to get item details
    private getInvoiceItemDetailWSCall(complaintReferenceNo: string, fileActivityId: number) {
        this.busySpinner = true;//to load the spinner
        this.complaintPIRegisterDataService.getComplaintReferenceDetails(complaintReferenceNo, fileActivityId)
            .subscribe(res => {
                if (res.msgType === "Info") {
                    let itemNos: any = res.details[0].itemNos;
                    this.itemDetails = itemNos.items;
                    this.busySpinner = false;
                    console.log("item details =========.........>>>>>>>>>", this.itemDetails);
                    this.createItemFormgroupForSelectedItem();//creating dynamic formcontrol
                } else {
                    this.errorMsgObj.errMsgShowFlag = true;
                    this.errorMsgObj.errorMsg = res.msg;
                    this.busySpinner = false;//stop the spinner
                }
            },
                err => {
                    console.log(err);
                    this.errorMsgObj.errMsgShowFlag = true;
                    this.errorMsgObj.errorMsg = err.msg;
                    this.busySpinner = false;
                    this.sessionErrorService.routeToLogin(err._body);
                });
    }//end method of getInvoiceItemDetailWSCall

    //method to create dynamic formcontrol
    private createItemFormgroupForSelectedItem() {
        //creating an object for formgroup
        let itmFrmgroup: any = {};
        // iterating arr to creating dynamic formcontrol
        this.itemDetails.forEach(itemel => {
            console.log(" formGroup created");
            //pushing hardcoded compensationQty 
            if (!itemel.compensationQty) {
                itemel.compensationQty = 0;
            }
            if (!itemel.itemRate) {
                itemel.itemRate = 0;
            }
            if (!itemel.settlementCost) {
                itemel.settlementCost = 0;
            }
            //end of pushing hardcoded compensationQty
            // creating key
            let key = itemel.slNo;
            let compensationQtyKey = key + "_" + "compensationQty";
            let itemRateKey = key + "_" + "itemRate";

            //creating dynamic formcontrol
            itemel.compensationQtyKey = compensationQtyKey;
            itemel.itemRateKey = itemRateKey;

            itmFrmgroup[compensationQtyKey] = new FormControl(itemel.compensationQty, Validators.required);
            itmFrmgroup[itemRateKey] = new FormControl(itemel.itemRate, Validators.required);

            //creating formgroup
            this.itemListFormGroup = new FormGroup(itmFrmgroup);
        });
        console.log("ItemArr====", this.itemDetails);
    }//end of the method

    //to generate total compensation amount
    private generateTotalCompensationAmount() {
        this.totalCompensationAmount = 0;
        for (let itemel of this.itemDetails) {
            this.totalCompensationAmount = this.totalCompensationAmount + parseFloat(itemel.settlementCost);
        }//end of for
        // this.totalCompensationAmount = parseFloat(this.totalCompensationAmount.toFixed(2));
        this.commerCialSettlementFromGroup.controls['totalCompensationAmount'].setValue(this.totalCompensationAmount);

    }//end of the method

    //start method of complaintQtyErrorCorrection
    private compensationQtyItemRateErrorCorrection() {
        for (let itemEl of this.itemDetails) {
            if (itemEl.compensationQtyErrFlag || itemEl.itemRateErrFlag) {
                this.invoiceItemErrFlag = true;
                break;
            } else if ((itemEl.compensationQtyErrFlag === false || itemEl.compensationQtyErrFlag === undefined) && (itemEl.itemRateErrFlag === false || itemEl.itemRateErrFlag === undefined)) {
                this.invoiceItemErrFlag = false;
            }
        }//end of for
    }//end of the method complaintQtyErrorCorrection   

    // to change unit dropdown value 17.09.18
    public onCompensationAndItemRateChanges(checkItmParam: any) {
        console.log(" checkItmParam === ", checkItmParam);
        // let qty: number = 0;
        let compensationQty: number = 0;
        let itemRate: number = 0;
        this.itemDetails.forEach(checkItm => {
            if (checkItm.slNo == checkItmParam.slNo) {
                compensationQty = 0;
                itemRate = 0;
                for (let itmList in this.itemListFormGroup.value) {
                    let arr: string[] = itmList.split('_');
                    console.log(" arr ==== ", arr);
                    if (arr.length == 2) {
                        if (arr[0] == checkItmParam.slNo) {
                            console.log(" slno mateched ");
                            if (arr[1] == "compensationQty") {
                                compensationQty = this.itemListFormGroup.controls[itmList].value;
                                if (compensationQty == 0 || compensationQty < 0 || compensationQty == null) {
                                    checkItm.compensationQtyErrFlag = true;
                                    if (compensationQty == 0 || compensationQty == null) {
                                        checkItm.compensationQtyErrDesc = 'Compensation Quantity can′t be zero or empty';
                                    } else if (compensationQty < 0) {
                                        checkItm.compensationQtyErrDesc = 'Compensation Quantity can′t be less than or equal to zero';
                                    }//end of else if
                                } else {
                                    let compQty = checkItmParam.complaintQtyInTons;
                                    let compensQty: string = this.itemListFormGroup.controls[itmList].value;
                                    compQty = parseFloat(compQty);
                                    compensationQty = parseFloat(compensQty);
                                    if (compensationQty > compQty) {
                                        checkItm.compensationQtyErrFlag = true;
                                        checkItm.compensationQtyErrDesc = 'Compensation Quantity can′t be greater than Complaint Quantity';
                                    } else {
                                        checkItm.compensationQty = compensationQty;
                                        checkItm.compensationQtyErrFlag = false;
                                        checkItm.compensationQtyErrDesc = '';
                                    }
                                }//end of else
                                console.log(" got value compensationQty == ", compensationQty);
                            } else if (arr[1] == "itemRate") {
                                itemRate = this.itemListFormGroup.controls[itmList].value;
                                if (itemRate == 0 || itemRate < 0 || itemRate == null) {
                                    checkItm.itemRateErrFlag = true;
                                    if (itemRate == 0 || itemRate == null) {
                                        checkItm.itemRateErrDesc = 'Item Rate can′t be zero or empty';
                                    } else if (itemRate < 0) {
                                        checkItm.itemRateErrDesc = 'Item Rate can′t be less than or equal to zero';
                                    }//end of else if
                                } else {
                                    checkItm.itemRate = itemRate;
                                    checkItm.itemRateErrFlag = false;
                                    checkItm.itemRateErrDesc = '';
                                }//end of else
                                console.log(" got value itemRate == ", itemRate);
                            }
                        }//end if of slno and controlname 1st element
                    }//end if of length to splited array
                }//end of  for loop of itemListFormGroup

                if (compensationQty > 0 && itemRate > 0) {
                    checkItm.settlementCost = compensationQty * itemRate;
                } else {
                    checkItm.settlementCost = 0;
                }
            }//end if of slno check between checkedItemArr element and checked item param element
        });//end of for each loop of checkedItemArr 
        this.compensationQtyItemRateErrorCorrection();
        this.generateTotalCompensationAmount();
        console.log(" itemDetails == ", this.itemDetails);
    }//end of the method 17.09.18

    //commercial settlement submit method
    public commercialSettlementPISubmit() {
        this.busySpinner = true;//to load spinner
        let plantType: string = this.localStorageService.user.plantType;
        let commSetHeaderTableJson: any = {};
        commSetHeaderTableJson.complaintReferenceNo = this.commerCialSettlementFromGroup.value.complaintReferenceNo;
        commSetHeaderTableJson.commercialSettlementTotalAmount = this.commerCialSettlementFromGroup.value.totalCompensationAmount;
        commSetHeaderTableJson.lastActivityId = 10;
        commSetHeaderTableJson.lastStatus = "C";
        commSetHeaderTableJson.userId = this.localStorageService.user.userId;

        let commSettDetailTableJson: any = {};
        commSettDetailTableJson.complaintReferenceNo = this.commerCialSettlementFromGroup.value.complaintReferenceNo;
        let currentDate = this.generateDate();
        commSettDetailTableJson.commercialSettlementDt = currentDate;
        commSettDetailTableJson.activityId = 10;
        commSettDetailTableJson.status = "C";
        commSettDetailTableJson.remarks = this.commerCialSettlementFromGroup.value.remarks;
        commSettDetailTableJson.userId = this.localStorageService.user.userId;        

        if(this.localStorageService.user.commSetlmntLevel == 2){//for cam
            this.commercialSettlementHeaderTableWSCall(commSetHeaderTableJson, commSettDetailTableJson, plantType);
           } else{//for cos/EVP
                commSettDetailTableJson.status = this.commerCialSettlementFromGroup.value.compensation;
                this.commercialSettlementDetailTableWSCall(commSettDetailTableJson, plantType);
           }
    }//end of method

    //method to comm sett header table submit
    commercialSettlementHeaderTableWSCall(commSetHeaderTableJson: any, commSettDetailTableJson: any, plantType: string) {
        this.commercialSettlementPIDataService.putHeader(commSetHeaderTableJson, plantType).
            subscribe(res => {
                if (res.msgType === 'Info') {
                    this.commercialSettlementDetailTableWSCall(commSettDetailTableJson, plantType);
                } else {
                    this.errorMsgObj.errMsgShowFlag = true;
                    this.errorMsgObj.errorMsg = res.msg;
                    this.busySpinner = false;//to stop spinner
                }
            }, err => {
                this.errorMsgObj.errMsgShowFlag = true;
                this.errorMsgObj.errorMsg = err.msg;
                this.busySpinner = false;//to stop spinner
            });
    }//end of method

    //method to detail table submit
    commercialSettlementDetailTableWSCall(commSettDetailTableJson: any, plantType: string) {
        this.commercialSettlementPIDataService.postDetail(commSettDetailTableJson, plantType).
            subscribe(res => {
                if (res.msgType === 'Info') {
                    if (this.localStorageService.user.commSetlmntLevel == 2) {//for cam
                        let itemDet: any[] = [];//to store item det
                        this.itemDetails.forEach((el) => {
                            let itemJson: any = {};
                            itemJson.complaintReferenceNo = this.commerCialSettlementFromGroup.value.complaintReferenceNo;
                            itemJson.slNo = el.slNo;
                            itemJson.invoiceNo = el.invoiceNo;
                            itemJson.itemNo = el.itemCode;
                            itemJson.batchNo = el.batchNo;
                            itemJson.commercialSettlementAutoId = res.valueSub;
                            itemJson.commercialSettlementQty = el.compensationQty;
                            itemJson.commercialSettlementItemRate = el.itemRate;
                            itemJson.commercialSettlementItemAmount = el.settlementCost;
                            itemJson.userId = this.localStorageService.user.userId;

                            itemDet.push(itemJson);//creating item array
                        });                        
                        this.itemDetailsSubmit(itemDet, plantType);//calling the method to submit item det
                    } else {
                        this.router.navigate([ROUTE_PATHS.RouteComplainDIView]);
                    }
                } else {
                    this.errorMsgObj.errMsgShowFlag = true;
                    this.errorMsgObj.errorMsg = res.msg;
                    this.busySpinner = false;//to stop spinner
                }
            }, err => {
                this.errorMsgObj.errMsgShowFlag = true;
                this.errorMsgObj.errorMsg = err.msg;
                this.busySpinner = false;//to stop spinner
            });
    }//end of method

    //method to submit item det
    private itemDetailsSubmit(itemDetArr: any[], plantType: string) {
        this.commercialSettlementPIDataService.postItemDetail(itemDetArr, plantType).
            subscribe(res => {
                if (res.msgType == 'Info') {
                    this.router.navigate([ROUTE_PATHS.RouteComplainPIView]);
                } else {
                    this.errorMsgObj.errMsgShowFlag = true;
                    this.errorMsgObj.errorMsg = res.msg;
                    this.busySpinner = false;//to stop spinner
                }
            }, err => {
                this.errorMsgObj.errMsgShowFlag = true;
                this.errorMsgObj.errorMsg = err.msg;
                this.busySpinner = false;//to stop spinner
            })
    }//end of method

    public onCancel() {
        this.router.navigate([ROUTE_PATHS.RouteComplainPIView]);
    }

    //method to delete err msg
    public deleteResErrorMsgOnClick() {
        this.errorMsgObj.errMsgShowFlag = false;
        this.errorMsgObj.errorMsg = '';
    }

}//end of class