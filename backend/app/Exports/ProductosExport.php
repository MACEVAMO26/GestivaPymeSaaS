<?php

namespace App\Exports;

use App\Models\Producto;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;

class ProductosExport implements FromCollection, WithHeadings, WithMapping
{
    protected $empresa_id;

    public function __construct($empresa_id)
    {
        $this->empresa_id = $empresa_id;
    }

    public function collection()
    {
        return Producto::with(['categoria'])->where('empresa_id', $this->empresa_id)->get();
    }

    public function headings(): array
    {
        return [
            'ID',
            'Nombre',
            'Categoría',
            'Stock',
            'Stock Mínimo',
            'Precio Compra',
            'Precio Venta',
            'Proveedor',
            'Estado'
        ];
    }

    public function map($producto): array
    {
        return [
            $producto->id,
            $producto->nombre,
            $producto->categoria ? $producto->categoria->nombre : 'N/A',
            $producto->stock,
            $producto->stock_minimo,
            $producto->precio_compra,
            $producto->precio_venta,
            $producto->proveedor ? $producto->proveedor->nombre : 'N/A',
            $producto->stock <= $producto->stock_minimo ? 'Bajo Stock' : 'Normal',
        ];
    }
}
