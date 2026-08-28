<?php

namespace App\Exports;

use App\Models\Servicio;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Concerns\WithMapping;

class ServiciosExportSheet implements FromCollection, WithHeadings, WithTitle, WithMapping
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
        return Servicio::where("empresa_id", $this->empresaId)->get();
    }

    public function headings(): array
    {
        return [
            "ID (No Modificar)",
            "Categoria ID",
            "Nombre",
            "Descripcion",
            "Tarifa",
            "Tiempo Estimado",
            "Activo"
        ];
    }

    public function map($servicio): array
    {
        return [
            $servicio->id,
            $servicio->categoria_id,
            $servicio->nombre,
            $servicio->descripcion,
            $servicio->tarifa,
            $servicio->tiempo_estimado,
            $servicio->activo ? "Si" : "No"
        ];
    }

    public function title(): string
    {
        return "Servicios";
    }
}
