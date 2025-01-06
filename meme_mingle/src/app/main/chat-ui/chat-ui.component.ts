import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  NO_ERRORS_SCHEMA,
} from '@angular/core';
import { CommonModule } from '@angular/common';

import { MatTooltipModule } from '@angular/material/tooltip';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule } from '@angular/forms';
import { MarkdownModule } from 'ngx-markdown';
import { HttpClientModule } from '@angular/common/http';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { marked } from 'marked';
import { Avatar3DComponent } from '../avatar3d/avatar3d.component';

import {
  trigger,
  style,
  animate,
  transition,
} from '@angular/animations';

import { Subscription } from 'rxjs';
import { environment } from '../../shared/environments/environment';

import { AppService } from '../../app.service';
import { ChatService } from './chat.service';

interface LipSyncData {
  METADATA: {
    duration: number;
    soundFile: string;
  };
  MOUTH_CUES: Array<{
    start: number;
    end: number;
    value: string;
  }>;
}

interface ConversationMessage {
  sender: 'User' | 'Mentor';
  message: string;
  audioUrl?: string;
  avatarAudio?: string;
  imageUrl?: string;
  file?: { name: string; type: string };
  timestamp: Date;
  htmlContent?: SafeHtml;
  animation?: string;
  facialExpression?: string;
  lipSyncData?: LipSyncData;
}

interface IWindow extends Window {
  SpeechRecognition: any;
  webkitSpeechRecognition: any;
}

interface HistoricalFigure {
  display: string;
  value: string;
  field: string;
}

