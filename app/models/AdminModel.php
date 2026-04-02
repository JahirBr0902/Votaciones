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

    public function getWinnerPeriod() {
        $query = "SELECT key, value FROM settings WHERE key IN ('winner_month', 'winner_year')";
        $stmt = $this->db->query($query);
        $settings = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);
        
        return [
            'month' => $settings['winner_month'] ?? date('m'),
            'year' => $settings['winner_year'] ?? date('Y')
        ];
    }

    public function setWinnerPeriod($month, $year) {
        $this->db->prepare("INSERT INTO settings (key, value) VALUES ('winner_month', ?), ('winner_year', ?) 
                            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value")
                 ->execute([$month, $year]);
        
        // Versión compatible con PostgreSQL si el anterior falla por la estructura de settings (key es PK)
        $stmt = $this->db->prepare("UPDATE settings SET value = ? WHERE key = ?");
        $stmt->execute([$month, 'winner_month']);
        if ($stmt->rowCount() == 0) {
            $this->db->prepare("INSERT INTO settings (key, value) VALUES ('winner_month', ?)")->execute([$month]);
        }
        
        $stmt = $this->db->prepare("UPDATE settings SET value = ? WHERE key = ?");
        $stmt->execute([$year, 'winner_year']);
        if ($stmt->rowCount() == 0) {
            $this->db->prepare("INSERT INTO settings (key, value) VALUES ('winner_year', ?)")->execute([$year]);
        }
        return true;
    }

    public function setShowWinner($status) {
        $value = $status ? '1' : '0';
        $query = "UPDATE settings SET value = ? WHERE key = 'show_winner'";
        $stmt = $this->db->prepare($query);
        return $stmt->execute([$value]);
    }
}
