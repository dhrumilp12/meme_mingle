import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LiveConversationComponent } from './live-conversation.component';

describe('LiveConversationComponent', () => {
  let component: LiveConversationComponent;
  let fixture: ComponentFixture<LiveConversationComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [LiveConversationComponent]
    });
    fixture = TestBed.createComponent(LiveConversationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
