import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GameTextComponent } from './game-text.component';

describe('GameTextComponent', () => {
  let component: GameTextComponent;
  let fixture: ComponentFixture<GameTextComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [GameTextComponent]
    });
    fixture = TestBed.createComponent(GameTextComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
