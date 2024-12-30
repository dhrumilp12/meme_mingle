import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { AppService } from '../../app.service';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { environment } from '../../shared/environments/environment';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatButtonModule } from '@angular/material/button';
import { NavbarMainComponent } from '../../layout/navbar-main/navbar-main.component';
import { FormsModule } from '@angular/forms';
import { MarkdownModule } from 'ngx-markdown';
import { HttpClientModule } from '@angular/common/http';
import { marked } from 'marked';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { MatFormFieldModule } from '@angular/material/form-field'; 
import { MatSelectModule } from '@angular/material/select'; 
import {
  trigger,
  style,
  animate,
  transition,
} from '@angular/animations';
import { ChatService } from './chat.service';
interface ConversationMessage {
  sender: 'User' | 'Mentor';
  message: string;
  audioUrl?: string;
  imageUrl?: string;
  timestamp: Date;
  htmlContent?: SafeHtml;
}

interface IWindow extends Window {
  SpeechRecognition: any;
  webkitSpeechRecognition: any;
}

interface HistoricalFigure {
  display: string;
  value: string;
}

@Component({
  selector: 'app-live-conversation',
  standalone: true,
  imports: [
    CommonModule,
    MatTooltipModule,
    MatIconModule,
    MatProgressBarModule,
    MatButtonModule,
    NavbarMainComponent,
    FormsModule,
    HttpClientModule, 
    MarkdownModule, 
    MatFormFieldModule, 
    MatSelectModule,    
  ],
  templateUrl: './live-conversation.component.html',
  styleUrls: ['./live-conversation.component.scss'],
  animations: [
    trigger('messageAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate(
          '300ms ease-out',
          style({ opacity: 1, transform: 'translateY(0)' })
        ),
      ]),
    ]),
    trigger('fadeInOut', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('300ms ease-in', style({ opacity: 1 })),
      ]),
      transition(':leave', [
        animate('300ms ease-out', style({ opacity: 0 })),
      ]),
    ]),
    trigger('buttonClick', [
      transition('* => active', [
        animate(
          '200ms',
          style({ transform: 'scale(0.9)', offset: 0.5 })
        ),
        animate('200ms', style({ transform: 'scale(1)' })),
      ]),
    ]),
    trigger('overlayAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-20%)' }),
        animate(
          '500ms ease-out',
          style({ opacity: 1, transform: 'translateY(0)' })
        ),
      ]),
      transition(':leave', [
        animate(
          '500ms ease-in',
          style({ opacity: 0, transform: 'translateY(-20%)' })
        ),
      ]),
    ]),
    trigger('statusAnimation', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('300ms ease-in', style({ opacity: 1 })),
      ]),
      transition(':leave', [
        animate('300ms ease-out', style({ opacity: 0 })),
      ]),
    ]),
  ],
})
export class LiveConversationComponent implements OnInit, OnDestroy {
  recognition: any;
  isListening = false;
  isProcessing = false;
  isPlaying = false;
  conversation: ConversationMessage[] = [];
  userId = 'default_user';
  chatId = '1';
  turnId = 0;
  audio = new Audio();
  subscriptions = new Subscription();
  showOverlay = true;
  backendUrl = environment.baseUrl;
  isDarkMode = false;
  isMuted = false;
  userStopped = false;
  userProfilePicture: string = '';
  userInputText: string = '';
  selectedFile: File | null = null;
  selectedRole: string = ''; // New property to hold the selected role
  historicalFigures: HistoricalFigure[] = [ // Define historical figures
    { display: 'Albert Einstein', value: 'Albert Einstein' },
    { display: 'Isaac Newton', value: 'Isaac Newton' },
    { display: 'Marie Curie', value: 'Marie Curie' },
    { display: 'Leonardo da Vinci', value: 'Leonardo da Vinci' },
    { display: 'Nikola Tesla', value: 'Nikola Tesla' },
    { display: 'Ada Lovelace', value: 'Ada Lovelace' },
    { display: 'Galileo Galilei', value: 'Galileo Galilei' },
    { display: 'Thomas Edison', value: 'Thomas Edison' },
    // Add more figures as needed
  ];
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;

