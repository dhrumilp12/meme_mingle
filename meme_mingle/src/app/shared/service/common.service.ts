import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { HttpService } from './http.service';
import { API } from '../constant/api.constant';

@Injectable({
  providedIn: 'root',
})
export class CommonService {
  localStorageList: any;

  showToastMessage(toastType: any, toastMsg: any) {
    // this.toastType$.next(toastType);
    // this.toastMsg$.next(toastMsg);
    // this.toastShow$.next(true);

    // setTimeout(() => {
    //   this.closeToast();
    // }, 3000);
  }

 
  
  
}
