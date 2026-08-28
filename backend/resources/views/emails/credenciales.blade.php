<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Bienvenido a GestivaPyme</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #f4f7f6;
            margin: 0;
            padding: 0;
        }
        .container {
            max-width: 600px;
            margin: 40px auto;
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .header {
            background-color: #3b82f6;
            color: #ffffff;
            padding: 20px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
        }
        .content {
            padding: 30px;
            color: #333333;
            line-height: 1.6;
        }
        .credentials-box {
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 20px;
            margin: 20px 0;
        }
        .credentials-box p {
            margin: 5px 0;
        }
        .btn {
            display: inline-block;
            background-color: #10b981;
            color: #ffffff;
            text-decoration: none;
            padding: 12px 24px;
            border-radius: 4px;
            font-weight: bold;
            margin-top: 10px;
        }
        .footer {
            background-color: #f1f5f9;
            color: #64748b;
            text-align: center;
            padding: 15px;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>¡Bienvenido a {{ $empresaNombre }}!</h1>
        </div>
        <div class="content">
            <p>Hola <strong>{{ $user->nombres }}</strong>,</p>
            <p>Tu cuenta corporativa ha sido creada exitosamente. A continuación encontrarás tus credenciales de acceso a la plataforma GestivaPyme.</p>
            
            <div class="credentials-box">
                <p><strong>Usuario:</strong> {{ $user->email }}</p>
                <p><strong>Contraseña:</strong> {{ $password }}</p>
            </div>
            
            <p>Por motivos de seguridad, el sistema te solicitará cambiar esta contraseña la primera vez que inicies sesión.</p>
            
            <p style="text-align: center;">
                <a href="{{ env('FRONTEND_URL', 'http://localhost:4200') }}" class="btn">Ingresar al Sistema</a>
            </p>
        </div>
        <div class="footer">
            <p>Este es un correo automático de GestivaPyme. Por favor, no respondas a este mensaje.</p>
        </div>
    </div>
</body>
</html>
