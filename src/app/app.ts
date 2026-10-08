import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { Header } from './components/header/header';

type PinStage = 'create' | 'confirm' | 'unlock';

@Component({
  selector: 'app-root',
  imports: [CommonModule, RouterOutlet, Header],
  templateUrl: './app.html',
})
export class App {
  readonly pinSlots = [0, 1, 2, 3];
  readonly keypadDigits = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  isUnlocked = false;
  isVerifyingPin = false;
  pinStage: PinStage = 'create';
  pinValue = '';
  pinError = '';
  private firstPin = '';
  private readonly pinStorageKey = 'badminton-stringing-pin-hash';

  constructor() {
    this.pinStage = localStorage.getItem(this.pinStorageKey) ? 'unlock' : 'create';
  }

  get pinHeading(): string {
    switch (this.pinStage) {
      case 'create': return 'Create your PIN';
      case 'confirm': return 'Confirm your PIN';
      default: return 'Enter your PIN';
    }
  }

  get pinInstructions(): string {
    if (this.pinStage === 'create') return 'Choose a four-digit PIN for this device.';
    if (this.pinStage === 'confirm') return 'Enter the same four digits again.';
    return 'Enter your four-digit PIN to continue.';
  }

  pressDigit(digit: number): void {
    if (this.isVerifyingPin || this.pinValue.length >= 4 || digit < 0 || digit > 9) return;
    this.pinError = '';
    this.pinValue += digit.toString();
    if (this.pinValue.length === 4) {
      void this.completePinEntry();
    }
  }

  deleteDigit(): void {
    if (this.isVerifyingPin) return;
    this.pinError = '';
    this.pinValue = this.pinValue.slice(0, -1);
  }

  lockApp(): void {
    this.pinStage = 'unlock';
    this.pinValue = '';
    this.pinError = '';
    this.isUnlocked = false;
  }

  private async completePinEntry(): Promise<void> {
    const enteredPin = this.pinValue;
    this.pinValue = '';
    this.isVerifyingPin = true;

    try {
      if (this.pinStage === 'create') {
        this.firstPin = enteredPin;
        this.pinStage = 'confirm';
        return;
      }

      const enteredHash = await this.hashPin(enteredPin);
      if (this.pinStage === 'confirm') {
        if (enteredPin !== this.firstPin) {
          this.pinError = 'Those PINs did not match. Try again.';
          return;
        }
        localStorage.setItem(this.pinStorageKey, enteredHash);
        this.firstPin = '';
        this.isUnlocked = true;
        return;
      }

      const savedHash = localStorage.getItem(this.pinStorageKey);
      if (savedHash === enteredHash) {
        this.isUnlocked = true;
      } else {
        this.pinError = 'That PIN was not recognized. Try again.';
      }
    } catch {
      this.pinError = 'Could not verify the PIN in this browser.';
    } finally {
      this.isVerifyingPin = false;
    }
  }

  private async hashPin(pin: string): Promise<string> {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pin));
    return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
  }
}
