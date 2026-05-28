-- Database Schema for JEJAK (Jaringan Eskalasi Jalan & Aset Kota)

-- Users Table
CREATE TABLE IF NOT EXISTS `users` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `username` VARCHAR(50) NOT NULL UNIQUE,
    `password` VARCHAR(255) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `role` ENUM('warga', 'kelurahan', 'kecamatan', 'pupr') NOT NULL DEFAULT 'warga',
    `area_tugas` VARCHAR(100) DEFAULT NULL, -- Wilayah kerja untuk admin (Kelurahan/Kecamatan)
    `email` VARCHAR(100) UNIQUE,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Laporan Table
CREATE TABLE IF NOT EXISTS `laporan` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `foto_path` VARCHAR(255) NOT NULL,
    `lat` DECIMAL(10, 8) NOT NULL,
    `lng` DECIMAL(11, 8) NOT NULL,
    `kategori` VARCHAR(50) DEFAULT NULL, -- Otomatis dari Gemini AI
    `tingkat_bahaya` ENUM('Tinggi', 'Sedang', 'Rendah') DEFAULT 'Rendah', -- Otomatis dari Gemini AI
    `deskripsi_ai` TEXT, -- Penjelasan teknis dari Gemini AI
    `deskripsi_user` TEXT, -- Tambahan info dari user (opsional)
    `status` ENUM('Menunggu', 'Proses', 'Selesai') NOT NULL DEFAULT 'Menunggu',
    `level_eskalasi` TINYINT NOT NULL DEFAULT 1, -- 1: Kelurahan, 2: Kecamatan, 3: PUPR
    `validitas_foto` BOOLEAN DEFAULT TRUE,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    INDEX idx_laporan_status (status),
    INDEX idx_laporan_eskalasi (level_eskalasi),
    INDEX idx_laporan_category (kategori)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Escalation Log Table (Audit Trail)
CREATE TABLE IF NOT EXISTS `eskalasi_log` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `laporan_id` INT NOT NULL,
    `from_level` TINYINT NOT NULL,
    `to_level` TINYINT NOT NULL,
    `keterangan` VARCHAR(255),
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`laporan_id`) REFERENCES `laporan`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
