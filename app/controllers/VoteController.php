<?php
namespace App\Controllers;

require_once __DIR__ . '/../models/VoteModel.php';
require_once __DIR__ . '/../models/AdminModel.php';

use App\Models\VoteModel;
use App\Models\AdminModel;

class VoteController {
    private $model;

    public function __construct() {
        $this->model = new VoteModel();
    }

    public function getEmployees() {
        if (session_status() === PHP_SESSION_NONE) session_start();
        
        $employees = $this->model->getEmployees();
        $month = date('m');
        $year = date('Y');

        // Detectar qué empresas ya votó este usuario en la sesión actual
        $votedCompanies = [];
        if (isset($_SESSION["voted_witmac_$month-$year"])) $votedCompanies[] = 'Witmac';
        if (isset($_SESSION["voted_ryp_$month-$year"])) $votedCompanies[] = 'RyP';

        return [
            'success' => true, 
            'employees' => $employees,
            'voted_companies' => $votedCompanies
        ];
    }

    public function vote() {
        $input = json_decode(file_get_contents('php://input'), true);
        $employeeId = $input['employee_id'] ?? 0;
        $fingerprint = $input['fingerprint'] ?? null;
        $reason = $input['reason'] ?? '';

        return $this->model->vote((int)$employeeId, $fingerprint, $reason);
    }

    public function getResults() {
        if (session_status() === PHP_SESSION_NONE) session_start();
        $adminModel = new AdminModel();
        
        $month = $_GET['month'] ?? null;
        $year = $_GET['year'] ?? null;
        $isAdmin = isset($_SESSION['admin_id']);
        $revealWinner = $adminModel->getShowWinner();

        // Si es vista pública y modo ganador está ON, y NO se pidió un mes específico,
        // forzamos el periodo que el admin configuró para mostrar.
        if (!$isAdmin && $revealWinner && empty($month)) {
            $period = $adminModel->getWinnerPeriod();
            $month = $period['month'];
            $year = $period['year'];
        }

        $month = $month ?? date('m');
        $year = $year ?? date('Y');

        return $this->model->getResults(!$isAdmin, $month, $year, $revealWinner);
    }

    public function reset($month = null, $year = null) {
        return $this->model->reset($month, $year);
    }

    public function addEmployee($post = null, $files = null) {
        $name = $post['name'] ?? '';
        $dept = $post['department'] ?? '';
        $company = $post['company'] ?? 'Witmac';
        $imagePath = 'assets/img/empleados/default.jpg';

        if (empty($name) || empty($dept)) {
            return ['success' => false, 'message' => 'Nombre y departamento obligatorios'];
        }

        if ($files && isset($files['image']) && $files['image']['error'] === UPLOAD_ERR_OK) {
            $uploadDir = __DIR__ . '/../../assets/img/empleados/';
            $ext = strtolower(pathinfo($files['image']['name'], PATHINFO_EXTENSION));
            $allowed = ['jpg', 'jpeg', 'png', 'webp'];
            
            if (in_array($ext, $allowed)) {
                $cleanName = strtolower(trim(preg_replace('/[^A-Za-z0-9-]+/', '_', $name)));
                $fileName = $cleanName . '_' . time() . '.' . $ext;
                if (move_uploaded_file($files['image']['tmp_name'], $uploadDir . $fileName)) {
                    $imagePath = 'assets/img/empleados/' . $fileName;
                }
            } else {
                return ['success' => false, 'message' => 'Formato de imagen no válido'];
            }
        }
        return $this->model->addEmployee($name, $dept, $company, $imagePath);
    }

    public function getEmployee($id) {
        $employee = $this->model->getEmployeeById($id);
        return ['success' => !empty($employee), 'employee' => $employee];
    }

    public function updateEmployee($post = null, $files = null) {
        $id = $post['id'] ?? 0;
        $name = $post['name'] ?? '';
        $dept = $post['department'] ?? '';
        $company = $post['company'] ?? 'Witmac';
        $imagePath = null;

        if (empty($id) || empty($name) || empty($dept)) {
            return ['success' => false, 'message' => 'ID, nombre y departamento obligatorios'];
        }

        if ($files && isset($files['image']) && $files['image']['error'] === UPLOAD_ERR_OK) {
            $uploadDir = __DIR__ . '/../../assets/img/empleados/';
            $ext = strtolower(pathinfo($files['image']['name'], PATHINFO_EXTENSION));
            $allowed = ['jpg', 'jpeg', 'png', 'webp'];
            
            if (in_array($ext, $allowed)) {
                $cleanName = strtolower(trim(preg_replace('/[^A-Za-z0-9-]+/', '_', $name)));
                $fileName = $cleanName . '_' . time() . '.' . $ext;
                if (move_uploaded_file($files['image']['tmp_name'], $uploadDir . $fileName)) {
                    $imagePath = 'assets/img/empleados/' . $fileName;
                }
            }
        }
        return $this->model->updateEmployee($id, $name, $dept, $company, $imagePath);
    }

    public function deleteEmployee($id) {
        return $this->model->deleteEmployee($id);
    }

    public function getReasons($employeeId = null) {
        $month = $_GET['month'] ?? null;
        $year = $_GET['year'] ?? null;
        return $this->model->getReasons($employeeId, $month, $year);
    }
}
