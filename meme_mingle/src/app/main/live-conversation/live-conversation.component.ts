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
  file?: { name: string; type: string };
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
  field: string;
  imageUrl?: string; // Add the imageUrl property
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
  selectedRole: string = ''; 
  selectedRoleImageUrl: string = 'assets/img/banner.png';
  preferredLanguage: string = 'en';
  translatedTexts: { [key: string]: string } = {};
  historicalFigures: HistoricalFigure[] = [
    { imageUrl:'assets/roles/Ada_Lovelace.png', display: 'Ada Lovelace', value: 'Ada Lovelace', field: 'Computer Science' },
    { imageUrl:'assets/roles/Albert_Einstein.jpg', display: 'Albert Einstein', value: 'Albert Einstein', field: 'Physics' },
    { imageUrl:'assets/roles/Aryabhatta.jpg', display: 'Aryabhatta', value: 'Aryabhatta', field: 'mathematician' },
    { imageUrl:'assets/roles/Galileo_Galilei.jpg',display: 'Galileo Galilei', value: 'Galileo Galilei', field: 'Astronomy' },
    { imageUrl:'assets/roles/Isaac_Newton.png', display: 'Isaac Newton', value: 'Isaac Newton', field: 'Mathematics' },
    { imageUrl:'assets/roles/Leonardo_da_Vinci.jpg',display: 'Leonardo da Vinci', value: 'Leonardo da Vinci', field: 'Art and Science' },
    { imageUrl:'assets/roles/Marie_Curie.jpg',display: 'Marie Curie', value: 'Marie Curie', field: 'Chemistry' },
    { imageUrl:'assets/roles/Nikola_Tesla.jpg',display: 'Nikola Tesla', value: 'Nikola Tesla', field: 'Electrical Engineering' },
    { imageUrl:'assets/roles/Thomas_Edison.jpg',display: 'Thomas Edison', value: 'Thomas Edison', field: 'Inventing' },
    // Add more figures as needed
  ];
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;

  constructor(private appService: AppService, private chatService: ChatService,private sanitizer: DomSanitizer) {}

  ngOnInit(): void {
    this.initializeTheme();
    this.fetchUserProfile();
    this.userId = localStorage.getItem('user_id') || 'default_user';
    this.chatId = this.chatService.getChatId() || this.chatService.generateChatId();
    this.preferredLanguage = localStorage.getItem('preferredLanguage') || 'en';

    if (this.preferredLanguage !== 'en') {
      this.translateContent(this.preferredLanguage);
    }

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

  // Translate content to the target language
  private translateContent(targetLanguage: string) {
    const elementsToTranslate = document.querySelectorAll('[data-translate]');
    const textsToTranslate = Array.from(elementsToTranslate).map(
      (el) => el.textContent?.trim() || ''
    );

    // Include additional texts that are not in data-translate attributes
    const additionalTexts = [
    'Welcome to AI Chat',
    'Choose a historical figure to inspire your conversation.',
    'Select Your Mentor',
    'Start Conversation',
    'Ada Lovelace', 
    'Albert Einstein',
    'Aryabhatta',
    'Galileo Galilei', 
    'Isaac Newton', 
    'Leonardo da Vinci', 
    'Marie Curie', 
    'Nikola Tesla', 
    'Thomas Edison', 
    'Astronomy',
    'Art and Science',
    'Electrical Engineering',
    'Inventing',
    'mathematician',
    'Type your message here...',
    'Pause Listening',
    'Resume Listening',
    'File upload',
    'New Conversation',
    'Unmute',
    'Mute',
    'Replay Audio',
    'Mathematics',
    'Physics',
    'Chemistry',
    'Computer Science',
    'AI is speaking...',
    'AI is listening...',
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

  addMessage(sender: 'User' | 'Mentor', message: string, audioUrl?: string, imageUrl?: string, fileDetails?: { name: string; type: string }): void {
    // Convert markdown to HTML
    const rawHtml = marked(message);
    // Sanitize HTML to prevent XSS attacks
    const sanitizedHtml = this.sanitizer.bypassSecurityTrustHtml(rawHtml as string);
  
    this.conversation.push({
      sender,
      message,
      audioUrl,
      imageUrl,
      file: fileDetails,
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

  removeSelectedFile(): void {
    this.selectedFile = null; // Reset the selected file
  }

  // New method to send text input and file
  sendTextInput(): void {
    if (this.userInputText.trim() === '' && !this.selectedFile) {
      return; // Do nothing if both fields are empty
    }

    const messageContent = this.userInputText;
    const fileDetails = this.selectedFile
    ? { name: this.selectedFile.name, type: this.selectedFile.type }
    : undefined;

    // Add user's message to the conversation
    this.addMessage('User', messageContent, undefined, undefined, fileDetails);

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
          console.log('response:', response);
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


  updateSelectedRoleImage(event: any): void {
    const selectedFigure = this.historicalFigures.find(figure => figure.value === event.value);
    this.selectedRoleImageUrl = selectedFigure?.imageUrl || 'assets/img/banner.png';
  }
  
}
