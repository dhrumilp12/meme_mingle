import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VirtualCharacterComponent } from './virtual-character.component';

describe('VirtualCharacterComponent', () => {
  let component: VirtualCharacterComponent;
  let fixture: ComponentFixture<VirtualCharacterComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [VirtualCharacterComponent]
    });
    fixture = TestBed.createComponent(VirtualCharacterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
