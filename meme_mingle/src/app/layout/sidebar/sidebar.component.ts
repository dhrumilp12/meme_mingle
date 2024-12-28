import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SidebarService } from 'src/app/shared/service/sidebar.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss'],
})
export class SidebarComponent implements OnInit {
  sidebarVisible: boolean = true;

  constructor(private sidebarService: SidebarService) {}

  ngOnInit(): void {
    this.sidebarService.getSidebarState().subscribe((visible: boolean) => {
      this.sidebarVisible = visible;
    });
  }

  toggleSidebar() {
    this.sidebarService.toggleSidebar();
  }
}
