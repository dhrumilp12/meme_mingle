// src/app/virtual-character/virtual-character.component.ts

import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModelService } from './virtual-character.service';

@Component({
  selector: 'app-virtual-character',
  standalone: true,
  imports: [CommonModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA], // Add this line
  templateUrl: './virtual-character.component.html',
  styleUrls: ['./virtual-character.component.scss'],
})
export class VirtualCharacterComponent implements OnInit {

  modelUrl: string | null = null;
  error: string | null = null;
  isLoading: boolean = true;

  constructor(private modelService: ModelService) { }

  ngOnInit(): void {
    this.modelService.getModelUrl().subscribe({
      next: (url) => {
        console.log('Model URL fetched successfully:', url);
        this.modelUrl = url;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error fetching model URL:', err);
        this.error = 'Failed to load the 3D model.';
        this.isLoading = false;
      }
    });
  }
  

}