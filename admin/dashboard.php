<?php
session_start();
if (!isset($_SESSION['admin_id'])) {
    header('Location: ./');
    exit;
}
$meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
$mesActualNum = date('n');
$mesActualNombre = $meses[$mesActualNum-1];
$anioActual = date('Y');
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard — Administración</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="../assets/css/app.css">
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    <style>
        .admin-controls { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.5rem; }
        .control-card { background: var(--card-bg); border: 1px solid var(--border); padding: 1.5rem; }
        .switch-container { display: flex; align-items: center; justify-content: space-between; margin-top: 1rem; }
        .toggle { position: relative; display: inline-block; width: 50px; height: 28px; }
        .toggle input { opacity: 0; width: 0; height: 0; }
        .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: var(--border); transition: .4s; border-radius: 34px; }
        .slider:before { position: absolute; content: ""; height: 20px; width: 20px; left: 4px; bottom: 4px; background-color: white; transition: .4s; border-radius: 50%; }
        input:checked + .slider { background-color: var(--accent-light); }
        input:checked + .slider:before { transform: translateX(22px); }
        .btn-danger { background: var(--company-blue); color: white; border: none; padding: 0.8rem 1.5rem; cursor: pointer; font-family: 'Bebas Neue', sans-serif; font-size: 1.1rem; letter-spacing: 0.1em; width: 100%; }
        .btn-logout { background: transparent; border: 1px solid var(--muted); color: var(--muted); padding: 0.4rem 1rem; font-size: 0.7rem; text-transform: uppercase; cursor: pointer; }
        
        .history-selector { 
            display: flex; 
            gap: 1rem; 
            margin-bottom: 2rem; 
            background: var(--paper); 
            padding: 1.2rem; 
            border: 1px solid var(--border);
            align-items: flex-end;
        }
        .form-group-inline { flex: 1; }
        .form-group-inline label { display: block; font-size: 0.6rem; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 0.4rem; color: var(--muted); }
        .select-control { width: 100%; padding: 0.5rem; border: 1px solid var(--border); font-family: inherit; font-size: 0.85rem; }
        .btn-filter { background: var(--accent); color: white; border: none; padding: 0.5rem 1.2rem; cursor: pointer; font-family: 'Bebas Neue', sans-serif; }
    </style>
</head>
<body>
<header>
    <div class="masthead">
        <div class="vol-info"><?php echo $mesActualNombre; ?> — Panel Administrativo</div>
        <div class="site-title">AD<span>MIN</span></div>
    </div>
    <div class="header-meta">
        <strong><?php echo $_SESSION['admin_user']; ?></strong>
        <button onclick="Admin.confirmLogout()" class="btn-logout">Cerrar Sesión</button>
    </div>
</header>

