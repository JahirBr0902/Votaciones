<?php
$meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
$mesActual = $meses[date('n')-1];
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Votación — Empleado del Mes</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="assets/css/app.css">
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
</head>
<body>

<header>
    <div class="masthead">
        <div class="vol-info" id="current-period-text"><?php echo $mesActual; ?> — Edición Mensual · <?php echo date('Y'); ?></div>
        <div class="site-title"> VOTACIONES <span>TMAC</span></div>
    </div>
    <div id="header-meta-container">
        <div class="header-meta">
            <strong>ACTIVO</strong>
            Elección en curso
        </div>
        <div id="voting-timer" class="header-meta" style="display:none; border-left: 1px solid var(--border); padding-left: 1.5rem;">
            <strong id="timer-countdown">00:00:00</strong>
            Tiempo restante
        </div>
    </div>
</header>

<div class="divider-ornament">✦ &nbsp; ELECCIÓN MENSUAL &nbsp; ✦</div>

<main id="main-content">
    <div class="loading">
        <div class="spinner"></div>
        Iniciando aplicación...
    </div>
</main>

<div class="toast" id="toast"></div>

<script src="assets/js/app.js"></script>
</body>
</html>
