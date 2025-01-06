import { Component, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { SidebarService } from 'src/app/shared/service/sidebar.service';
import { AppService } from '../../app.service';
import { environment } from '../../shared/environments/environment';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss'],
})
export class SidebarComponent implements OnInit {
  sidebarVisible: boolean = true; // Tracks sidebar visibility
  toggleIcon: string = '<';
  userProfilePicture: string = '/assets/img/user_avtar.jpg'; // Default user avatar
  backendUrl = environment.baseUrl; // Backend URL for fetching user profile picture
  totalScore: number = 0;
  preferredLanguage: string = 'en';
  translatedTexts: { [key: string]: string } = {};
  constructor(
    private sidebarService: SidebarService,
    private appService: AppService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    // Subscribe to sidebar state from SidebarService
    this.sidebarService.getSidebarState().subscribe((visible: boolean) => {
      this.sidebarVisible = visible;
    });
    this.preferredLanguage = localStorage.getItem('preferredLanguage') || 'en';

    if (this.preferredLanguage !== 'en') {
      this.translateContent(this.preferredLanguage);
    }
    // Fetch user profile picture
    this.fetchUserProfile();
    this.fetchTotalScore();
  }

  // Translate content to the target language
  private translateContent(targetLanguage: string) {
    const elementsToTranslate = document.querySelectorAll('[data-translate]');
    const textsToTranslate = Array.from(elementsToTranslate).map(
      (el) => el.textContent?.trim() || ''
    );

    // Include additional texts that are not in data-translate attributes
    const additionalTexts = [
      'Toggle Sidebar',
      'New Chat',
      'AI Avatar',
      'Quiz AI',
      'Profile',
      'Logout',
    ];
    const allTextsToTranslate = [...textsToTranslate, ...additionalTexts];

    this.appService
      .translateTexts(allTextsToTranslate, targetLanguage)
      .subscribe((response) => {
        const translations = response.translations;

        // Translate texts from data-translate elements
        elementsToTranslate.forEach((element, index) => {
          const originalText = textsToTranslate[index];
          this.translatedTexts[originalText] = translations[index];

          // Update directly if it's a regular DOM element
          if (!(element.tagName.startsWith('MAT-'))) {
            element.textContent = translations[index];
          }
        });

        // Handle additional texts
        additionalTexts.forEach((text, index) => {
          const translatedText = translations[textsToTranslate.length + index];
          this.translatedTexts[text] = translatedText;
        });
      });
  }
 // Toggles the sidebar visibility
 toggleSidebar(): void {
  this.sidebarVisible = !this.sidebarVisible;
  this.toggleIcon = this.sidebarVisible ? '<' : '>';
  this.sidebarService.toggleSidebar(); // Notify service about the change
}

  // Fetch user profile picture
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

  fetchTotalScore(): void {
    const userId = localStorage.getItem('user_id') || 'default_user';
    
      this.appService.getTotalScore(userId).subscribe({
        next: (response: any) => {
          this.totalScore = response.total_score;
        },
        error: (error: any) => {
          console.error('Error fetching total score:', error);
        },
      });
  }

  // Signs the user out
  signOut(): void {
    this.appService.signOut();
  }

}
