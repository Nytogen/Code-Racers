import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LobbyBrowserComponent } from './lobby-browser.component';

describe('LobbyBrowserComponent', () => {
  let component: LobbyBrowserComponent;
  let fixture: ComponentFixture<LobbyBrowserComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [LobbyBrowserComponent]
    });
    fixture = TestBed.createComponent(LobbyBrowserComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
