// auth.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NavbarComponent } from "../layout/navbar/navbar.component"; // Import RouterModule

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, RouterModule, NavbarComponent], // Add RouterModule here
  templateUrl: './auth.component.html',
  styleUrls: ['./auth.component.scss'],
})
export class AuthComponent {}
