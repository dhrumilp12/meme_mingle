import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SidebarService {

  private sidebarVisible = new BehaviorSubject<boolean>(true);
  private sidebarState$: Observable<boolean> = this.sidebarVisible.asObservable();

  constructor() {}

  toggleSidebar() {
    this.sidebarVisible.next(!this.sidebarVisible.value);
  }

  getSidebarState(): Observable<boolean> {
    return this.sidebarState$;
  }
}
