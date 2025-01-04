import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QuizAiComponent } from './quiz-ai.component';

describe('QuizAiComponent', () => {
  let component: QuizAiComponent;
  let fixture: ComponentFixture<QuizAiComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [QuizAiComponent]
    });
    fixture = TestBed.createComponent(QuizAiComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