  constructor(private appService: AppService, private chatService: ChatService,private sanitizer: DomSanitizer) {}

  ngOnInit(): void {
    this.initializeTheme();
    this.fetchUserProfile();
    this.userId = localStorage.getItem('user_id') || 'default_user';
    this.chatId = this.chatService.getChatId() || this.chatService.generateChatId();


    const windowObj = window as unknown as IWindow;
    const SpeechRecognition =
      windowObj.SpeechRecognition || windowObj.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert(
        'Your browser does not support Speech Recognition. Please try a different browser.'
      );
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.lang = 'en-US';
    this.recognition.continuous = false;
    this.recognition.interimResults = false;

    this.recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript.trim();
      if (transcript) {
        this.addMessage('User', transcript);
        this.processUserInput(transcript);
      }
    };

    this.recognition.onerror = (event: any) => {
      console.error('Speech Recognition Error:', event.error);
      this.isListening = false;
      this.isProcessing = false;
    };

    this.recognition.onend = () => {
      this.isListening = false;
      if (!this.isProcessing && !this.userStopped) {
        this.startListening();
      }
    };
  }

  finalizeChat(): void {
    if (
      confirm(
        'Are you sure you want to end the conversation? This will finalize the chat session.'
      )
    ) {
      this.isProcessing = true;
      const finalizeSub = this.appService
        .finalizeChat(this.userId, this.chatId)
        .subscribe({
          next: () => {
            this.addMessage(
              'Mentor',
              'Thank you for chatting! If you need further assistance, feel free to start a new conversation.'
            );
            this.isProcessing = false;
            this.stopListening();
            this.showOverlay = true;
            this.chatService.clearChatId();
          },
          error: (error: any) => {
            console.error('Error finalizing chat:', error);
            this.isProcessing = false;
          },
        });
      this.subscriptions.add(finalizeSub);
    }
  }

  stopListening(): void {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
      this.userStopped = true;
    }
  }

  startListening(): void {
    if (this.isListening || this.isProcessing || this.isPlaying) return;
    try {
      this.recognition.start();
      this.isListening = true;
      this.userStopped = false;
    } catch (error) {
      console.error('Failed to start recognition:', error);
    }
  }

  toggleListening(): void {
    if (this.isListening) {
      this.stopListening();
    } else {
      this.startListening();
    }
  }

  toggleMute(): void {
    this.isMuted = !this.isMuted;
    this.audio.muted = this.isMuted;
  }

  playAudio(url: string): void {
    if (!url) return;
    this.isPlaying = true;
    this.audio.src = url;
    this.audio.load();
    this.audio.muted = this.isMuted;

    this.audio
      .play()
      .then(() => {
        if (this.isListening) {
          this.recognition.stop();
          this.isListening = false;
        }
      })
      .catch((err) => {
        console.error('Audio Playback Error:', err);
        this.isPlaying = false;
      });

    this.audio.onended = () => {
      this.isPlaying = false;
      if (!this.isMuted) {
        this.startListening();
      }
    };
  }

  unlockAudio(): void {
    const silentAudio = new Audio();
    silentAudio.src =
      'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=';
    silentAudio
      .play()
      .then(() => {
        silentAudio.pause();
        this.showOverlay = false;
        this.initializeConversation();
      })
      .catch((error: any) => {
        console.error('Audio Unlock Error:', error);
      });
  }

  initializeConversation(): void {
    this.isProcessing = true;
    const welcomeSub = this.appService.aimentorwelcome(this.userId, this.selectedRole).subscribe({
      next: (response: any) => {
        this.chatId = response.chat_id;
        this.chatService.setChatId(this.chatId);
        console.log('response:', response);
        const aiMessage = response.message.message;
        const audioUrl = response.message.audio_url;
        const imageUrl = response.message.meme_url; // Assuming your backend returns image_url
        this.addMessage('Mentor', aiMessage, audioUrl, imageUrl);
        if (audioUrl) {
          this.playAudio(audioUrl);
        }
        this.isProcessing = false;
        this.startListening();
      },
      error: (error: any) => {
        console.error('Error fetching initial greeting:', error);
        this.isProcessing = false;
      },
    });
    this.subscriptions.add(welcomeSub);
  }

  addMessage(sender: 'User' | 'Mentor', message: string, audioUrl?: string,imageUrl?: string): void {
    // Convert markdown to HTML
    const rawHtml = marked(message);
    // Sanitize HTML to prevent XSS attacks
    const sanitizedHtml = this.sanitizer.bypassSecurityTrustHtml(rawHtml as string);
  
    this.conversation.push({
      sender,
      message,
      audioUrl,
      imageUrl,
      timestamp: new Date(),
      htmlContent: sanitizedHtml, // Use sanitized HTML
    });
    this.scrollToBottom();
  }

  scrollToBottom(): void {
    setTimeout(() => {
      if (this.messagesContainer) {
        this.messagesContainer.nativeElement.scrollTop =
          this.messagesContainer.nativeElement.scrollHeight;
      }
    }, 100);
  }

  generateChatId(): string {
    return Date.now().toString();
  }

  toggleTheme(): void {
    this.isDarkMode = !this.isDarkMode;
    localStorage.setItem('theme', this.isDarkMode ? 'dark' : 'light');
  }

  initializeTheme(): void {
    const theme = localStorage.getItem('theme');
    if (theme === 'dark') {
      this.isDarkMode = true;
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    if (this.recognition) {
      this.recognition.stop();
    }
    if (this.audio) {
      this.audio.pause();
      this.audio.src = '';
    }
  }

  fetchUserProfile(): void {
    this.appService.getUserProfile().subscribe({
      next: (response) => {
        
        // Construct the full URL for the profile picture
        if (response.profile_picture) {
          this.userProfilePicture = response.profile_picture.startsWith('http') 
            ? response.profile_picture 
            : `${this.backendUrl}${response.profile_picture}`;
          console.log('User profile picture:', this.userProfilePicture);
        } else {
          this.userProfilePicture = '/assets/img/user_avtar.jpg'; // Fallback image
        }
      },
      error: (error) => {
        console.error('Error fetching user profile:', error);
        this.userProfilePicture = '/assets/img/user_avtar.jpg'; // Fallback image
      },
    });
  }
  // New method to handle file selection
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
    } else {
      this.selectedFile = null;
    }
  }

  // New method to send text input and file
  sendTextInput(): void {
    if (this.userInputText.trim() === '' && !this.selectedFile) {
      return; // Do nothing if both fields are empty
    }

    // Add user's message to the conversation
    this.addMessage('User', this.userInputText);

    // Stop any ongoing processes
    this.stopListening();
    this.isProcessing = true;

    // Call the backend service
    this.processUserInput(this.userInputText, this.selectedFile || undefined);

    // Reset input fields
    this.userInputText = '';
    this.selectedFile = null;
  }

  processUserInput(transcript: string, file?: File): void {
    this.isProcessing = true;
    const chatSub = this.appService
      .aimentorchat(this.userId, this.chatId, this.turnId, transcript, file)
      .subscribe({
        next: (response: any) => {
          const aiMessage = response.message;
          const audioUrl = response.audio_url;
          const imageUrl = response.meme_url;

          this.addMessage('Mentor', aiMessage, audioUrl, imageUrl);
          if (audioUrl) {
            this.playAudio(audioUrl);
          }
          this.turnId += 1;
          this.isProcessing = false;
        },
        error: (error: any) => {
          console.error('Error processing user input:', error);
          this.isProcessing = false;
          this.startListening();
        },
      });
    this.subscriptions.add(chatSub);
  }
}
