import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SidebarComponent } from "../layout/sidebar/sidebar.component";
import { HeaderComponent } from "../layout/header/header.component";
import { SidebarService } from '../shared/service/sidebar.service';

@Component({
  selector: 'app-main',
  standalone: true,
  imports: [CommonModule, RouterModule, SidebarComponent, HeaderComponent],
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
