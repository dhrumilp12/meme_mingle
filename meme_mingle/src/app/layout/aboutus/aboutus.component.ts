import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavbarComponent } from "../navbar/navbar.component";
@Component({
  selector: 'app-aboutus',
  standalone: true,
  imports: [CommonModule, NavbarComponent],
  templateUrl: './aboutus.component.html',
  styleUrls: ['./aboutus.component.scss']
})
export class AboutusComponent {}
