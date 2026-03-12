<?php
namespace App\Config;

use PDO;
use PDOException;

class Conexion {
    private static $instance = null;

    public static function getConexion() {
        // Establecer zona horaria local
        date_default_timezone_set('America/Mexico_City');
        
        if (self::$instance === null) {
            $env = self::loadEnv(__DIR__ . '/../../.env');
            
            $host = $env['DB_HOST'];
            $port = $env['DB_PORT'];
            $db   = $env['DB_NAME'];
            $user = $env['DB_USER'];
            $pass = $env['DB_PASS'];

            try {
                $dsn = "pgsql:host=$host;port=$port;dbname=$db";
                self::$instance = new PDO($dsn, $user, $pass, [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false,
                ]);
            } catch (PDOException $e) {
                die("Error de conexión: " . $e->getMessage());
            }
        }
        return self::$instance;
    }

    private static function loadEnv($path) {
        if (!file_exists($path)) return [];
        $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        $env = [];
        foreach ($lines as $line) {
            if (strpos(trim($line), '#') === 0) continue;
            list($name, $value) = explode('=', $line, 2);
            $env[trim($name)] = trim($value);
        }
        return $env;
    }
}
