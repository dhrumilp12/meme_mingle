import { Component, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AppService } from '../../app.service';
import { environment } from '../../shared/environments/environment';
import { SidebarService } from 'src/app/shared/service/sidebar.service';

@Component({
  selector: 'app-navbar-main',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './navbar-main.component.html',
  styleUrls: ['./navbar-main.component.scss'],
})
export class NavbarMainComponent implements OnInit {
  dropdownOpen = false;
  menuOpen = false;
  userProfilePicture: string = '/assets/img/user_avtar.jpg';
  backendUrl = environment.baseUrl;
  sidebarVisible: boolean = true;

  constructor(
    private appService: AppService,
    private router: Router,
    private sidebarService: SidebarService
  ) {}

  ngOnInit(): void {
    this.fetchUserProfile();

    // Subscribe to sidebar visibility
    this.sidebarService.getSidebarState().subscribe((visible: boolean) => {
      this.sidebarVisible = visible;
    });
  }

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }

  toggleDropdown() {
    this.dropdownOpen = !this.dropdownOpen;
  }

  fetchUserProfile(): void {
    this.appService.getUserProfile().subscribe({
      next: (response) => {
        if (response.profile_picture) {
          this.userProfilePicture = response.profile_picture.startsWith('http')
            ? response.profile_picture
            : `${this.backendUrl}${response.profile_picture}`;
        } else {
          this.userProfilePicture = '/assets/img/user_avtar.jpg';
        }
      },
      error: (error) => {
        console.error('Error fetching user profile:', error);
        this.userProfilePicture = '/assets/img/user_avtar.jpg';
      },
    });
  }

  signOut() {
    this.appService.signOut();
  }

  // Use the sidebar service to toggle the sidebar
  toggleSidebar() {
    this.sidebarService.toggleSidebar();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    const target = event.target as HTMLElement;
    // Close user avatar dropdown if clicked outside
    if (!target.closest('.user-avatar-dropdown') && this.dropdownOpen) {
      this.dropdownOpen = false;
    }
    // Close center links menu if clicked outside
    if (
      !target.closest('.menu-icon') &&
      !target.closest('.center-dropdown-menu') &&
      this.menuOpen
    ) {
      this.menuOpen = false;
    }
  }
}