@Component({
  selector: 'app-chat-ui',
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
    Avatar3DComponent,
  ],
  schemas: [NO_ERRORS_SCHEMA],
  templateUrl: './chat-ui.component.html',
  styleUrls: ['./chat-ui.component.scss'],
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
export class ChatUIComponent implements OnInit, OnDestroy {
  // --- Chat & Speech-Recognition Variables ---
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
  hasLoggedNotAllowedError = false;
  userInputText: string = '';
  selectedFile: File | null = null;
  selectedRole: string = 'Albert Einstein';
  latestMessage: string | null = null;

  historicalFigures: HistoricalFigure[] = [
    { display: 'Ada Lovelace', value: 'Ada Lovelace', field: 'Computer Science' },
    { display: 'Albert Einstein', value: 'Albert Einstein', field: 'Physics' },
    { display: 'Aryabhata', value: 'Aryabhata', field: 'mathematician' },
    { display: 'Galileo Galilei', value: 'Galileo Galilei', field: 'Astronomy' },
    { display: 'Isaac Newton', value: 'Isaac Newton', field: 'Mathematics' },
    { display: 'Leonardo da Vinci', value: 'Leonardo da Vinci', field: 'Art and Science' },
    { display: 'Marie Curie', value: 'Marie Curie', field: 'Chemistry' },
    { display: 'Nikola Tesla', value: 'Nikola Tesla', field: 'Electrical Engineering' },
    { display: 'Thomas Edison', value: 'Thomas Edison', field: 'Inventing' },
  ];

  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;

  constructor(
    private appService: AppService,
    private chatService: ChatService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    this.initializeTheme();
    this.fetchUserProfile();

    // Setup IDs from local storage or chat service
    this.userId = localStorage.getItem('user_id') || 'default_user';
    this.chatId = this.chatService.getChatId() || this.chatService.generateChatId();

    // If you want to skip the overlay by default:
    if (this.selectedRole) {
      this.showOverlay = false; // Hide the overlay
      this.initializeConversation(); // Start the conversation
    } else {
      this.showOverlay = true; // Show overlay if no default mentor is set
    }

    // Speech Recognition Setup
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
      if (event.error === 'not-allowed' && !this.hasLoggedNotAllowedError) {
        console.error('Speech Recognition Error: Microphone access not allowed.');
        alert('Microphone access is not allowed. Please enable microphone permissions in your browser settings.');
        this.hasLoggedNotAllowedError = true;
      }

      if (event.error !== 'not-allowed') {
        console.error('Speech Recognition Error:', event.error);
      }

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

  // -------------------------
  // Chat & Overlay Logic
  // -------------------------
  unlockAudio(): void {
    // "Unlock" audio on iOS/Safari by playing a silent audio
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
    if (!this.selectedRole) {
      console.error('No mentor selected. Cannot initialize conversation.');
      return;
    }
    this.isProcessing = true;
    console.log(`Initializing conversation with role: ${this.selectedRole}`);

    const welcomeSub = this.appService
      .aimentorwelcome(this.userId, this.selectedRole)
      .subscribe({
        next: (response: any) => {
          console.log('Initialize Conversation Response:', response);
          this.chatId = response.chat_id;
          this.chatService.setChatId(this.chatId);
          console.log('Initialize Conversation Response:', response);
          
          const aiMessage = response.text;
          const audioUrl = response.audioUrl;
          const imageUrl = response.imageUrl;
          const animation = response.animation;                  // Extract animation
          const facialExpression = response.facial_expression || response.facialExpression;
          const lipSyncData = response.lip_sync_data || response.lipsync;
          const avatarAudio = response.avatar_audio || response.avatarAudio;
  
        // this.addMessage('Mentor', aiMessage, audioUrl, imageUrl, animation, facialExpression, lipSyncData, avatarAudio);
        // Pass audioUrl and avatarAudio without attempting to play them
        this.addMessage('Mentor', aiMessage, undefined, imageUrl, animation, facialExpression, lipSyncData, avatarAudio);

          // if (audioUrl) {
          //   this.playAudio(audioUrl);
          // }
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

  // -------------------------
  // Speech Recognition
  // -------------------------
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

  stopListening(): void {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
      this.userStopped = true;
    }
  }

  toggleListening(): void {
    if (this.isListening) {
      this.stopListening();
    } else {
      this.startListening();
    }
  }

  // -------------------------
  // Mute / Audio Playback
  // -------------------------
  toggleMute(): void {
    this.isMuted = !this.isMuted;
    this.audio.muted = this.isMuted;
  }

  // playAudio(url: string): void {
  //   if (!url) return;
  //   this.isPlaying = true;
  //   this.audio.src = url;
  //   this.audio.load();
  //   this.audio.muted = this.isMuted;

  //   this.audio
  //     .play()
  //     .then(() => {
  //       if (this.isListening) {
  //         this.recognition.stop();
  //         this.isListening = false;
  //       }
  //     })
  //     .catch((err) => {
  //       console.error('Audio Playback Error:', err);
  //       this.isPlaying = false;
  //     });

  //   this.audio.onended = () => {
  //     this.isPlaying = false;
  //     if (!this.isMuted) {
  //       this.startListening();
  //     }
  //   };
  // }

  // -------------------------
  // Handling Messages
  // -------------------------
  addMessage(
    sender: 'User' | 'Mentor',
    message: string,
    audioUrl?: string,
    imageUrl?: string,
    animation?: string,
    facialExpression?: string,
    lipSyncData?: LipSyncData,
    avatarAudio?: string,
    fileDetails?: { name: string; type: string }
  ): void {

    if (sender === 'User') {
      this.latestMessage = message;
    }

    if (message) { // Ensure message is not undefined or null
      // Convert markdown to HTML
      const rawHtml = marked(message);

      // Sanitize
      const sanitizedHtml = this.sanitizer.bypassSecurityTrustHtml(rawHtml as string);

      console.log(`Message from ${sender}:`, {
        text: message,
        audioUrl,
        imageUrl,
        fileDetails,
        animation,
        facialExpression,
        lipSyncData,
        avatarAudio
      });

      this.conversation.push({
        sender,
        message,
        audioUrl,
        avatarAudio,
        imageUrl,
        animation,
        facialExpression,
        lipSyncData,
        file: fileDetails,
        timestamp: new Date(),
        htmlContent: sanitizedHtml,
      });
    } else {
      console.warn('addMessage called with undefined or null message.');
    }

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

  // -------------------------
  // Sending Text / File
  // -------------------------
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
    } else {
      this.selectedFile = null;
    }
  }

  removeSelectedFile(): void {
    this.selectedFile = null;
  }

  sendTextInput(): void {
    if (this.userInputText.trim() === '' && !this.selectedFile) {
      return; // Do nothing if both fields are empty
    }

    const messageContent = this.userInputText;
    const fileDetails = this.selectedFile
      ? { name: this.selectedFile.name, type: this.selectedFile.type }
      : undefined;

    // Add user's message
    this.addMessage('User', messageContent, undefined, undefined, undefined, undefined, undefined, undefined, fileDetails);

    // Stop any ongoing process
    this.stopListening();
    this.isProcessing = true;

    // Process user input
    this.processUserInput(this.userInputText, this.selectedFile || undefined);

    // Reset input
    this.userInputText = '';
    this.selectedFile = null;
  }

  processUserInput(transcript: string, file?: File): void {
    this.isProcessing = true;
    const chatSub = this.appService
      .aimentorchat(this.userId, this.chatId, this.turnId, transcript, file)
      .subscribe({
        next: (response: any) => {
          console.log('Process User Input Response:', response);

          const aiMessage = response.message;
          const audioUrl = response.audio_url;
          const imageUrl = response.meme_url;
          const animation = response.animation;                  // Extract animation
          const facialExpression = response.facial_expression || response.facialExpression;
          const lipSyncData = response.lip_sync_data || response.lipsync;
          const avatarAudio = response.avatar_audio || response.avatarAudio;


        this.addMessage('Mentor', aiMessage, audioUrl, imageUrl, animation, facialExpression, lipSyncData, avatarAudio);
          // if (audioUrl) {
          //   this.playAudio(audioUrl);
          // }
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

  // -------------------------
  // Child Avatar Event Handler
  // -------------------------
  handleAvatarEvent(eventInfo: string): void {
    console.log('Avatar event received from child:', eventInfo);
    // Here you can update state, log analytics, or do other actions
  }

  // -------------------------
  // Theme + User Profile
  // -------------------------
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

  fetchUserProfile(): void {
    this.appService.getUserProfile().subscribe({
      next: (response) => {
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

get latestMentorMessage(): ConversationMessage | null {
  // Return the newest 'Mentor' message from your conversation array
  return this.conversation
    .filter(msg => msg.sender === 'Mentor')
    .slice(-1)[0];
}

// Removed duplicate property declaration


  // -------------------------
  // Cleanup
  // -------------------------
  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();

    // Stop speech recognition
    if (this.recognition) {
      this.recognition.stop();
    }

    // Stop audio
    if (this.audio) {
      this.audio.pause();
      this.audio.src = '';
    }
  }
}
