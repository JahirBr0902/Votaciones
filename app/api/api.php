<?php
require_once __DIR__ . '/../models/VoteModel.php';
require_once __DIR__ . '/../controllers/VoteController.php';
require_once __DIR__ . '/../controllers/AdminController.php';

use App\Controllers\VoteController;
use App\Controllers\AdminController;

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST');
header('Access-Control-Allow-Headers: Content-Type');

$action = $_POST['action'] ?? $_GET['action'] ?? '';
$controller = new VoteController();
$adminController = new AdminController();

// Peticiones JSON
if ($_SERVER['REQUEST_METHOD'] === 'POST' && empty($_POST)) {
    $input = json_decode(file_get_contents('php://input'), true);
} else {
    $input = $_POST;
}

if ($input) {
    $action = $input['action'] ?? $action;
}

// Función para proteger rutas de admin
function checkAdmin() {
    if (session_status() === PHP_SESSION_NONE) session_start();
    if (!isset($_SESSION['admin_id'])) {
        echo json_encode(['success' => false, 'message' => 'No autorizado']);
        exit;
    }
}

switch ($action) {
    // ACCIONES PÚBLICAS
    case 'get_employees':
        echo json_encode($controller->getEmployees());
        break;
    case 'vote':
        echo json_encode($controller->vote());
        break;
    case 'get_results':
        echo json_encode($controller->getResults());
        break;
    case 'get_public_reasons':
        $employeeId = $_GET['employee_id'] ?? null;
        echo json_encode($controller->getReasons($employeeId));
        break;
    case 'get_reasons':
        checkAdmin();
        $employeeId = $_GET['employee_id'] ?? null;
        echo json_encode($controller->getReasons($employeeId));
        break;
    case 'get_voting_end_time':
        echo json_encode(['success' => true, 'end_time' => $adminController->getEndTime()]);
        break;
    case 'get_show_winner':
        echo json_encode(['success' => true, 'show_winner' => $adminController->getShowWinner()]);
        break;
    case 'get_winner_period':
        echo json_encode($adminController->getWinnerPeriod());
        break;
    case 'set_winner_period':
        checkAdmin();
        echo json_encode($adminController->setWinnerPeriod());
        break;
    case 'login':
        $username = $input['username'] ?? '';
        $password = $input['password'] ?? '';
        echo json_encode($adminController->login($username, $password));
        break;

    // ACCIONES PROTEGIDAS (Solo Admin)
    case 'toggle_voting':
        checkAdmin();
        echo json_encode($adminController->toggleVoting());
        break;
    case 'get_voting_status':
        echo json_encode($adminController->getStatus());
        break;
    case 'toggle_show_winner':
        checkAdmin();
        echo json_encode($adminController->toggleShowWinner());
        break;
    case 'set_voting_end_time':
        checkAdmin();
        echo json_encode($adminController->setEndTime());
        break;
    case 'add_employee':
        checkAdmin();
        echo json_encode($controller->addEmployee($_POST, $_FILES));
        break;
    case 'update_employee':
        checkAdmin();
        echo json_encode($controller->updateEmployee($_POST, $_FILES));
        break;
    case 'get_employee':
        checkAdmin();
        $id = $_GET['id'] ?? 0;
        echo json_encode($controller->getEmployee($id));
        break;
    case 'delete_employee':
        checkAdmin();
        $id = $input['id'] ?? 0;
        echo json_encode($controller->deleteEmployee($id));
        break;
    case 'reset':
        checkAdmin();
        $month = $input['month'] ?? null;
        $year = $input['year'] ?? null;
        echo json_encode($controller->reset($month, $year));
        break;
    case 'logout':
        echo json_encode($adminController->logout());
        break;

    // NGROK CONTROLS (Solo Admin)
    case 'start_ngrok':
        checkAdmin();
        echo json_encode($adminController->startNgrok());
        break;
    case 'stop_ngrok':
        checkAdmin();
        echo json_encode($adminController->stopNgrok());
        break;
    case 'get_ngrok_status':
        checkAdmin();
        echo json_encode($adminController->getNgrokUrl());
        break;

    default:
        echo json_encode(['success' => false, 'message' => 'Acción no válida: ' . $action]);
}
