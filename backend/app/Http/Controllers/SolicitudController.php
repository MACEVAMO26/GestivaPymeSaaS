<?php

namespace App\Http\Controllers;

use App\Models\Solicitud;
use App\Models\SolicitudRespuesta;
use App\Models\Notificacion;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class SolicitudController extends Controller
{
    // Bandeja del usuario: solicitudes que solicitó + las que debe decidir
    public function index(Request $request)
    {
        $user = Auth::user();

        $misSolicitudes = Solicitud::with(['solicitante:id,primer_nombre,segundo_nombre,primer_apellido,segundo_apellido', 'decisor:id,primer_nombre,segundo_nombre,primer_apellido,segundo_apellido', 'respuestas.usuario:id,primer_nombre,segundo_nombre,primer_apellido,segundo_apellido'])
            ->where('empresa_id', $user->empresa_id)
            ->where(function ($q) use ($user) {
                $q->where('solicitante_id', $user->id)
                  ->orWhere('decisor_id', $user->id);
            })
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($misSolicitudes);
    }

    // Bandeja de decisiones: solicitudes pendientes para el Jefe de Área / Gerente
    public function bandeja(Request $request)
    {
        $user = Auth::user();
        $rolNombre = $user->rol->nombre ?? '';
        $cargoNombre = strtolower($user->empleado->cargo->nombre ?? '');
        $esRRHH = str_contains($cargoNombre, 'recursos humanos') || str_contains($cargoNombre, 'gestión humana') || str_contains($cargoNombre, 'rrhh');

        if (!in_array($rolNombre, ['Gerente General', 'Jefe de Área']) && !$esRRHH) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $solicitudes = Solicitud::with(['solicitante:id,primer_nombre,segundo_nombre,primer_apellido,segundo_apellido', 'respuestas.usuario:id,primer_nombre,segundo_nombre,primer_apellido,segundo_apellido'])
            ->where('empresa_id', $user->empresa_id)
            ->whereIn('estado', ['pendiente', 'en_replica'])
            ->orderBy('created_at', 'asc')
            ->get();

        return response()->json($solicitudes);
    }

    // El operario crea una solicitud de acción (inactivar/eliminar/cambiar)
    public function store(Request $request)
    {
        $user = Auth::user();

        $validated = $request->validate([
            'area' => 'required|string|max:100',
            'entidad' => 'nullable|string|max:100',
            'entidad_id' => 'nullable|integer',
            'accion' => 'required|string|max:100',
            'motivo' => 'nullable|string',
            'documento_url' => 'nullable|string|max:255',
        ]);

        $decisor = $this->obtenerDecisor($user->empresa_id);

        $solicitud = Solicitud::create([
            'empresa_id' => $user->empresa_id,
            'solicitante_id' => $user->id,
            'area' => $validated['area'],
            'entidad' => $validated['entidad'] ?? null,
            'entidad_id' => $validated['entidad_id'] ?? null,
            'accion' => $validated['accion'],
            'motivo' => $validated['motivo'] ?? null,
            'documento_url' => $validated['documento_url'] ?? null,
            'estado' => 'pendiente',
            'decisor_id' => $decisor ? $decisor->id : null,
        ]);

        if ($decisor) {
            Notificacion::create([
                'usuario_id' => $decisor->id,
                'titulo' => 'Nueva solicitud de acción',
                'descripcion' => "{$user->primer_nombre} {$user->primer_apellido} solicita: {$validated['accion']} ({$validated['area']}).",
                'leida' => false,
            ]);
        }

        return response()->json(['message' => 'Solicitud enviada', 'solicitud' => $solicitud], 201);
    }

    // Réplica: cualquiera de los participantes responde dentro del hilo
    public function responder(Request $request, $id)
    {
        $user = Auth::user();
        $solicitud = Solicitud::where('empresa_id', $user->empresa_id)->findOrFail($id);

        $validated = $request->validate([
            'mensaje' => 'required|string',
        ]);

        $respuesta = SolicitudRespuesta::create([
            'solicitud_id' => $solicitud->id,
            'usuario_id' => $user->id,
            'mensaje' => $validated['mensaje'],
        ]);

        $solicitud->estado = 'en_replica';
        $solicitud->save();

        // Notificar al otro participante del hilo
        $destinoId = $user->id === $solicitud->solicitante_id ? $solicitud->decisor_id : $solicitud->solicitante_id;
        if ($destinoId) {
            Notificacion::create([
                'usuario_id' => $destinoId,
                'titulo' => 'Nueva réplica en solicitud',
                'descripcion' => "{$user->primer_nombre} {$user->primer_apellido} respondió a la solicitud #{$solicitud->id}.",
                'leida' => false,
            ]);
        }

        return response()->json(['message' => 'Respuesta enviada', 'respuesta' => $respuesta]);
    }

    // El Jefe de Área aprueba y ejecuta la acción (p.ej. inactiva la entidad)
    public function aprobar(Request $request, $id)
    {
        $user = Auth::user();
        $rolNombre = $user->rol->nombre ?? '';

        if (!in_array($rolNombre, ['Gerente General', 'Jefe de Área'])) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $solicitud = Solicitud::where('empresa_id', $user->empresa_id)->findOrFail($id);
        $validated = $request->validate([
            'nota_final' => 'nullable|string',
        ]);

        DB::beginTransaction();
        try {
            if ($solicitud->entidad && $solicitud->entidad_id) {
                $this->ejecutarAccion($solicitud);
            }

            $solicitud->estado = 'ejecutada';
            $solicitud->decisor_id = $user->id;
            $solicitud->nota_final = $validated['nota_final'] ?? null;
            $solicitud->save();

            Notificacion::create([
                'usuario_id' => $solicitud->solicitante_id,
                'titulo' => 'Solicitud ejecutada',
                'descripcion' => "El Jefe de Área aprobó y ejecutó: {$solicitud->accion}.",
                'leida' => false,
            ]);

            DB::commit();
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => 'No se pudo ejecutar la acción: ' . $e->getMessage()], 500);
        }

        return response()->json(['message' => 'Solicitud aprobada y ejecutada', 'solicitud' => $solicitud]);
    }

    // El Jefe de Área rechaza con nota
    public function rechazar(Request $request, $id)
    {
        $user = Auth::user();
        $rolNombre = $user->rol->nombre ?? '';

        if (!in_array($rolNombre, ['Gerente General', 'Jefe de Área'])) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $solicitud = Solicitud::where('empresa_id', $user->empresa_id)->findOrFail($id);

        $validated = $request->validate([
            'nota_final' => 'required|string',
        ]);

        $solicitud->estado = 'rechazada';
        $solicitud->decisor_id = $user->id;
        $solicitud->nota_final = $validated['nota_final'];
        $solicitud->save();

        Notificacion::create([
            'usuario_id' => $solicitud->solicitante_id,
            'titulo' => 'Solicitud rechazada',
            'descripcion' => "Tu solicitud de {$solicitud->accion} fue rechazada. Motivo: {$validated['nota_final']}",
            'leida' => false,
        ]);

        return response()->json(['message' => 'Solicitud rechazada', 'solicitud' => $solicitud]);
    }

    // Devuelve el decisor: Jefe de Área activo de la empresa; si no, el Gerente General
    private function obtenerDecisor($empresaId)
    {
        $jefe = User::where('empresa_id', $empresaId)
            ->whereHas('rol', function ($q) {
                $q->where('nombre', 'Jefe de Área');
            })
            ->orderBy('id')
            ->first();

        if ($jefe) {
            return $jefe;
        }

        return User::where('empresa_id', $empresaId)
            ->whereHas('rol', function ($q) {
                $q->where('nombre', 'Gerente General');
            })
            ->orderBy('id')
            ->first();
    }

    // Ejecuta la acción sobre la entidad objetivo (borrado lógico)
    private function ejecutarAccion(Solicitud $solicitud)
    {
        $mapa = [
            'proveedores' => \App\Models\Proveedor::class,
            'clientes' => \App\Models\Cliente::class,
            'productos' => \App\Models\Producto::class,
            'servicios' => \App\Models\Servicio::class,
            'categorias' => \App\Models\Categoria::class,
            'empleados' => \App\Models\Empleado::class,
            'cajas' => \App\Models\Caja::class,
            'tickets' => \App\Models\TicketServicio::class,
        ];

        $modelo = $mapa[$solicitud->entidad] ?? null;
        if (!$modelo) {
            return;
        }

        $entidad = $modelo::where('empresa_id', $solicitud->empresa_id)->find($solicitud->entidad_id);
        if (!$entidad) {
            throw new \Exception('Entidad no encontrada');
        }

        $accion = strtolower($solicitud->accion);

        // Tickets de servicio: la baja equivale a cancelar el ticket
        if ($solicitud->entidad === 'tickets') {
            $entidad->estado = 'Cancelado';
            $entidad->save();
            return;
        }

        // Cajas: la baja equivale a cerrar la caja
        if ($solicitud->entidad === 'cajas') {
            $entidad->estado = 'cerrada';
            if (in_array('cerrada_en', $entidad->getFillable() ?? [])) {
                $entidad->cerrada_en = now();
            }
            $entidad->save();
            return;
        }

        if (str_contains($accion, 'inactivar') || str_contains($accion, 'eliminar') || str_contains($accion, 'baja')) {
            $entidad->activo = 0;
            if (in_array('inactive_at', $entidad->getFillable() ?? [])) {
                $entidad->inactive_at = now();
            }
            $entidad->save();
        }
    }
}