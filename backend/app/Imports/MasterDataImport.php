<?php

namespace App\Imports;

use Maatwebsite\Excel\Concerns\WithMultipleSheets;

class MasterDataImport implements WithMultipleSheets
{
    public function sheets(): array
    {
        return [
            new MasterSheet('Clientes'),
            new MasterSheet('Proveedores'),
            new MasterSheet('Productos'),
            new MasterSheet('Servicios'),
            new MasterSheet('Empleados'),
        ];
    }
}