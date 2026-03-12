<?php
namespace App\Controllers;

require_once __DIR__ . '/../models/AdminModel.php';
use App\Models\AdminModel;

class AdminController {
    private $model;

    public function __construct() {
        $this->model = new AdminModel();
    }

    public function login($username, $password) {
        $admin = $this->model->authenticate($username, $password);
        if ($admin) {
            if (session_status() === PHP_SESSION_NONE) session_start();
            $_SESSION['admin_id'] = $admin['id'];
            $_SESSION['admin_user'] = $admin['username'];
            return ['success' => true, 'message' => 'Acceso concedido.'];
        }
        return ['success' => false, 'message' => 'Usuario o contraseña incorrectos.'];
    }

    public function logout() {
        if (session_status() === PHP_SESSION_NONE) session_start();
        session_destroy();
        return ['success' => true, 'message' => 'Sesión cerrada.'];
    }

    public function toggleVoting() {
        // La protección checkAdmin() ya está en api.php
        $input = json_decode(file_get_contents('php://input'), true);
        $status = $input['active'] ?? false;
        $this->model->setVotingStatus($status);
        if ($status) $this->model->setShowWinner(false);
        return ['success' => true, 'active' => $status];
    }

    public function getStatus() {
        // ACCESO PÚBLICO: Quitar checkAuth
        $active = $this->model->getVotingStatus();
        return ['success' => true, 'active' => $active];
    }

    public function getShowWinner() {
        // ACCESO PÚBLICO: Quitar checkAuth
        return $this->model->getShowWinner();
    }

    public function toggleShowWinner() {
        $input = json_decode(file_get_contents('php://input'), true);
        $status = $input['active'] ?? false;
        $this->model->setShowWinner($status);
        return ['success' => true, 'active' => $status];
    }

    public function getEndTime() {
        // ACCESO PÚBLICO: Quitar checkAuth
        return $this->model->getVotingEndTime();
    }

    public function setEndTime() {
        $input = json_decode(file_get_contents('php://input'), true);
        $endTime = $input['end_time'] ?? '';
        $this->model->setVotingEndTime($endTime);
        if (!empty($endTime)) $this->model->setVotingStatus(true);
        return ['success' => true, 'end_time' => $endTime, 'activated' => !empty($endTime)];
    }
}
