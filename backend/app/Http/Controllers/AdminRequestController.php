<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Maatwebsite\Excel\Facades\Excel;
use App\Imports\MasterDataImport;
use App\Models\AdminRequest;
use App\Models\Categoria;
use App\Models\Area;
use App\Models\Cargo;
use App\Models\Cliente;
use App\Models\Proveedor;
use App\Models\Producto;
use App\Models\Servicio;
use App\Models\Empleado;
use Illuminate\Support\Facades\Auth;

class AdminRequestController extends Controller
{
    // --- GESTIÓN DE SOLICITUDES ADMINISTRATIVAS ---
    public function index()
    {
        return response()->json(AdminRequest::with('empresa')->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'tipo' => 'required|string',
            'banco' => 'nullable|string',
            'comprobante' => 'nullable|file|mimes:jpeg,png,jpg,pdf|max:5120',
            'logo' => 'nullable|file|mimes:jpeg,png,jpg|max:5120',
            'documento' => 'nullable|file|mimes:pdf,jpeg,png,jpg|max:5120',
            'datos_nuevos' => 'nullable|string'
        ]);
        
        $user = Auth::user();
        $empresa_id = $user ? $user->empresa_id : null;

        $comprobantePath = null;
        if ($request->hasFile('comprobante') && $request->file('comprobante')->isValid()) {
            $uploaded = cloudinary()->uploadApi()->upload($request->file('comprobante')->getRealPath(), [
                'folder' => 'comprobantes'
            ]);
            $comprobantePath = $uploaded['secure_url'];
        }

        $datosNuevosArray = [];
        if ($request->has('datos_nuevos') && $request->input('datos_nuevos')) {
            $datosNuevosArray = json_decode($request->input('datos_nuevos'), true);
        }

        if ($request->hasFile('logo') && $request->file('logo')->isValid()) {
            $uploadedLogo = cloudinary()->uploadApi()->upload($request->file('logo')->getRealPath(), [
                'folder' => 'temp_logos'
            ]);
            $datosNuevosArray['temp_logo'] = $uploadedLogo['secure_url'];
        }

        if ($request->hasFile('documento') && $request->file('documento')->isValid()) {
            $uploadedDoc = cloudinary()->uploadApi()->upload($request->file('documento')->getRealPath(), [
                'folder' => 'temp_docs'
            ]);
            $datosNuevosArray['temp_doc'] = $uploadedDoc['secure_url'];
        }

        $req = AdminRequest::create([
            'empresa_id' => $empresa_id,
            'tipo' => $validated['tipo'],
            'estado' => 'pendiente',
            'banco' => $validated['banco'] ?? null,
            'comprobante_path' => $comprobantePath,
            'datos_nuevos' => !empty($datosNuevosArray) ? json_encode($datosNuevosArray) : null,
            'notas_propietaria' => null
        ]);

