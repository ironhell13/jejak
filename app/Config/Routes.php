<?php

namespace Config;

use CodeIgniter\Config\BaseService;
use CodeIgniter\Router\RouteCollection;

/**
 * Routes.php for JEJAK
 */
$routes = Services::routes();

// Default 
$routes->get('/', 'Home::index');

/**
 * --- Rute Sisi Pelapor (Warga) ---
 */
$routes->group('pelapor', function($routes) {
    $routes->get('camera', 'ReportController::camera'); // UI Ambil Foto
    $routes->post('upload', 'ReportController::processUpload'); // Proses Upload & AI Verify
    $routes->get('history', 'ReportController::myHistory'); // Riwayat Laporan
});

/**
 * --- Rute Dashboard Instansi (Admin) ---
 */
$routes->group('dashboard', ['filter' => 'auth'], function($routes) {
    $routes->get('/', 'DashboardController::index'); // Overview Laporan di wilayahnya
    $routes->get('detail/(:num)', 'DashboardController::detail/$1'); // Detail Laporan
    $routes->post('update-status/(:num)', 'DashboardController::updateStatus/$1'); // Update Status
});

/**
 * --- Rute API (Untuk Mobile/PWA) ---
 */
$routes->group('api', function($routes) {
    $routes->post('v1/report', 'ReportController::apiSubmit');
});
