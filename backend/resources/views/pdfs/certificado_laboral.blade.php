<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <title>Certificado Laboral - {{ $nombre }}</title>
    <style>
        @page {
            margin: 3.5cm 3cm 3cm 3cm;
        }
        body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            color: #1a202c;
            line-height: 1.8;
            font-size: 13pt;
        }
        .header {
            text-align: center;
            border-bottom: 2px solid #2563eb;
            padding-bottom: 18px;
            margin-bottom: 35px;
        }
        .company-title {
            font-size: 17pt;
            font-weight: bold;
            color: #1e3a8a;
            text-transform: uppercase;
            margin: 0;
            letter-spacing: 0.5px;
        }
        .company-nit {
            font-size: 11pt;
            color: #4b5563;
            margin-top: 4px;
            margin-bottom: 0;
            font-weight: 500;
        }
        .cert-header {
            text-align: center;
            margin-top: 30px;
            margin-bottom: 35px;
        }
        .cert-subtitle {
            font-size: 12pt;
            color: #374151;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 12px;
        }
        .cert-title {
            font-size: 18pt;
            font-weight: bold;
            color: #111827;
            letter-spacing: 2px;
            margin: 0;
            text-decoration: underline;
        }
        .content {
            text-align: justify;
            margin-bottom: 30px;
        }
        .content p {
            margin-bottom: 22px;
            text-indent: 0;
        }
        .highlight {
            font-weight: bold;
            color: #0f172a;
        }
        .data-box {
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 14px 20px;
            margin: 25px 0;
        }
        .data-box table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12pt;
        }
        .data-box td {
            padding: 6px 0;
            vertical-align: top;
        }
        .data-box td.label {
            width: 35%;
            color: #64748b;
            font-weight: bold;
        }
        .data-box td.val {
            width: 65%;
            color: #0f172a;
            font-weight: 600;
        }
        .signature-block {
            margin-top: 55px;
            page-break-inside: avoid;
        }
        .signature-name {
            font-weight: bold;
            font-size: 13pt;
            color: #111827;
            margin: 0;
        }
        .signature-role {
            font-size: 11pt;
            color: #4b5563;
            margin: 2px 0 0 0;
        }
        .signature-dept {
            font-size: 10pt;
            color: #6b7280;
            margin: 2px 0 0 0;
        }
        .footer-note {
            margin-top: 45px;
            padding-top: 15px;
            border-top: 1px dashed #cbd5e1;
            font-size: 9pt;
            color: #94a3b8;
            text-align: center;
        }
    </style>
</head>
<body>

    <div class="header">
        <h1 class="company-title">{{ $empresa }}</h1>
        <p class="company-nit">NIT: {{ $nit }} &bull; Sede Principal Colombia</p>
    </div>

    <div class="cert-header">
        <div class="cert-subtitle">EL DEPARTAMENTO DE GESTIÓN HUMANA Y TALENTO ORGANIZACIONAL</div>
        <h2 class="cert-title">CERTIFICA:</h2>
    </div>

    <div class="content">
        <p>
            Que el(la) señor(a) <span class="highlight">{{ strtoupper($nombre) }}</span>, identificado(a) con cédula de ciudadanía número <span class="highlight">{{ $cedula }}</span>, labora en nuestra organización prestando sus servicios profesionales y laborales conforme al siguiente detalle contractual:
        </p>

        <div class="data-box">
            <table>
                <tr>
                    <td class="label">Cargo Desempeñado:</td>
                    <td class="val">{{ strtoupper($cargo) }}</td>
                </tr>
                @if(!empty($area))
                <tr>
                    <td class="label">Área / Departamento:</td>
                    <td class="val">{{ $area }}</td>
                </tr>
                @endif
                <tr>
                    <td class="label">Tipo de Contrato:</td>
                    <td class="val">{{ $tipo_contrato }}</td>
                </tr>
                <tr>
                    <td class="label">Fecha de Inicio:</td>
                    <td class="val">{{ $fecha_ingreso }}</td>
                </tr>
                <tr>
                    <td class="label">Asignación Salarial:</td>
                    <td class="val">${{ $salario }} COP Mensual</td>
                </tr>
                <tr>
                    <td class="label">Estado Actual:</td>
                    <td class="val" style="color: #16a34a;">Vigente y Activo</td>
                </tr>
            </table>
        </div>

        <p>
            A la fecha de expedición del presente documento, el colaborador se encuentra vinculado formalmente, cumpliendo a cabalidad con sus funciones y responsabilidades asignadas.
        </p>

        <p>
            Para constancia de lo anterior, la presente certificación se expide a solicitud del interesado en la ciudad de <strong>{{ $ciudad ?? 'Bogotá D.C.' }}</strong>, con fecha de emisión el día <strong>{{ $fecha_actual }}</strong>.
        </p>
    </div>

    <div class="signature-block">
        <p style="margin-bottom: 45px; color: #4b5563;">Cordialmente,</p>
        <p style="margin: 0; color: #1e3a8a; font-weight: bold; font-family: monospace; font-size: 11pt; letter-spacing: 1px;">[ FIRMA DIGITAL VALIDADA ]</p>
        <div style="width: 260px; height: 1px; background: #0f172a; margin: 8px 0 10px 0;"></div>
        <p class="signature-name">DIRECCIÓN DE GESTIÓN HUMANA</p>
        <p class="signature-role">{{ $empresa }}</p>
        <p class="signature-dept">Área de Talento y Administración SaaS</p>
    </div>

    <div class="footer-note">
        Documento generado electrónicamente por el sistema GestivaPyme SaaS &bull; Código de Verificación Único: <strong>{{ $codigo_verificacion ?? 'GP-2026-VAL' }}</strong>
    </div>

</body>
</html>
