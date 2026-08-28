<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Certificado Laboral</title>
    <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; }
        .header { text-align: center; margin-bottom: 50px; }
        .header h1 { margin: 0; color: #1f2937; }
        .header p { margin: 0; color: #6b7280; }
        .content { margin: 0 50px; text-align: justify; font-size: 14px; }
        .signature { margin-top: 80px; margin-left: 50px; }
        .signature-img { width: 150px; opacity: 0.8; margin-bottom: -20px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>{{ $empresa }}</h1>
        <p>NIT: {{ $nit }}</p>
    </div>

    <div class="content">
        <h2 style="text-align: center; margin-bottom: 40px; text-decoration: underline;">CERTIFICA QUE:</h2>

        <p>
            El(la) señor(a) <strong>{{ strtoupper($nombre) }}</strong>, identificado(a) con cédula de ciudadanía número <strong>{{ $cedula }}</strong>, 
            labora (o laboró) en nuestra empresa prestando sus servicios bajo un contrato de <strong>{{ $tipo_contrato }}</strong>.
        </p>
        <p>
            Actualmente desempeña el cargo de <strong>{{ strtoupper($cargo) }}</strong>, labor que viene realizando desde el día <strong>{{ $fecha_ingreso }}</strong>.
        </p>
        
        <p style="margin-top: 60px;">
            Para constancia, este documento se expide a solicitud del interesado, a los <strong>{{ date('d', strtotime($fecha_actual)) }}</strong> días del mes de <strong>{{ date('m', strtotime($fecha_actual)) }}</strong> de <strong>{{ date('Y', strtotime($fecha_actual)) }}</strong>.
        </p>
    </div>

    <div class="signature">
        <p>Atentamente,</p>
        <!-- Firma electrónica simulada -->
        <h2 style="font-family: 'Brush Script MT', cursive; color: #1e3a8a; margin: 10px 0;">LADYMARY</h2>
        <p style="margin: 0;">___________________________________</p>
        <p style="margin: 5px 0 0 0;"><strong>LADYMARY</strong></p>
        <p style="margin: 0; color: #4b5563;">Jefa de Recursos Humanos</p>
        <p style="margin: 0; color: #4b5563;">rrhh@gestivapyme.com</p>
    </div>
</body>
</html>