        return response()->json($req, 201);
    }

    public function process(Request $request, $id)
    {
        $req = AdminRequest::findOrFail($id);
        
        $validated = $request->validate([
            'accion' => 'required|in:aprobado,rechazado',
            'mensaje' => 'nullable|string',
            'approved_fields' => 'nullable|array'
        ]);

        $req->estado = $validated['accion'];
        $req->notas_propietaria = $validated['mensaje'] ?? null;
        
        $approvedFields = $validated['approved_fields'] ?? null;

        // Aplica automáticamente los cambios solicitados a la empresa si la solicitud es aprobada
        $datos = $req->datos_nuevos ? json_decode($req->datos_nuevos, true) : [];
        $empresa = $req->empresa_id ? \App\Models\Empresa::find($req->empresa_id) : null;

        if ($req->estado === 'aprobado' && $empresa) {
            // Si no se envían approved_fields (comportamiento antiguo), asumimos todos los campos
            $fieldsToProcess = $approvedFields !== null ? $approvedFields : array_keys($datos);

            if ($req->tipo === 'cambio_datos') {
                if (in_array('razon_social', $fieldsToProcess) && isset($datos['razon_social'])) $empresa->razon_social = $datos['razon_social'];
                if (in_array('nit', $fieldsToProcess) && isset($datos['nit'])) $empresa->nit = $datos['nit'];
                if (in_array('direccion', $fieldsToProcess) && isset($datos['direccion'])) $empresa->direccion = $datos['direccion'];
                if (in_array('telefono', $fieldsToProcess) && isset($datos['telefono'])) $empresa->telefono = $datos['telefono'];
                if (in_array('email', $fieldsToProcess) && isset($datos['email'])) $empresa->email = $datos['email'];
                if (in_array('color_primario', $fieldsToProcess) && isset($datos['color_primario'])) $empresa->color_primario = $datos['color_primario'];
            }

            // Procesar Logo si fue aprobado (cambio_datos o cambio_logo)
            if (in_array('temp_logo', $fieldsToProcess) && isset($datos['temp_logo']) && str_starts_with($datos['temp_logo'], 'http')) {
                $empresa->logo_url = $datos['temp_logo'];
            }

            $empresa->save();
        }

        $req->save();

        return response()->json($req);
    }

    public function misSolicitudes()
    {
        $user = Auth::user();
        if (!$user || !$user->empresa_id) {
            return response()->json([], 200);
        }
        $requests = AdminRequest::where('empresa_id', $user->empresa_id)
                    ->orderBy('created_at', 'desc')
                    ->get();
        return response()->json($requests, 200);
    }

    // --- MIGRACIÓN DE DATOS (Onboarding) ---
    public function descargarArchivo($id)
    {
        $req = AdminRequest::findOrFail($id);
        if (!$req->comprobante_path) {
            return response()->json(['error' => 'La solicitud no tiene archivo adjunto.'], 404);
        }

        $path = storage_path('app/public/' . $req->comprobante_path);
        if (!file_exists($path)) {
            return response()->json(['error' => 'El archivo ya no está disponible.'], 404);
        }

        return response()->download($path, basename($req->comprobante_path));
    }

    public function importar(Request $request, $id)
    {
        $req = AdminRequest::findOrFail($id);
        $request->validate([
            'archivo' => 'required|file|mimes:xlsx,xls,csv'
        ]);

        $empresaId = $req->empresa_id;
        if (!$empresaId) {
            return response()->json(['error' => 'La solicitud no tiene una empresa asociada.'], 400);
        }

        $data = Excel::toCollection(new MasterDataImport, $request->file('archivo'));
        $resultado = $this->procesarHojas($data, $empresaId);

        $req->estado = 'aprobado';
        $req->notas_propietaria = 'Migración procesada: ' . $this->resumenMigracion($resultado);
        $req->save();

        return response()->json([
            'message' => 'Base de datos importada correctamente a la empresa.',
            'resumen' => $resultado,
            'solicitud' => $req
        ]);
    }

    // Para aprobar e importar directamente el archivo que ya subió la empresa, sin re-subirlo
    public function aprobarEImportar($id)
    {
        $req = AdminRequest::findOrFail($id);

        if ($req->tipo !== 'migracion') {
            return response()->json(['error' => 'Esta solicitud no es de tipo migración.'], 400);
        }

        if (!$req->comprobante_path) {
            return response()->json(['error' => 'La solicitud no tiene un archivo adjunto.'], 404);
        }

        $path = storage_path('app/public/' . $req->comprobante_path);
        if (!file_exists($path)) {
            return response()->json(['error' => 'El archivo ya no está disponible en el servidor.'], 404);
        }

        $empresaId = $req->empresa_id;
        if (!$empresaId) {
            return response()->json(['error' => 'La solicitud no tiene una empresa asociada.'], 400);
        }

        // Leer el archivo ya almacenado y procesarlo directamente
        $data = Excel::toCollection(new MasterDataImport, $path);
        $resultado = $this->procesarHojas($data, $empresaId);

        $req->estado = 'aprobado';
        $req->notas_propietaria = 'Importación aprobada y procesada: ' . $this->resumenMigracion($resultado);
        $req->save();

        return response()->json([
            'message' => 'Datos importados correctamente a la empresa.',
            'resumen' => $resultado,
            'solicitud' => $req
        ]);
    }

    private function procesarHojas($data, $empresaId)
    {
        $resultado = ['clientes' => 0, 'proveedores' => 0, 'productos' => 0, 'servicios' => 0, 'empleados' => 0, 'omitidos' => 0];

        foreach ($data as $rows) {
            if ($rows->isEmpty()) continue;

            $claves = $this->normalizar($rows->first())->keys()->all();

            if (in_array('nombres', $claves) || in_array('apellidos', $claves) || in_array('nombre_razon_social', $claves)) {
                foreach ($rows as $r) {
                    try { $ok = $this->importarCliente($r, $empresaId); } catch (\Throwable $e) { $ok = false; }
                    $ok ? $resultado['clientes']++ : $resultado['omitidos']++;
                }
            } elseif (in_array('precio_venta', $claves)) {
                foreach ($rows as $r) {
                    try { $ok = $this->importarProducto($r, $empresaId); } catch (\Throwable $e) { $ok = false; }
                    $ok ? $resultado['productos']++ : $resultado['omitidos']++;
                }
            } elseif (in_array('tarifa', $claves)) {
                foreach ($rows as $r) {
                    try { $ok = $this->importarServicio($r, $empresaId); } catch (\Throwable $e) { $ok = false; }
                    $ok ? $resultado['servicios']++ : $resultado['omitidos']++;
                }
            } elseif (in_array('razon_social', $claves) && in_array('nit', $claves)) {
                foreach ($rows as $r) {
                    try { $ok = $this->importarProveedor($r, $empresaId); } catch (\Throwable $e) { $ok = false; }
                    $ok ? $resultado['proveedores']++ : $resultado['omitidos']++;
                }
            } elseif (in_array('codigo_empleado', $claves)) {
                foreach ($rows as $r) {
                    try { $ok = $this->importarEmpleado($r, $empresaId); } catch (\Throwable $e) { $ok = false; }
                    $ok ? $resultado['empleados']++ : $resultado['omitidos']++;
                }
            }
        }

        return $resultado;
    }

    private function importarCliente($row, $empresaId)
    {
        $v = $this->normalizar($row);
        $documento = trim((string) ($v->get('documento_nit') ?? $v->get('documento') ?? ''));
        $email = strtolower(trim((string) ($v->get('email') ?? '')));
        $nombres = trim((string) ($v->get('nombres') ?? ''));
        $apellidos = trim((string) ($v->get('apellidos') ?? ''));
        $razon = trim((string) ($v->get('nombre_razon_social') ?? ''));

        if (!$documento && !$email && !$nombres && !$razon) return false;
        if ($documento && Cliente::where('empresa_id', $empresaId)->where('documento', $documento)->exists()) return false;
        if (!$documento && $email && Cliente::where('empresa_id', $empresaId)->where('email', $email)->exists()) return false;

        Cliente::create([
            'empresa_id' => $empresaId,
            'tipo_cliente' => $v->get('tipo_cliente') ?: 'Natural',
            'nombres' => $nombres ?: null,
            'apellidos' => $apellidos ?: null,
            'nombre_razon_social' => $razon ?: null,
            'documento' => $documento ?: null,
            'email' => $email ?: null,
            'telefono' => $v->get('telefono') ?: null,
            'direccion' => $v->get('direccion') ?: null,
            'ciudad' => $v->get('ciudad') ?: null,
            'membresia' => $v->get('membresia') ?: null,
            'estado_financiero' => $v->get('estado_financiero') ?: null,
            'activo' => $this->aBool($v->get('activo') ?? 'Si')
        ]);
        return true;
    }

    private function importarProveedor($row, $empresaId)
    {
        $v = $this->normalizar($row);
        $razon = trim((string) ($v->get('razon_social') ?? ''));
        $nit = trim((string) ($v->get('nit') ?? ''));

        if (!$razon && !$nit) return false;
        if ($nit && Proveedor::where('empresa_id', $empresaId)->where('nit', $nit)->exists()) return false;
        if (!$nit && $razon && Proveedor::where('empresa_id', $empresaId)->where('razon_social', $razon)->exists()) return false;

        Proveedor::create([
            'empresa_id' => $empresaId,
            'razon_social' => $razon ?: null,
            'nit' => $nit ?: null,
            'contacto' => $v->get('contacto') ?: null,
            'telefono' => $v->get('telefono') ?: null,
            'direccion' => $v->get('direccion') ?: null,
            'email' => $v->get('email') ?: null,
            'calificacion' => $this->aNumero($v->get('calificacion')),
            'estado_evaluacion' => $v->get('estado_evaluacion') ?: null,
            'activo' => $this->aBool($v->get('activo') ?? 'Si')
        ]);
        return true;
    }

    private function importarProducto($row, $empresaId)
    {
        $v = $this->normalizar($row);
        $nombre = trim((string) ($v->get('nombre') ?? ''));

        if (!$nombre) return false;
        if (Producto::where('empresa_id', $empresaId)->where('nombre', $nombre)->exists()) return false;

        Producto::create([
            'categoria_id' => $this->resolverCategoria($empresaId, $v->get('categoria_id'), 'ventas'),
            'empresa_id' => $empresaId,
            'nombre' => $nombre,
            'descripcion' => $v->get('descripcion') ?: null,
            'precio_compra' => $this->aNumero($v->get('precio_compra')),
            'precio_venta' => $this->aNumero($v->get('precio_venta')),
            'stock_inicial' => $this->aNumero($v->get('stock_inicial')),
            'unidad_medida' => $v->get('unidad_medida') ?: null,
            'activo' => $this->aBool($v->get('activo') ?? 'Si')
        ]);
        return true;
    }

    private function importarServicio($row, $empresaId)
    {
        $v = $this->normalizar($row);
        $nombre = trim((string) ($v->get('nombre') ?? ''));

        if (!$nombre) return false;
        if (Servicio::where('empresa_id', $empresaId)->where('nombre', $nombre)->exists()) return false;

        Servicio::create([
            'categoria_id' => $this->resolverCategoria($empresaId, $v->get('categoria_id'), 'servicios'),
            'empresa_id' => $empresaId,
            'nombre' => $nombre,
            'descripcion' => $v->get('descripcion') ?: null,
            'tarifa' => $this->aNumero($v->get('tarifa')),
            'tiempo_estimado' => $v->get('tiempo_estimado') ?: null,
            'activo' => $this->aBool($v->get('activo') ?? 'Si')
        ]);
        return true;
    }

    private function importarEmpleado($row, $empresaId)
    {
        $v = $this->normalizar($row);
        $codigo = trim((string) ($v->get('codigo_empleado') ?? ''));
        $email = strtolower(trim((string) ($v->get('email_usuario') ?? '')));
        $nombresUsuario = trim((string) ($v->get('nombres_usuario') ?? ''));

        if (!$codigo && !$email && !$nombresUsuario) return false;
        if ($codigo && Empleado::where('empresa_id', $empresaId)->where('codigo_empleado', $codigo)->exists()) return false;

        $usuarioId = null;
        if ($email) {
            $usuario = \App\Models\User::where('email', $email)->where('empresa_id', $empresaId)->first();
            if ($usuario) $usuarioId = $usuario->id;
        }

        $areaId = null;
        $areaRef = $v->get('area_id');
        if ($areaRef) {
            $area = Area::where('empresa_id', $empresaId)->find($areaRef);
            if ($area) $areaId = $area->id;
        }

        $cargoId = null;
        $cargoRef = $v->get('cargo_id');
        if ($cargoRef) {
            $cargo = Cargo::where('empresa_id', $empresaId)->find($cargoRef);
            if ($cargo) $cargoId = $cargo->id;
        }

        Empleado::create([
            'codigo_empleado' => $codigo ?: null,
            'usuario_id' => $usuarioId,
            'empresa_id' => $empresaId,
            'area_id' => $areaId,
            'cargo_id' => $cargoId,
            'fecha_contratacion' => $this->aFecha($v->get('fecha_contratacion')),
            'tipo_contrato' => $v->get('tipo_contrato') ?: null,
            'salario' => $this->aNumero($v->get('salario')),
            'estado' => $this->aEstadoEmpleado($v->get('estado'))
        ]);
        return true;
    }

    // --- HELPERS ---
    private function normalizar($row)
    {
        return collect($row)->mapWithKeys(fn ($valor, $clave) => [
            strtolower(preg_replace('/[^a-zA-Z0-9]+/', '_', trim((string) $clave))) => $valor
        ]);
    }

    private function aBool($valor): bool
    {
        return in_array(strtolower(trim((string) $valor)), ['si', 'sí', 'true', '1', 'activo'], true);
    }

    private function aNumero($valor)
    {
        if ($valor === null || $valor === '') return null;
        $limpio = str_replace([',', ' '], '', trim((string) $valor));
        return is_numeric($limpio) ? $limpio : null;
    }

    private function aFecha($valor)
    {
        if (!$valor) return null;
        try {
            return \Carbon\Carbon::parse($valor)->toDateString();
        } catch (\Throwable $e) {
            return null;
        }
    }

    private function resolverCategoria($empresaId, $categoriaId, $tipo = 'ventas')
    {
        if ($categoriaId) {
            $categoria = Categoria::where('empresa_id', $empresaId)->find($categoriaId);
            if ($categoria) return $categoria->id;
        }

        $existente = Categoria::where('empresa_id', $empresaId)->where('tipo', $tipo)->first();
        if ($existente) return $existente->id;

        $general = Categoria::create([
            'empresa_id' => $empresaId,
            'nombre' => 'General',
            'descripcion' => 'Categoría creada automáticamente por la migración de datos',
            'tipo' => $tipo,
            'activo' => true
        ]);
        return $general->id;
    }

    private function aEstadoEmpleado($valor)
    {
        $permitidos = ['activo', 'inactivo', 'en vacaciones', 'permiso'];
        $estado = strtolower(trim((string) $valor));
        return in_array($estado, $permitidos, true) ? $estado : 'activo';
    }

    private function resumenMigracion($r)
    {
        return "Clientes: {$r['clientes']} · Proveedores: {$r['proveedores']} · Productos: {$r['productos']} · Servicios: {$r['servicios']} · Empleados: {$r['empleados']} · Filas omitidas: {$r['omitidos']}";
    }
}
