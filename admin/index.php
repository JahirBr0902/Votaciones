<?php
$meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
$mesActual = $meses[date('n')-1];
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Acceso — Empleado del Mes</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="../assets/css/app.css">
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    <style>
        .login-container { max-width: 400px; margin: 5rem auto; background: var(--card-bg); border: 2px solid var(--ink); padding: 3rem 2rem; box-shadow: 10px 10px 0 var(--border); }
        .login-title { font-family: 'Bebas Neue', sans-serif; font-size: 3rem; line-height: 1; margin-bottom: 2rem; text-align: center; }
        .form-group { margin-bottom: 1.5rem; }
        .form-group label { display: block; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 0.5rem; color: var(--muted); }
        .form-control { width: 100%; padding: 0.8rem; border: 1px solid var(--border); font-family: inherit; background: var(--paper); }
        .btn-login { width: 100%; margin-top: 1rem; }
    </style>
</head>
<body>
<header>
    <div class="masthead">
        <div class="vol-info"><?php echo $mesActual; ?> — Autenticación Requerida</div>
        <div class="site-title">VOTACIONES <span>TMAC</span></div>
    </div>
</header>
<main>
    <div class="login-container">
        <h2 class="login-title">Identificación</h2>
        <form id="login-form" autocomplete="off">
            <div class="form-group">
                <label>Usuario Administrador</label>
                <input type="text" name="username" class="form-control" placeholder="admin" required>
            </div>
            <div class="form-group">
                <label>Contraseña</label>
                <input type="password" name="password" class="form-control" placeholder="••••••••" required>
            </div>
            <button type="submit" class="btn-vote btn-login" id="btn-login">
                <span>✦ Acceder</span>
            </button>
            <div id="login-message" style="margin-top: 1rem; font-size: 0.8rem; color: var(--crimson); text-align: center;"></div>
        </form>
    </div>
</main>

<script src="../assets/js/auth.js"></script>
</body>
</html>
