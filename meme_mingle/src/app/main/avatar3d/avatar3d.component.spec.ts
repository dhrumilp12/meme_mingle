import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Avatar3DComponent } from './avatar3d.component';

describe('Avatar3DComponent', () => {
  let component: Avatar3DComponent;
  let fixture: ComponentFixture<Avatar3DComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [Avatar3DComponent]
    });
    fixture = TestBed.createComponent(Avatar3DComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
