import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SidebarComponent } from "../layout/sidebar/sidebar.component";

import { SidebarService } from '../shared/service/sidebar.service';
import {NavbarMainComponent} from '../layout/navbar-main/navbar-main.component';

@Component({
  selector: 'app-main',
  standalone: true,
  imports: [CommonModule, RouterModule, SidebarComponent, NavbarMainComponent],
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.scss']
})
export class MainComponent {
  sidebarVisible:boolean = true;

  constructor(private sidebarService: SidebarService) {
    this.sidebarService.getSidebarState().subscribe((visible:any) => {
      this.sidebarVisible = visible;
    });
  }
}
