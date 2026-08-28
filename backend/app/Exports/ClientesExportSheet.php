<?php

namespace App\Exports;

use App\Models\Cliente;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Concerns\WithMapping;

class ClientesExportSheet implements FromCollection, WithHeadings, WithTitle, WithMapping
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
        return Cliente::where("empresa_id", $this->empresaId)->get();
    }

    public function headings(): array
    {
        return [
            "ID (No Modificar)",
            "Tipo Cliente",
            "Nombres",
            "Apellidos",
            "Nombre/Razon Social",
            "Documento/NIT",
            "Email",
            "Telefono",
            "Direccion",
            "Ciudad",
            "Membresia",
            "Estado Financiero",
            "Vendedor ID"
        ];
    }

    public function map($cliente): array
    {
        return [
            $cliente->id,
            $cliente->tipo_cliente,
            $cliente->nombres,
            $cliente->apellidos,
            $cliente->nombre_razon_social,
            $cliente->documento,
            $cliente->email,
            $cliente->telefono,
            $cliente->direccion,
            $cliente->ciudad,
            $cliente->membresia,
            $cliente->estado_financiero,
            $cliente->vendedor_id
        ];
    }

    public function title(): string
    {
        return "Clientes";
    }
}
