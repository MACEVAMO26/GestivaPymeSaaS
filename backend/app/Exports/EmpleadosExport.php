<?php

namespace App\Exports;

use App\Models\Empleado;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;

class EmpleadosExport implements FromCollection, WithHeadings, WithMapping
{
    protected $empresa_id;

    public function __construct($empresa_id)
    {
        $this->empresa_id = $empresa_id;
    }

    public function collection()
    {
        return Empleado::with(['usuario', 'area', 'cargo'])->where('empresa_id', $this->empresa_id)->get();
    }

    public function headings(): array
    {
        return [
            'Código',
            'Documento',
            'Nombres',
            'Apellidos',
            'Área',
            'Cargo',
            'Estado',
            'EPS',
            'ARL',
            'Fecha Ingreso'
        ];
    }

    public function map($empleado): array
    {
        return [
            $empleado->codigo_empleado,
            $empleado->usuario ? $empleado->usuario->documento : $empleado->documento,
            $empleado->usuario ? $empleado->usuario->nombres : $empleado->nombres,
            $empleado->usuario ? $empleado->usuario->apellidos : $empleado->apellidos,
            $empleado->area ? $empleado->area->nombre : 'N/A',
            $empleado->cargo ? $empleado->cargo->nombre : 'N/A',
            $empleado->estado,
            $empleado->eps ?? 'N/A',
            $empleado->arl ?? 'N/A',
            $empleado->created_at->format('Y-m-d'),
        ];
    }
}
