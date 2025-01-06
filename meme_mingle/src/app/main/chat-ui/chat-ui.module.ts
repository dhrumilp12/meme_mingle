import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatUIComponent } from './chat-ui.component';
import { Avatar3DComponent } from '../avatar3d/avatar3d.component'; // Import the Avatar3DComponent

@NgModule({
  declarations: [
    ChatUIComponent,
    Avatar3DComponent, // Declare the Avatar3DComponent
    // ...existing code...
  ],
  imports: [
    CommonModule,
    // ...existing code...
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA] // Add this line if app-avatar3d is a Web Component
})
export class ChatUIModule { }
