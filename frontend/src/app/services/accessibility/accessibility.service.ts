import { Injectable, signal, inject } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

export type DaltonismMode = 'normal' | 'protanopia' | 'deuteranopia' | 'tritanopia';

@Injectable({
  providedIn: 'root',
})
export class AccessibilityService {
  // --- VARIABLES DE ESTADO ---
  private readonly STORAGE_KEY = 'gestivapyme_daltonism_mode';
  private router = inject(Router);
  
  currentMode = signal<DaltonismMode>('normal');

  constructor() {
    this.loadInitialMode();
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.applyGlobalClass(this.currentMode());
    });
  }

  // Bloque privado para cargar el modo inicial almacenado
  private loadInitialMode() {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY) as DaltonismMode;
      if (saved && ['normal', 'protanopia', 'deuteranopia', 'tritanopia'].includes(saved)) {
        this.setMode(saved);
      }
    } catch (e) {
      console.warn('localStorage not accessible, using default mode');
    }
  }

  // Bloque para establecer el modo de corrección para daltonismo
  setMode(mode: DaltonismMode) {
    this.currentMode.set(mode);
    try {
      localStorage.setItem(this.STORAGE_KEY, mode);
    } catch (e) {
      console.warn('localStorage not accessible, could not save mode');
    }
    this.applyGlobalClass(mode);
  }

  // Bloque privado para aplicar la clase global y filtro SVG en el body
  private applyGlobalClass(mode: DaltonismMode) {
    const body = document.body;
    body.classList.remove('theme-protanopia', 'theme-deuteranopia', 'theme-tritanopia');
    
    if (mode !== 'normal') {
      body.classList.add(`theme-${mode}`);
      
      let matrix = '';
      if (mode === 'protanopia') {
        matrix = `0.10889 0.89111 -0.00000 0 0 
                  0.10889 0.89111  0.00000 0 0 
                  0.00447 -0.00447 1.00000 0 0 
                  0 0 0 1 0`;
      } else if (mode === 'deuteranopia') {
        matrix = `0.292 0.708  0.000 0 0 
                  0.292 0.708  0.000 0 0 
                 -0.022 0.022  1.000 0 0 
                  0 0 0 1 0`;
      } else if (mode === 'tritanopia') {
        matrix = `1.000 0.152 -0.152 0 0 
                  0.000 0.867  0.133 0 0 
                  0.000 0.867  0.133 0 0 
                  0 0 0 1 0`;
      }

      const svgData = `<svg xmlns="http://www.w3.org/2000/svg"><filter id="${mode}"><feColorMatrix type="matrix" values="${matrix}"/></filter></svg>`;
      const encoded = btoa(svgData);
      body.style.filter = `url('data:image/svg+xml;base64,${encoded}#${mode}')`;
      
    } else {
      body.style.filter = '';
    }
  }
}
