<?php

namespace App\Exports;

use App\Models\Producto;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Concerns\WithMapping;

class ProductosExportSheet implements FromCollection, WithHeadings, WithTitle, WithMapping
{
    protected $empresaId;
    protected $isTemplate;

    public function __construct($empresaId = null, $isTemplate = false)
    {
        $this->empresaId = $empresaId;
        $this->isTemplate = $isTemplate;
    }

    public function collection()
    {
        if ($this->isTemplate || !$this->empresaId) {
            return collect([]);
        }
        return Producto::where("empresa_id", $this->empresaId)->get();
    }

    public function headings(): array
    {
        return [
            "ID (No Modificar)",
            "Categoria ID",
            "Nombre",
            "Descripcion",
            "Precio Compra",
            "Precio Venta",
            "Stock Inicial",
            "Unidad Medida",
            "Ubicacion Almacen",
            "Lote",
            "Fecha Vencimiento",
            "Fecha Ingreso",
            "Activo"
        ];
    }

    public function map($producto): array
    {
        return [
            $producto->id,
            $producto->categoria_id,
            $producto->nombre,
            $producto->descripcion,
            $producto->precio_compra,
            $producto->precio_venta,
            $producto->stock_inicial,
            $producto->unidad_medida,
            $producto->ubicacion_almacen ?? "",
            $producto->lote ?? "",
            $producto->fecha_vencimiento ?? "",
            $producto->fecha_ingreso ?? "",
            $producto->activo ? "Si" : "No"
        ];
    }

    public function title(): string
    {
        return "Productos";
    }
}
