<?php

namespace App\Exports;

use App\Models\Proveedor;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Concerns\WithMapping;

class ProveedoresExportSheet implements FromCollection, WithHeadings, WithTitle, WithMapping
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
        return Proveedor::where("empresa_id", $this->empresaId)->get();
    }

    public function headings(): array
    {
        return [
            "ID (No Modificar)",
            "Razon Social",
            "NIT",
            "Contacto",
            "Telefono",
            "Direccion",
            "Email",
            "Calificacion",
            "Estado Evaluacion",
            "Activo"
        ];
    }

    public function map($proveedor): array
    {
        return [
            $proveedor->id,
            $proveedor->razon_social,
            $proveedor->nit,
            $proveedor->contacto,
            $proveedor->telefono,
            $proveedor->direccion,
            $proveedor->email,
            $proveedor->calificacion,
            $proveedor->estado_evaluacion,
            $proveedor->activo ? "Si" : "No"
        ];
    }

    public function title(): string
    {
        return "Proveedores";
    }
}
