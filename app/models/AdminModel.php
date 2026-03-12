<?php
namespace App\Models;

require_once __DIR__ . '/../config/conexion.php';
use App\Config\Conexion;
use PDO;

class AdminModel {
    private $db;

    public function __construct() {
        $this->db = Conexion::getConexion();
    }

    public function authenticate($username, $password) {
        $query = "SELECT * FROM admins WHERE username = ?";
        $stmt = $this->db->prepare($query);
        $stmt->execute([$username]);
        $admin = $stmt->fetch();

        if ($admin && password_verify($password, $admin['password'])) {
            return $admin;
        }
        return false;
    }

    // MÉTODO PÚBLICO: No debe pedir sesión
    public function getVotingStatus() {
        $query = "SELECT key, value FROM settings WHERE key IN ('voting_active', 'voting_end_time')";
        $stmt = $this->db->query($query);
        $settings = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);

        $active = ($settings['voting_active'] ?? '0') === '1';
        $endTime = $settings['voting_end_time'] ?? '';

        // Auto-cierre
        if ($active && !empty($endTime) && strtotime($endTime) < time()) {
            $this->setVotingStatus(false);
            $this->setShowWinner(true);
            return false;
        }

        return $active;
    }

    // MÉTODOS PRIVADOS (Deberían ser llamados tras checkAdmin() en la API)
    public function setVotingStatus($status) {
        $value = $status ? '1' : '0';
        $query = "UPDATE settings SET value = ? WHERE key = 'voting_active'";
        $stmt = $this->db->prepare($query);
        return $stmt->execute([$value]);
    }

    public function getVotingEndTime() {
        $query = "SELECT value FROM settings WHERE key = 'voting_end_time'";
        $stmt = $this->db->query($query);
        return $stmt->fetchColumn();
    }

    public function setVotingEndTime($endTime) {
        $query = "UPDATE settings SET value = ? WHERE key = 'voting_end_time'";
        $stmt = $this->db->prepare($query);
        return $stmt->execute([$endTime]);
    }

    public function getShowWinner() {
        $query = "SELECT value FROM settings WHERE key = 'show_winner'";
        $stmt = $this->db->query($query);
        return $stmt->fetchColumn() === '1';
    }

    public function setShowWinner($status) {
        $value = $status ? '1' : '0';
        $query = "UPDATE settings SET value = ? WHERE key = 'show_winner'";
        $stmt = $this->db->prepare($query);
        return $stmt->execute([$value]);
    }
}
