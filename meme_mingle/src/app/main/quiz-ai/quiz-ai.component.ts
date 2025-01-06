import { Component, OnInit, OnDestroy } from '@angular/core';
import { AppService } from '../../app.service';
import { FormBuilder, FormGroup, Validators, FormArray, ReactiveFormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { trigger, transition, style, animate } from '@angular/animations';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatExpansionModule } from '@angular/material/expansion';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { marked } from 'marked';


interface Quiz {
  quiz_id: string;
  questions: Question[];
}

interface Question {
  question_id: string;
  question: string;
  question_type: 'MC' | 'SA';
  options?: string[]; // For MCQs
  correct_answer?: string;
  sanitizedQuestion?: SafeHtml;
}

interface Feedback {
  response_id: string;
  score: number;
  total_possible_points: number;
  feedback: FeedbackItem[];
  total_score: number;
}

interface FeedbackItem {
  question_id: string;
  correct: boolean;
  correct_answer: string;
  user_answer: string;
  feedback: string;
  sanitizedFeedback?: SafeHtml;
}

@Component({
  selector: 'app-quiz-ai',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatRadioModule,
    MatButtonModule,
    MatSnackBarModule,
    MatIconModule,
    MatTooltipModule,
    MatExpansionModule,
  ],
  templateUrl: './quiz-ai.component.html',
  styleUrls: ['./quiz-ai.component.scss'],
  animations: [
    trigger('slideLeft', [
      transition(':enter', [
        style({ transform: 'translateX(100%)', opacity: 0 }),
        animate('300ms ease-out', style({ transform: 'translateX(0)', opacity: 1 })),
      ]),
      transition(':leave', [
        animate('300ms ease-in', style({ transform: 'translateX(-100%)', opacity: 0 })),
      ]),
    ]),
  ],
})
export class QuizAiComponent implements OnInit, OnDestroy {
  quizForm: FormGroup;
  answerForm: FormGroup;
  subscriptions: Subscription = new Subscription();
  quiz: Quiz | null = null;
  feedback: Feedback | null = null;
  totalScore: number = 0;
  selectedFile: File | null = null;
  isProcessing: boolean = false;
  currentTopic: string = '';
  preferredLanguage: string = 'en';
  translatedTexts: { [key: string]: string } = {};
  currentStep: 'generate' | 'answer' | 'feedback' = 'generate';
  topics: string[] = [
    'Mathematics',
    'Physics',
    'Chemistry',
    'Computer Science',
    'History',
    'Geography',
    'Biology',
    'Literature',
    // Add more topics as needed
  ];

  // Define quiz levels
  levels: string[] = [
    'Easy',
    'Medium',
    'Hard',
  ];
  constructor(
    private fb: FormBuilder,
    private appService: AppService,
    private snackBar: MatSnackBar,
    private sanitizer: DomSanitizer 
  ) {
    // Initialize the quiz generation form
    this.quizForm = this.fb.group({
      topic: ['', Validators.required],
      level: ['Medium', Validators.required],
      numQuestions: [5, [Validators.required, Validators.min(1), Validators.max(20)]],
    });

    // Initialize the answer form dynamically based on questions
    this.answerForm = this.fb.group({
      answers: this.fb.array([]),
    });
  }

