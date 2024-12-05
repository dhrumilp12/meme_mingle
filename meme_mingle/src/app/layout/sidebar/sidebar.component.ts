import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SidebarService } from 'src/app/shared/service/sidebar.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule ,RouterModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent {
  sidebarVisible: boolean = true; // Default to true or manage initial state

  constructor(private sidebarService: SidebarService) { }

  ngOnInit(): void {
    this.sidebarService.getSidebarState().subscribe((visible:any) => {
      this.sidebarVisible = visible;
    });
  }

  // Toggle sidebar visibility
  toggleSidebar() {
    this.sidebarService.toggleSidebar();
  }
}
