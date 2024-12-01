import { Component, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AppService } from '../../app.service';
import { environment } from '../../shared/environments/environment';
@Component({
  selector: 'app-navbar-main',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './navbar-main.component.html',
  styleUrls: ['./navbar-main.component.scss'],
})
export class NavbarMainComponent implements OnInit {
  dropdownOpen = false;
  userProfilePicture: string = '/assets/img/user_avtar.jpg'; 
  menuOpen = false;
  backendUrl = environment.baseUrl;
  constructor(private appService: AppService, private router: Router) {}

  ngOnInit(): void {
    this.fetchUserProfile();
  }

  toggleDropdown() {
    this.dropdownOpen = !this.dropdownOpen;
  }
  toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }

  fetchUserProfile(): void {
    this.appService.getUserProfile().subscribe({
      next: (response) => {
        console.log('User profile:', response);
        if (response.profile_picture) {
          this.userProfilePicture = response.profile_picture.startsWith('http') 
            ? response.profile_picture 
            : `${this.backendUrl}${response.profile_picture}`;
          console.log('User profile picture:', this.userProfilePicture);
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
