// virtual-character.component.ts
import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-virtual-character',
  templateUrl: './virtual-character.component.html',
  styleUrls: ['./virtual-character.component.scss']
})
export class VirtualCharacterComponent {
  
  constructor(private http: HttpClient) {}

  // Method to start voice input using Web Speech API
  startVoiceInput() {
    const recognition = new (window as any).webkitSpeechRecognition() || new (window as any).SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.start();

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      console.log('User said:', transcript);
      this.sendMessage(transcript);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
    };
  }

  // Method to send the message to the backend AI agent
  sendMessage(message: string) {
    const userId = 'user123'; // Replace with dynamic user ID as needed
    const chatId = 'chat123'; // Replace with dynamic chat ID as needed
    const turnId = 1; // Replace with dynamic turn ID as needed

    // Prepare the payload
    const payload = {
      prompt: message,
      turn_id: turnId
    };

    // Send the message to the backend
    this.http.post(`/ai_mentor/${userId}/${chatId}`, payload, {
      responseType: 'json'
    }).subscribe(
      (response: any) => {
        console.log('AI Response:', response);
        this.handleAIResponse(response);
      },
      (error) => {
        console.error('Error communicating with AI:', error);
      }
    );
  }

  // Method to handle AI response
  handleAIResponse(response: any) {
    const aiMessage = response.message;
    const memeUrl = response.meme_url;

    // Update virtual character based on AI response (e.g., emotions)
    this.updateVirtualCharacterEmotion(aiMessage);

    // Play AI-generated speech
    if (response.audio_url) {
      this.playSpeech(response.audio_url);
    }
  }

  // Method to update the virtual character's emotion
  updateVirtualCharacterEmotion(aiMessage: string) {
    // Implement emotion detection and update the character's animations
    // For simplicity, let's change color based on keywords
    const entity = document.querySelector('#virtualCharacter') as any;

    if (aiMessage.includes('happy')) {
      entity.setAttribute('material', 'color', '#FFD700'); // Gold
      // Trigger happy animation if available
      entity.setAttribute('animation-mixer', 'clip: HappyAnimation');
    } else if (aiMessage.includes('sad')) {
      entity.setAttribute('material', 'color', '#1E90FF'); // Dodger Blue
      // Trigger sad animation if available
      entity.setAttribute('animation-mixer', 'clip: SadAnimation');
    } else {
      entity.setAttribute('material', 'color', '#FFFFFF'); // White
      // Trigger idle animation
      entity.setAttribute('animation-mixer', 'clip: IdleAnimation');
    }
  }

  // Method to play AI-generated speech
  playSpeech(audioUrl: string) {
    const audioElement = document.getElementById('speechOutput') as HTMLAudioElement;
    audioElement.src = audioUrl;
    audioElement.play();
  }
}
