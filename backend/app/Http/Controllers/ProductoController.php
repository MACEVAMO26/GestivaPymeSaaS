<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Models\Producto;
use App\Models\Inventario;
use CloudinaryLabs\CloudinaryLaravel\Facades\Cloudinary;

class ProductoController extends Controller
{
    // Bloque para listar los productos activos pertenecientes a la empresa autenticada
    public function index()
    {
        $user = Auth::user();
        $empresaId = request()->header('X-Empresa-Id') ?? ($user?->empresa_id ?? null);
        if (!$empresaId) {
            return response()->json(['message' => 'No autorizado'], 401);
        }

        $productos = Producto::with('categoria')
            ->where('empresa_id', $empresaId)
            ->where('activo', true)
            ->get();

        return response()->json($productos);
    }

    // Bloque para registrar un nuevo producto en catálogo con inventario inicial
    public function store(Request $request)
    {
        // Bloque de reglas de validación
        $request->validate([
            'categoria_id' => 'required|exists:categorias,id',
            'nombre' => 'required|string|max:255',
            'descripcion' => 'nullable|string',
            'precio_compra' => 'required|numeric',
            'precio_venta' => 'required|numeric',
            'stock_inicial' => 'required|integer|min:0',
            'unidad_medida' => 'required|string',
            'imagen' => 'nullable|image|mimes:jpeg,png,jpg,gif,svg|max:2048',
        ]);

        $user = Auth::user();
        $empresaId = request()->header('X-Empresa-Id') ?? ($user?->empresa_id ?? null);
        $data = $request->except('imagen');
        $data['empresa_id'] = $empresaId;
        $data['activo'] = true;

        if ($request->hasFile('imagen')) {
            $uploadedFileUrl = Cloudinary::upload($request->file('imagen')->getRealPath())->getSecurePath();
            $data['imagen_url'] = $uploadedFileUrl;
        }

        // Bloque de guardado en BD
        $producto = Producto::create($data);

        // Bloque para inicializar las existencias en inventario
        Inventario::create([
            'producto_id' => $producto->id,
            'stock_actual' => $producto->stock_inicial,
            'stock_minimo' => 0,
            'bodega' => 'Principal',
        ]);

        return response()->json([
            'message' => 'Producto creado con éxito',
            'producto' => $producto
        ], 201);
    }

    // Bloque para consultar el detalle de un producto específico
    public function show($id)
    {
        $producto = Producto::with('categoria')->findOrFail($id);
        return response()->json($producto);
    }

    // Bloque para actualizar los datos comerciales y catálogo de un producto
    public function update(Request $request, $id)
    {
        // Bloque de reglas de validación
        $request->validate([
            'categoria_id' => 'sometimes|exists:categorias,id',
            'nombre' => 'sometimes|string|max:255',
            'descripcion' => 'nullable|string',
            'precio_compra' => 'sometimes|numeric',
            'precio_venta' => 'sometimes|numeric',
            'unidad_medida' => 'sometimes|string',
            'imagen' => 'nullable|image|mimes:jpeg,png,jpg,gif,svg|max:2048',
        ]);

        $producto = Producto::findOrFail($id);
        $data = $request->except('imagen');

        if ($request->hasFile('imagen')) {
            $uploadedFileUrl = Cloudinary::upload($request->file('imagen')->getRealPath())->getSecurePath();
            $data['imagen_url'] = $uploadedFileUrl;
        }

        // Bloque de guardado en BD
        $producto->update($data);

        return response()->json([
            'message' => 'Producto actualizado con éxito',
            'producto' => $producto
        ]);
    }

    // Bloque para inactivar lógicamente un producto del catálogo
    public function destroy($id)
    {
        $producto = Producto::findOrFail($id);
        $producto->activo = false;
        $producto->inactive_at = now();
        // Bloque de guardado en BD
        $producto->save();

        return response()->json(['message' => 'Producto eliminado correctamente']);
    }
}
