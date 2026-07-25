import { Component, inject } from '@angular/core';
import { FlashService } from './flash.service';

@Component({
  selector: 'app-flash',
  standalone: true,
  templateUrl: './flash.component.html',
  styleUrl: './flash.component.scss',
})
export class FlashComponent {
  protected readonly flash = inject(FlashService);
}
