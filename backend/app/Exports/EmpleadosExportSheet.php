<?php

namespace App\Exports;

use App\Models\Empleado;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Concerns\WithMapping;

class EmpleadosExportSheet implements FromCollection, WithHeadings, WithTitle, WithMapping
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
        return Empleado::where("empresa_id", $this->empresaId)->with("usuario")->get();
    }

    public function headings(): array
    {
        return [
            "ID (No Modificar)",
            "Nombres Usuario",
            "Documento Usuario",
            "Email Usuario",
            "Codigo Empleado",
            "Area ID",
            "Cargo ID",
            "Fecha Contratacion",
            "Tipo Contrato",
            "Salario",
            "Estado"
        ];
    }

    public function map($empleado): array
    {
        $nombreCompleto = "";
        $email = "";
        $documento = "";

        if ($empleado->usuario) {
            $u = $empleado->usuario;
            // Usar los campos actuales: primer_nombre, primer_apellido, etc. o nombres si existen (hacia atrás)
            $partes = array_filter([$u->primer_nombre, $u->segundo_nombre, $u->primer_apellido, $u->segundo_apellido]);
            $nombreCompleto = !empty($partes) ? implode(" ", $partes) : trim($u->nombres . " " . $u->apellidos);
            $email = $u->email_personal ?: $u->email;
            $documento = $u->documento;
        }

        return [
            $empleado->id,
            $nombreCompleto,
            $documento,
            $email,
            $empleado->codigo_empleado,
            $empleado->area_id,
            $empleado->cargo_id,
            $empleado->fecha_contratacion,
            $empleado->tipo_contrato,
            $empleado->salario,
            $empleado->estado
        ];
    }

    public function title(): string
    {
        return "Empleados";
    }
}