  ngOnInit(): void {
    this.fetchTotalScore();
    this.preferredLanguage = localStorage.getItem('preferredLanguage') || 'en';

    if (this.preferredLanguage !== 'en') {
      this.translateContent(this.preferredLanguage);
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  // Translate content to the target language
  private translateContent(targetLanguage: string) {
    const elementsToTranslate = document.querySelectorAll('[data-translate]');
    const textsToTranslate = Array.from(elementsToTranslate).map(
      (el) => el.textContent?.trim() || ''
    );

    // Include additional texts that are not in data-translate attributes
    const additionalTexts = [
    'Generate Your Quiz',
    'Select Topic',
    'Select Level',
    'Upload File',
    'Remove selected file',
    'Number of Questions',
    'Generate Quiz',
    'Please select a topic or upload a file to generate a quiz.',
    'Quiz generated successfully!',
    'Failed to generate quiz. Please try again.',
    'Your Answer',
    'Submit Answers',
    'Please answer all questions before submitting.',
    'No quiz to submit.',
    'Quiz Feedback',
    'Your Score',
    'Total Score',
    'Your Total Score',
    'Generate New Quiz',
    'Ready to generate a new quiz!',
    'Go back to quiz generation',
    'Mathematics',
    'Physics',
    'Chemistry',
    'Computer Science',
    'History',
    'Geography',
    'Biology',
    'Literature',
    'Easy',
    'Medium',
    'Hard',
    'Quiz'];
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
  // Handle file selection
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
      // If a file is selected, clear the topic selection
      if (this.selectedFile) {
        this.quizForm.patchValue({ topic: '' });
        // Also, set topic as not required if file is selected
        this.quizForm.get('topic')?.clearValidators();
        this.quizForm.get('topic')?.updateValueAndValidity();
      }
    } else {
      this.selectedFile = null;
      // Re-enable topic field validation if no file is selected
      this.quizForm.get('topic')?.setValidators(Validators.required);
      this.quizForm.get('topic')?.updateValueAndValidity();
    }
  }

  // Generate Quiz
  generateQuiz(): void {
    if (this.quizForm.invalid && !this.selectedFile) {
      this.snackBar.open('Please select a topic or upload a file to generate a quiz.', 'Close', {
        duration: 3000,
      });
      return;
    }
    this.isProcessing = true;
    const userId = localStorage.getItem('user_id') || 'default_user';
    const topic = this.quizForm.value.topic;
    const numQuestions = this.quizForm.value.numQuestions;
    const level = this.quizForm.value.level;

    this.currentTopic = topic ? topic : '';
    this.subscriptions.add(
      this.appService.getQuizQuestions(userId, topic, this.selectedFile ?? undefined, numQuestions, level).subscribe({
        next: (response: any) => {
          this.quiz = {
            quiz_id: response.quiz_id,
            questions: response.questions.map((q: any) => ({
              ...q,
              sanitizedQuestion: this.convertMarkdownToHtml(q.question)
            })),
          };
          this.initializeAnswerForm();
          this.isProcessing = false;
          this.snackBar.open('Quiz generated successfully!', 'Close', { duration: 3000 });
          this.currentStep = 'answer';
        },
        error: (error: any) => {
          console.error('Error generating quiz:', error);
          this.isProcessing = false;
          this.snackBar.open('Failed to generate quiz. Please try again.', 'Close', { duration: 3000 });
        },
      })
    );
  }

  // Initialize the answer form based on the quiz questions
  initializeAnswerForm(): void {
    const answersArray = this.quiz?.questions.map(() => this.fb.control('', Validators.required)) || [];
    this.answerForm = this.fb.group({
      answers: this.fb.array(answersArray),
    });
  }

  // Submit Answers
  submitAnswers(): void {
    if (this.answerForm.invalid) {
      this.snackBar.open('Please answer all questions before submitting.', 'Close', { duration: 3000 });
      return;
    }

    if (!this.quiz) {
      this.snackBar.open('No quiz to submit.', 'Close', { duration: 3000 });
      return;
    }
    this.isProcessing = true;
    const userId = localStorage.getItem('user_id') || 'default_user';
    const answers = this.quiz.questions.map((question, index) => ({
      question_id: question.question_id,
      user_answer: this.answerForm.value.answers[index],
    }));

    this.subscriptions.add(
      this.appService.submitQuizAnswers(this.quiz.quiz_id, userId, answers).subscribe({
        next: (response: any) => {
          this.feedback = {
            response_id: response.response_id,
            score: response.score,
            total_possible_points: response.total_possible_points,
            feedback: response.feedback.map((fb: any) => ({
              ...fb,
              sanitizedFeedback: this.convertMarkdownToHtml(fb.feedback)
            })),
            total_score: response.total_score,
          };
          console.log('Feedback:', response);
          this.totalScore = response.total_score;
          this.isProcessing = false;
          this.snackBar.open('Answers submitted successfully!', 'Close', { duration: 3000 });
          this.fetchTotalScore();
          this.currentStep = 'feedback';
        },
        error: (error: any) => {
          console.error('Error submitting answers:', error);
          this.isProcessing = false;
          this.snackBar.open('Failed to submit answers. Please try again.', 'Close', { duration: 3000 });
        },
      })
    );
  }

  // Fetch Total Score
  fetchTotalScore(): void {
    const userId = localStorage.getItem('user_id') || 'default_user';
    this.subscriptions.add(
      this.appService.getTotalScore(userId).subscribe({
        next: (response: any) => {
          this.totalScore = response.total_score;
        },
        error: (error: any) => {
          console.error('Error fetching total score:', error);
        },
      })
    );
  }

  // Helper to get answers FormArray
  get answers(): FormArray {
    return this.answerForm.get('answers') as FormArray;
  }

  // Method to generate a new quiz
  generateNewQuiz(): void {
    // Reset the quiz-related properties
    this.quiz = null;
    this.feedback = null;
    this.totalScore = 0;

    // Reset the forms
    this.quizForm.reset({
      topic: '',
      level: 'Medium',
      numQuestions: 5, // Set to your default value
    });
    this.answerForm = this.fb.group({
      answers: this.fb.array([]),
    });
    this.selectedFile = null;


    // Reset currentTopic
    this.currentTopic = '';
    // Navigate back to the generate step
    this.currentStep = 'generate';

    // Optionally, display a snackbar notification
    this.snackBar.open('Ready to generate a new quiz!', 'Close', {
      duration: 3000,
    });
  }

  goBackToGenerate() {
    this.currentStep = 'generate';
  }
  removeFile(): void {
    this.selectedFile = null;
    // Optionally, reset the file input
    const fileInput = document.getElementById('fileUpload') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  getQuestionNumber(questionId: string): number {
    if (!this.quiz) return -1;
    return this.quiz.questions.findIndex(q => q.question_id === questionId) + 1;
  }
  getQuestionText(questionId: string): string {
    if (!this.quiz) return '';
    const question = this.quiz.questions.find(q => q.question_id === questionId);
    return question ? question.question : 'Question not found';
  }

  convertMarkdownToHtml(markdown: string): SafeHtml {
    const rawHtml = marked(markdown);
    return this.sanitizer.bypassSecurityTrustHtml(rawHtml);
  }
  
}