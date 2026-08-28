import { Injectable, signal, inject } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

export type DaltonismMode = 'normal' | 'protanopia' | 'deuteranopia' | 'tritanopia';

@Injectable({
  providedIn: 'root',
})
export class AccessibilityService {
  private readonly STORAGE_KEY = 'gestivapyme_daltonism_mode';
  private router = inject(Router);
  
  // Usamos Signals de Angular 17+ para estado reactivo
  currentMode = signal<DaltonismMode>('normal');

  constructor() {
    this.loadInitialMode();
    // Firefox fix: Actualizar URL del filtro al cambiar de ruta
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.applyGlobalClass(this.currentMode());
    });
  }

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

  setMode(mode: DaltonismMode) {
    this.currentMode.set(mode);
    try {
      localStorage.setItem(this.STORAGE_KEY, mode);
    } catch (e) {
      console.warn('localStorage not accessible, could not save mode');
    }
    this.applyGlobalClass(mode);
  }

  private applyGlobalClass(mode: DaltonismMode) {
    const body = document.body;
    body.classList.remove('theme-protanopia', 'theme-deuteranopia', 'theme-tritanopia');
    
    if (mode !== 'normal') {
      body.classList.add(`theme-${mode}`);
      
      // Firefox FIX Definitivo: Usar Data URIs para inyectar el SVG directamente en CSS
      // Esto evita cualquier bug de resolución de URL o de elementos ocultos en el DOM.
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
      // Codificar en Base64 para máxima compatibilidad cross-browser
      const encoded = btoa(svgData);
      body.style.filter = `url('data:image/svg+xml;base64,${encoded}#${mode}')`;
      
    } else {
      body.style.filter = '';
    }
  }
}
