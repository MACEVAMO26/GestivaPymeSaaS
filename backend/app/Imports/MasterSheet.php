<?php

namespace App\Imports;

use Maatwebsite\Excel\Concerns\ToCollection;
use Maatwebsite\Excel\Concerns\WithHeadingRow;
use Maatwebsite\Excel\Concerns\WithTitle;
use Illuminate\Support\Collection;

class MasterSheet implements ToCollection, WithHeadingRow, WithTitle
{
    protected $title;

    public function __construct($title)
    {
        $this->title = $title;
    }

    public function collection(Collection $rows)
    {
        // Las filas se procesan en AdminRequestController::importar
    }

    public function title(): string
    {
        return $this->title;
    }
}