import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Categoria {
  id?: number;
  nombre: string;
  descripcion?: string;
  tipo?: string;
  activo: boolean;
}

export interface Producto {
  id?: number;
  categoria_id: number;
  nombre: string;
  descripcion?: string;
  precio_compra: number;
  precio_venta: number;
  stock_inicial: number;
  unidad_medida?: string;
  imagen_url?: string;
  activo: boolean;
  categoria?: Categoria;
}

@Injectable({
  providedIn: 'root'
})
export class ProductoService {
  private http = inject(HttpClient);
  
  getCategorias(): Observable<Categoria[]> {
    return this.http.get<Categoria[]>('/api/categorias');
  }

  crearCategoria(categoria: Categoria): Observable<Categoria> {
    return this.http.post<Categoria>('/api/categorias', categoria);
  }

  actualizarCategoria(id: number, categoria: Partial<Categoria>): Observable<Categoria> {
    return this.http.put<Categoria>(`/api/categorias/${id}`, categoria);
  }

  eliminarCategoria(id: number): Observable<any> {
    return this.http.delete(`/api/categorias/${id}`);
  }

  getProductos(): Observable<Producto[]> {
    return this.http.get<Producto[]>('/api/productos');
  }

  crearProducto(producto: Producto): Observable<Producto> {
    return this.http.post<Producto>('/api/productos', producto);
  }
}
