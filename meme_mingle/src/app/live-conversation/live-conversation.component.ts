import { Component, OnInit, OnDestroy } from '@angular/core';
import { AppService } from '../app.service';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { environment } from '../shared/environments/environment';
import { MatTooltipModule } from '@angular/material/tooltip'; // Import MatTooltipModule

interface ConversationMessage {
  sender: 'You' | 'AI';
  message: string;
  audioUrl?: string;
  timestamp: Date;
}

interface IWindow extends Window {
  SpeechRecognition: any;
  webkitSpeechRecognition: any;
}

@Component({
  selector: 'app-live-conversation',
  standalone: true,
  imports: [CommonModule, MatTooltipModule], // Include MatTooltipModule
  templateUrl: './live-conversation.component.html',
  styleUrls: ['./live-conversation.component.scss']
})
export class LiveConversationComponent implements OnInit, OnDestroy {
  recognition: any;
  isListening: boolean = false;
  isProcessing: boolean = false;
  isPlaying: boolean = false;
  conversation: ConversationMessage[] = [];
  userId: string = 'default_user';
  chatId: string = '1';
  turnId: number = 0;
  audio: HTMLAudioElement = new Audio();
  subscriptions: Subscription = new Subscription();
  showOverlay: boolean = true; // Controls the visibility of the overlay
  backendUrl: string = environment.baseUrl; // Backend base URL
  isDarkMode: boolean = false; // Dark mode flag

  constructor(private appService: AppService) { }

  ngOnInit(): void {
    // Initialize userId and chatId from localStorage or default values
    this.userId = localStorage.getItem('user_id') || 'default_user';
    this.chatId = localStorage.getItem('chat_id') || this.generateChatId();
    localStorage.setItem('chat_id', this.chatId);

    // Initialize Speech Recognition
    const windowObj = window as unknown as IWindow;
    const SpeechRecognition = windowObj.SpeechRecognition || windowObj.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Your browser does not support Speech Recognition. Please try a different browser.');
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.lang = 'en-US';
    this.recognition.continuous = false;
    this.recognition.interimResults = false;

    this.recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript.trim();
      if (transcript) {
        this.addMessage('You', transcript);
        this.processUserInput(transcript);
      }
    };

    this.recognition.onerror = (event: any) => {
      console.error('Speech Recognition Error:', event.error);
      alert(`Speech Recognition Error: ${event.error}`);
      this.isListening = false;
      this.isProcessing = false;
    };

    this.recognition.onend = () => {
      this.isListening = false;
      // Automatically start listening again if not processing
      if (!this.isProcessing) {
        this.startListening();
      }
    };
  }

  /**
   * Handles the unlocking of audio playback by the user.
   */
  unlockAudio(): void {
    // Start a silent audio to unlock playback
    const silentAudio = new Audio();
    silentAudio.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=';
    silentAudio.play().then(() => {
      silentAudio.pause();
      this.showOverlay = false;
      this.initializeConversation();
    }).catch((error: any) => {
      console.error('Audio Unlock Error:', error);
      alert('Failed to unlock audio playback.');
    });
  }

  /**
   * Initializes the conversation by fetching the initial AI greeting.
   */
  initializeConversation(): void {
    this.isProcessing = true;
    const welcomeSub = this.appService.aimentorwelcome(this.userId)
      .subscribe({
        next: (response: any) => {
          this.chatId = response.chat_id;
          localStorage.setItem('chat_id', this.chatId);
          const aiMessage = response.message.message;
          const audioUrl = response.message.audio_url;
          this.addMessage('AI', aiMessage, audioUrl);
          if (audioUrl) {
            this.playAudio(audioUrl);
          }
          this.isProcessing = false;
          // Start listening after the initial greeting
          this.startListening();
        },
        error: (error: any) => {
          console.error('Error fetching initial greeting:', error);
          alert('Failed to initialize conversation. Please try again.');
          this.isProcessing = false;
        }
      });
    this.subscriptions.add(welcomeSub);
  }

  /**
   * Starts the speech recognition.
   */
  startListening(): void {
    if (this.isListening || this.isProcessing || this.isPlaying) return;
    try {
      this.recognition.start();
      this.isListening = true;
    } catch (error) {
      console.error('Failed to start recognition:', error);
      alert('Unable to start speech recognition. Please try again.');
    }
  }

  /**
   * Processes the user's transcript by sending it to the AI and handling the response.
   * @param transcript The transcribed text from the user's speech.
   */
  processUserInput(transcript: string): void {
    this.isProcessing = true;
    const chatSub = this.appService.aimentorchat(this.userId, this.chatId, this.turnId, transcript)
      .subscribe({
        next: (response: any) => {
          const aiMessage = response.message;
          const audioUrl = response.audio_url;
          this.addMessage('AI', aiMessage, audioUrl);
          if (audioUrl) {
            this.playAudio(audioUrl);
          }
          this.turnId += 1;
          this.isProcessing = false;
        },
        error: (error: any) => {
          console.error('Error processing user input:', error);
          alert('Failed to get a response from the AI. Please try again.');
          this.isProcessing = false;
          // Resume listening after error
          this.startListening();
        }
      });
    this.subscriptions.add(chatSub);
  }

  /**
   * Adds a message to the conversation history.
   * @param sender The sender of the message ('You' or 'AI').
   * @param message The message content.
   * @param audioUrl Optional audio URL for AI messages.
   */
  addMessage(sender: 'You' | 'AI', message: string, audioUrl?: string): void {
    this.conversation.push({
      sender,
      message,
      audioUrl,
      timestamp: new Date()
    });
    this.scrollToBottom();
  }

  /**
   * Plays the audio from the provided URL.
   * @param url The URL of the audio file to play.
   */
  playAudio(url: string): void {
    if (!url) return;
    this.isPlaying = true;
    this.audio.src = url;
    this.audio.load();
    this.audio.play()
      .then(() => {
        // Pause listening while AI is speaking
        if (this.isListening) {
          this.recognition.stop();
          this.isListening = false;
        }
      })
      .catch(err => {
        console.error('Audio Playback Error:', err);
        alert('Audio playback failed. Please interact with the page to enable sound.');
        this.isPlaying = false;
      });

    // Listen for when the audio playback ends to resume listening
    this.audio.onended = () => {
      this.isPlaying = false;
      // Resume listening after AI finishes speaking
      this.startListening();
    };
  }

  /**
   * Scrolls the messages container to the bottom to show the latest message.
   */
  scrollToBottom(): void {
    setTimeout(() => {
      const messagesContainer = document.querySelector('.messages');
      if (messagesContainer) {
        messagesContainer.scroll({
          top: messagesContainer.scrollHeight,
          behavior: 'smooth'
        });
      }
    }, 100);
  }
  

  /**
   * Generates a unique chat ID based on the current timestamp.
   * @returns A string representing the chat ID.
   */
  generateChatId(): string {
    return Date.now().toString();
  }

  /**
   * Toggles between light and dark themes.
   */
  toggleTheme(): void {
    this.isDarkMode = !this.isDarkMode;
    const container = document.querySelector('.conversation-container');
    if (container) {
      container.classList.toggle('dark-mode', this.isDarkMode);
    }
    localStorage.setItem('theme', this.isDarkMode ? 'dark' : 'light');
  }

  /**
   * Initializes the theme based on user's previous selection.
   */
  initializeTheme(): void {
    const theme = localStorage.getItem('theme');
    if (theme === 'dark') {
      this.isDarkMode = true;
      const container = document.querySelector('.conversation-container');
      if (container) {
        container.classList.add('dark-mode');
      }
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
}