<main>
    <!-- SECCIÓN 1: CONTROL MAESTRO -->
    <div class="collapsible-section active" id="section-controls">
        <div class="collapsible-header" onclick="toggleSection('section-controls')">
            <h3>Control de Votaciones</h3>
        </div>
        <div class="collapsible-content">
            <div class="admin-controls">
                <div class="control-card">
                    <h4 style="font-family: 'Bebas Neue', sans-serif; font-size: 1.4rem;">Estado General</h4>
                    <div class="switch-container">
                        <span id="status-text">Cargando...</span>
                        <label class="toggle">
                            <input type="checkbox" id="voting-toggle" onchange="Admin.toggleVoting(this.checked)">
                            <span class="slider"></span>
                        </label>
                    </div>
                </div>

                <div class="control-card">
                    <h4 style="font-family: 'Bebas Neue', sans-serif; font-size: 1.4rem;">Anuncio de Ganador</h4>
                    <div class="switch-container">
                        <span id="winner-status-text">Cargando...</span>
                        <label class="toggle">
                            <input type="checkbox" id="winner-toggle" onchange="Admin.toggleShowWinner(this.checked)">
                            <span class="slider"></span>
                        </label>
                    </div>
                </div>

                <div class="control-card">
                    <h4 style="font-family: 'Bebas Neue', sans-serif; font-size: 1.4rem;">Tiempo de Cierre</h4>
                    <div style="margin-top: 0.8rem; display: flex; gap: 0.3rem;">
                        <input type="datetime-local" id="voting-end-time" class="select-control">
                        <button onclick="Admin.saveEndTime()" class="btn-filter">OK</button>
                    </div>
                    <button onclick="Admin.clearEndTime()" style="background:none; border:none; color:var(--muted); font-size:0.6rem; text-decoration:underline; cursor:pointer; margin-top:0.5rem;">Limpiar tiempo</button>
                </div>

                <div class="control-card">
                    <h4 style="font-family: 'Bebas Neue', sans-serif; font-size: 1.4rem;">Reinicio</h4>
                    <button onclick="Admin.resetVotes()" class="btn-danger" style="margin-top: 0.8rem; font-size: 0.9rem; padding: 0.5rem;">Limpiar Periodo</button>
                </div>
            </div>
        </div>
    </div>

    <!-- SECCIÓN 2: GESTIÓN DE CANDIDATOS -->
    <div class="collapsible-section" id="section-employees">
        <div class="collapsible-header" onclick="toggleSection('section-employees')">
            <h3>Gestión de Candidatos</h3>
        </div>
        <div class="collapsible-content">
            <div style="background: var(--paper); padding: 1.5rem; border: 1px solid var(--border); margin-bottom: 2rem;">
                <h4 style="font-family: 'Bebas Neue', sans-serif; font-size: 1.4rem; margin-bottom: 1rem;">Agregar Nuevo</h4>
                <form id="add-employee-form" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)) auto; gap: 1rem; align-items: flex-end;">
                    <input type="hidden" name="action" value="add_employee">
                    <div class="form-group-inline">
                        <label>Nombre Completo</label>
                        <input type="text" name="name" class="select-control" required>
                    </div>
                    <div class="form-group-inline">
                        <label>Empresa</label>
                        <select name="company" class="select-control">
                            <option value="Witmac">Witmac</option>
                            <option value="RyP">Recargalos y Pagalos</option>
                        </select>
                    </div>
                    <div class="form-group-inline">
                        <label>Departamento</label>
                        <input type="text" name="department" class="select-control" required>
                    </div>
                    <div class="form-group-inline">
                        <label>Foto</label>
                        <input type="file" name="image" class="select-control" accept="image/*" style="padding: 0.3rem;">
                    </div>
                    <button type="submit" class="btn-filter" style="height: 38px;">Añadir</button>
                </form>
            </div>

            <div id="admin-employees-list">
                <!-- Tabla de empleados -->
            </div>
        </div>
    </div>

    <!-- SECCIÓN 3: RESULTADOS E HISTORIAL -->
    <div class="collapsible-section" id="section-history">
        <div class="collapsible-header" onclick="toggleSection('section-history')">
            <h3>Monitor de Resultados e Historial</h3>
        </div>
        <div class="collapsible-content">
            <div class="history-selector">
                <div class="form-group-inline">
                    <label>Mes</label>
                    <select id="filter-month" class="select-control">
                        <?php foreach($meses as $i => $m): ?>
                            <option value="<?php echo sprintf('%02d', $i+1); ?>" <?php echo ($i+1 == $mesActualNum) ? 'selected' : ''; ?>>
                                <?php echo $m; ?>
                            </option>
                        <?php endforeach; ?>
                    </select>
                </div>
                <div class="form-group-inline">
                    <label>Año</label>
                    <select id="filter-year" class="select-control">
                        <?php for($y = $anioActual; $y >= 2024; $y--): ?>
                            <option value="<?php echo $y; ?>"><?php echo $y; ?></option>
                        <?php endfor; ?>
                    </select>
                </div>
                <button onclick="Admin.loadPeriodResults()" class="btn-filter">Consultar</button>
                <button onclick="Admin.viewReasons()" class="btn-filter" style="background: var(--ink); margin-left: auto;">Ver Motivos</button>
            </div>

            <div id="stats-bar" class="stats-bar" style="display:none; margin-bottom: 2rem;">
                <div class="stat">
                    <div class="stat-value" id="total-votes">—</div>
                    <div class="stat-label">Total votos</div>
                </div>
                <div class="stat">
                    <div class="stat-value" id="period-label">—</div>
                    <div class="stat-label">Periodo</div>
                </div>
            </div>

            <div id="results-container">
                <!-- Resultados agrupados por empresa -->
            </div>
        </div>
    </div>
</main>

<script>
    function toggleSection(id) {
        const section = document.getElementById(id);
        const isActive = section.classList.contains('active');
        
        // Opcional: Cerrar las demás (comportamiento acordeón)
        // document.querySelectorAll('.collapsible-section').forEach(s => s.classList.remove('active'));
        
        if (isActive) {
            section.classList.remove('active');
        } else {
            section.classList.add('active');
        }
    }
</script>
<script src="../assets/js/app.js"></script>
<script src="../assets/js/admin.js"></script>
</body>
</html>
