import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatExpansionModule } from '@angular/material/expansion';
import { NavbarComponent } from "../navbar/navbar.component";
@Component({
  selector: 'app-faq',
  standalone: true,
  imports: [CommonModule, MatExpansionModule, NavbarComponent],
  templateUrl: './faq.component.html',
  styleUrls: ['./faq.component.scss']
})
export class FaqComponent {
  faqs = [
    {
      question: 'How do I reset my password?',
      answer: 'To reset your password, go to the sign-in page and click on "Forgot Password". Follow the instructions sent to your email.'
    },
    {
      question: 'How can I update my profile information?',
      answer: 'Navigate to the User Profile section from the navbar and click on "Edit Profile" to update your information.'
    },
    {
      question: 'Where can I find the user guide?',
      answer: 'The user guide is available in the README.md file located in the root of the repository.'
    },
    {
      question: 'How do I contact support?',
      answer: 'You can contact support by emailing support@meme-mingle.com or through the contact form in the Help section.'
    },
    {
      question: 'What technologies are used in Meme Mingle?',
      answer: 'Meme Mingle is built with Angular for the frontend, Python and Flask for the backend, Langchain for AI functionalities, and MongoDB for data storage.'
    },
    {
      question: 'Is my data secure?',
      answer: 'Yes, we implement industry-standard security measures to protect your data, including encryption and regular security audits.'
    },
    {
      question: 'Can I customize my user experience?',
      answer: 'Absolutely! You can customize your preferences in the settings section to tailor the platform to your needs.'
    },
    {
      question: 'How do I delete my account?',
      answer: 'To delete your account, navigate to Account Settings and click on "Delete Account". Please note that this action is irreversible.'
    }
  ];
}