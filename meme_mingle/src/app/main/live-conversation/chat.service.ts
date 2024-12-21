import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  private chatId: string | null = null;

  constructor() {}

  setChatId(id: string): void {
    this.chatId = id;
  }

  getChatId(): string | null {
    return this.chatId;
  }

  generateChatId(): string {
    this.chatId = Date.now().toString();
    return this.chatId;
  }

  clearChatId(): void {
    this.chatId = null;
  }
}
