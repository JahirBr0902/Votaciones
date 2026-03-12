<?php
namespace App\Models;

require_once __DIR__ . '/../config/conexion.php';
use App\Config\Conexion;
use PDO;

class VoteModel {
    private $db;

    public function __construct() {
        $this->db = Conexion::getConexion();
    }

    public function getEmployees() {
        // Ordena por empresa y luego aleatoriamente dentro de ella
        $query = "SELECT id, name, department, company, avatar_text as avatar, image_path 
                  FROM employees 
                  WHERE active = TRUE 
                  ORDER BY company ASC, department DESC, RANDOM()";
        $stmt = $this->db->prepare($query);
        $stmt->execute();
        return $stmt->fetchAll();
    }

    public function vote($employeeId, $fingerprint = null) {
        try {
            require_once __DIR__ . '/AdminModel.php';
            $adminModel = new AdminModel();
            
            if (!$adminModel->getVotingStatus()) {
                return ['success' => false, 'message' => 'Las votaciones están cerradas actualmente.'];
            }

            // Obtener la empresa del empleado por el que se quiere votar
            $stmtEmp = $this->db->prepare("SELECT company FROM employees WHERE id = ?");
            $stmtEmp->execute([$employeeId]);
            $targetCompany = $stmtEmp->fetchColumn();

            if (!$targetCompany) {
                return ['success' => false, 'message' => 'Candidato no encontrado.'];
            }

            $sessionId = session_id();
            $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
            $month = date('m');
            $year = date('Y');

            // 1. Validar por Sesión (específico por empresa)
            if (session_status() === PHP_SESSION_NONE) session_start();
            $sessionKey = "voted_" . strtolower($targetCompany) . "_$month-$year";
            if (isset($_SESSION[$sessionKey])) {
                return ['success' => false, 'message' => "Ya has emitido tu voto para la empresa $targetCompany este mes."];
            }

            // 2. Validar por IP y Fingerprint en la BD (buscando votos previos en la MISMA empresa)
            $queryCheck = "SELECT v.id FROM votes v
                           JOIN employees e ON v.employee_id = e.id
                           WHERE (v.voter_ip = ? OR v.voter_fingerprint = ?) 
                           AND e.company = ?
                           AND EXTRACT(MONTH FROM v.voted_at) = ? 
                           AND EXTRACT(YEAR FROM v.voted_at) = ?";
            
            $stmtCheck = $this->db->prepare($queryCheck);
            $stmtCheck->execute([$ip, $fingerprint, $targetCompany, $month, $year]);
            
            if ($stmtCheck->fetch()) {
                return ['success' => false, 'message' => "Se detectó un voto previo para $targetCompany desde este dispositivo."];
            }

            // Registrar el voto
            $query = "INSERT INTO votes (employee_id, voter_session_id, voter_ip, voter_fingerprint) VALUES (?, ?, ?, ?)";
            $stmt = $this->db->prepare($query);
            $stmt->execute([$employeeId, $sessionId, $ip, $fingerprint]);

            $_SESSION[$sessionKey] = true;
            return ['success' => true, 'message' => "Voto para $targetCompany registrado correctamente."];
        } catch (\PDOException $e) {
            return ['success' => false, 'message' => 'Error: ' . $e->getMessage()];
        }
    }

    public function getResults($publicMode = true, $month = null, $year = null, $revealWinner = false) {
        try {
            $month = $month ?? date('m');
            $year = $year ?? date('Y');

            $totalStmt = $this->db->prepare("SELECT COUNT(*) FROM votes WHERE EXTRACT(MONTH FROM voted_at) = ? AND EXTRACT(YEAR FROM voted_at) = ?");
            $totalStmt->execute([$month, $year]);
            $total = (int)$totalStmt->fetchColumn();

            $query = "SELECT 
                        e.id, e.name, e.department, e.company, e.avatar_text, e.image_path,
                        COUNT(v.id) as total_votes
                      FROM employees e
                      LEFT JOIN votes v ON e.id = v.employee_id 
                        AND EXTRACT(MONTH FROM v.voted_at) = ? 
                        AND EXTRACT(YEAR FROM v.voted_at) = ?
                      WHERE e.active = TRUE
                      GROUP BY e.id, e.name, e.department, e.company, e.avatar_text, e.image_path
                      ORDER BY e.company ASC, total_votes DESC";
            
            $stmt = $this->db->prepare($query);
            $stmt->execute([$month, $year]);
            $data = $stmt->fetchAll();

            $results = [];
            $last_company = "";
            $company_counter = 0;
            $last_votes = -1;
            $display_rank = 0;

            foreach ($data as $row) {
                $votes = (int)$row['total_votes'];
                $company = $row['company'];

                if ($company !== $last_company) {
                    $last_company = $company;
                    $company_counter = 0;
                    $last_votes = -1;
                }

                $company_counter++;
                if ($votes !== $last_votes) {
                    $display_rank = $company_counter;
                }
                $last_votes = $votes;
                
                $percentage = $total > 0 ? round(($votes / $total) * 100, 1) : 0;
                
                $item = [
                    'id' => (int)$row['id'],
                    'alias' => 'Candidato ' . chr(64 + $company_counter),
                    'department' => $row['department'],
                    'company' => $company,
                    'votes' => $votes,
                    'percentage' => $percentage,
                    'rank' => $display_rank
                ];

                if (!$publicMode || ($revealWinner && $display_rank === 1)) {
                    $item['name'] = $row['name'];
                    $item['image'] = $row['image_path'];
                    $item['avatar'] = $row['avatar_text'];
                } else {
                    $item['avatar'] = '??';
                }

                $results[] = $item;
            }

            return ['success' => true, 'results' => $results, 'total' => $total, 'period' => "$month/$year"];
        } catch (\PDOException $e) {
            return ['success' => false, 'message' => 'Error al obtener resultados: ' . $e->getMessage()];
        }
    }

    public function reset($month = null, $year = null) {
        try {
            $month = $month ?? date('m');
            $year = $year ?? date('Y');
            $query = "DELETE FROM votes WHERE EXTRACT(MONTH FROM voted_at) = ? AND EXTRACT(YEAR FROM voted_at) = ?";
            $stmt = $this->db->prepare($query);
            return ['success' => $stmt->execute([$month, $year]), 'message' => "Votos del periodo $month/$year eliminados."];
        } catch (\PDOException $e) {
            return ['success' => false, 'message' => 'Error al reiniciar: ' . $e->getMessage()];
        }
    }

    public function addEmployee($name, $department, $company = 'Witmac', $imagePath = 'assets/img/empleados/default.jpg') {
        try {
            $words = explode(" ", $name);
            $avatar = "";
            foreach ($words as $w) { $avatar .= mb_substr($w, 0, 1); }
            $avatar = mb_strtoupper(mb_substr($avatar, 0, 2));

            $query = "INSERT INTO employees (name, department, company, avatar_text, image_path) VALUES (?, ?, ?, ?, ?)";
            $stmt = $this->db->prepare($query);
            return ['success' => $stmt->execute([$name, $department, $company, $avatar, $imagePath])];
        } catch (\PDOException $e) {
            return ['success' => false, 'message' => $e->getMessage()];
        }
    }

    public function deleteEmployee($id) {
        try {
            $query = "UPDATE employees SET active = FALSE WHERE id = ?";
            $stmt = $this->db->prepare($query);
            return ['success' => $stmt->execute([$id])];
        } catch (\PDOException $e) {
            return ['success' => false, 'message' => $e->getMessage()];
        }
    }
}
