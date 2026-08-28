<?php

namespace App\Exports;

use App\Models\Venta;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;

class VentasExport implements FromCollection, WithHeadings, WithMapping
{
    protected $empresa_id;

    public function __construct($empresa_id)
    {
        $this->empresa_id = $empresa_id;
    }

    public function collection()
    {
        return Venta::with(['cliente', 'producto'])->where('empresa_id', $this->empresa_id)->get();
    }

    public function headings(): array
    {
        return [
            'ID',
            'Cliente',
            'Producto',
            'Cantidad',
            'Total',
            'Estado Paquete',
            'Fecha'
        ];
    }

    public function map($venta): array
    {
        return [
            $venta->id,
            $venta->cliente ? $venta->cliente->nombre : 'N/A',
            $venta->producto ? $venta->producto->nombre : 'N/A',
            $venta->cantidad,
            $venta->total,
            $venta->estado_paquete,
            $venta->created_at->format('Y-m-d H:i:s'),
        ];
    }
}
