<?php

namespace App\Models;

use CodeIgniter\Model;

class ReportModel extends Model
{
    protected $table      = 'laporan';
    protected $primaryKey = 'id';

    protected $useAutoIncrement = true;

    protected $returnType     = 'array';
    protected $useSoftDeletes = false;

    protected $allowedFields = [
        'user_id', 'foto_path', 'lat', 'lng', 
        'kategori', 'tingkat_bahaya', 'deskripsi_ai', 
        'deskripsi_user', 'status', 'level_eskalasi', 'validitas_foto'
    ];

    protected $useTimestamps = true;
    protected $createdField  = 'created_at';
    protected $updatedField  = 'updated_at';

    /**
     * Mendapatkan laporan berdasarkan level eskalasi (Wilayah)
     */
    public function getReportsByEscalation($level)
    {
        return $this->where('level_eskalasi', $level)
                    ->orderBy('created_at', 'DESC')
                    ->findAll();
    }
}
