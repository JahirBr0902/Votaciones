<?php

namespace App\Controllers;

require_once __DIR__ . '/../models/AdminModel.php';

use App\Models\AdminModel;

class AdminController
{
    private $model;

    public function __construct()
    {
        $this->model = new AdminModel();
    }

    public function login($username, $password)
    {
        $admin = $this->model->authenticate($username, $password);
        if ($admin) {
            if (session_status() === PHP_SESSION_NONE) session_start();
            $_SESSION['admin_id'] = $admin['id'];
            $_SESSION['admin_user'] = $admin['username'];
            return ['success' => true, 'message' => 'Acceso concedido.'];
        }
        return ['success' => false, 'message' => 'Usuario o contraseña incorrectos.'];
    }

    public function logout()
    {
        if (session_status() === PHP_SESSION_NONE) session_start();
        session_destroy();
        return ['success' => true, 'message' => 'Sesión cerrada.'];
    }

    public function toggleVoting()
    {
        // La protección checkAdmin() ya está en api.php
        $input = json_decode(file_get_contents('php://input'), true);
        $status = $input['active'] ?? false;
        $this->model->setVotingStatus($status);
        if ($status) $this->model->setShowWinner(false);
        return ['success' => true, 'active' => $status];
    }

    public function getStatus()
    {
        // ACCESO PÚBLICO: Quitar checkAuth
        $active = $this->model->getVotingStatus();
        return ['success' => true, 'active' => $active];
    }

    public function getShowWinner()
    {
        // ACCESO PÚBLICO: Quitar checkAuth
        return $this->model->getShowWinner();
    }

    public function getWinnerPeriod() {
        // ACCESO PÚBLICO
        return ['success' => true, 'period' => $this->model->getWinnerPeriod()];
    }

    public function setWinnerPeriod() {
        $input = json_decode(file_get_contents('php://input'), true);
        $month = $input['month'] ?? date('m');
        $year = $input['year'] ?? date('Y');
        $this->model->setWinnerPeriod($month, $year);
        return ['success' => true, 'message' => 'Periodo de ganador actualizado'];
    }

    public function toggleShowWinner()
    {
        $input = json_decode(file_get_contents('php://input'), true);
        $status = $input['active'] ?? false;
        $this->model->setShowWinner($status);
        return ['success' => true, 'active' => $status];
    }

    public function getEndTime()
    {
        // ACCESO PÚBLICO: Quitar checkAuth
        return $this->model->getVotingEndTime();
    }

    public function setEndTime()
    {
        $input = json_decode(file_get_contents('php://input'), true);
        $endTime = $input['end_time'] ?? '';
        $this->model->setVotingEndTime($endTime);
        if (!empty($endTime)) $this->model->setVotingStatus(true);
        return ['success' => true, 'end_time' => $endTime, 'activated' => !empty($endTime)];
    }

    public function startNgrok(): array
    {
        $status = $this->getContainerStatus();

        if ($status === 'running') {
            return $this->getNgrokUrl();
        }

        if (!in_array($status, ['exited', 'created'])) {
            return ['success' => false, 'message' => "Contenedor no encontrado"];
        }

        $started = $this->dockerAction('start');

        if (!$started) {
            return ['success' => false, 'message' => 'No se pudo iniciar ngrok'];
        }

        sleep(4);
        return $this->getNgrokUrl();
    }

    public function getNgrokUrl(): array
    {
        try {
            $ctx     = stream_context_create(['http' => ['timeout' => 2]]);
            $apiData = @file_get_contents('http://votaciones-ngrok:4040/api/tunnels', false, $ctx);

            if ($apiData) {
                $data = json_decode($apiData, true);

                // Preferimos HTTPS si hay dos túneles
                $url = null;
                foreach ($data['tunnels'] ?? [] as $tunnel) {
                    if (str_starts_with($tunnel['public_url'], 'https')) {
                        $url = $tunnel['public_url'];
                        break;
                    }
                }
                $url = $url ?? $data['tunnels'][0]['public_url'] ?? null;

                if ($url) {
                    return ['success' => true, 'url' => $url, 'message' => 'Ngrok activo'];
                }
            }

            return ['success' => false, 'message' => 'Ngrok no está respondiendo'];
        } catch (\Exception $e) {
            return ['success' => false, 'message' => 'Error al conectar con la API de ngrok'];
        }
    }

    public function stopNgrok(): array
    {
        $stopped = $this->dockerAction('stop');

        if ($stopped) {
            return ['success' => true, 'message' => 'Procesos de acceso público detenidos'];
        }

        return ['success' => false, 'message' => 'No se pudo detener ngrok'];
    }

    // ── Helpers privados ──────────────────────────────────────────────────────────

    private function getContainerStatus(): ?string
    {
        $proxyBase     = 'http://docker-proxy:2375';
        $containerName = 'votaciones-ngrok';

        $ch = curl_init("{$proxyBase}/containers/{$containerName}/json");
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 5,
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode !== 200 || !$response) return null;

        $data = json_decode($response, true);
        return $data['State']['Status'] ?? null;
    }

    private function dockerAction(string $action): bool
    {
        $proxyBase     = 'http://docker-proxy:2375';
        $containerName = 'votaciones-ngrok';

        $ch = curl_init("{$proxyBase}/containers/{$containerName}/{$action}");
        curl_setopt_array($ch, [
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => '',
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 10,
        ]);

        curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        // 204 = éxito, 304 = ya estaba en ese estado
        return in_array($httpCode, [204, 304]);
    }
}
