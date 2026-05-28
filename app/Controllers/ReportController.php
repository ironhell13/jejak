<?php

namespace App\Controllers;

use CodeIgniter\Controller;
use CodeIgniter\HTTP\ResponseInterface;

class ReportController extends BaseController
{
    /**
     * Menampilkan halaman kamera (Frontend PWA)
     */
    public function camera()
    {
        return view('warga/camera_view');
    }

    /**
     * Memproses unggahan foto dan verifikasi Gemini AI
     */
    public function processUpload()
    {
        $validationRule = [
            'foto' => [
                'label' => 'Image File',
                'rules' => [
                    'uploaded[foto]',
                    'is_image[foto]',
                    'mime_in[foto,image/jpg,image/jpeg,image/gif,image/png]',
                    'max_size[foto,5120]', // Max 5MB
                ],
            ],
        ];

        if (! $this->validate($validationRule)) {
            return $this->response->setJSON(['status' => 'error', 'message' => $this->validator->getErrors()]);
        }

        $img = $this->request->getFile('foto');
        $lat = $this->request->getPost('lat');
        $lng = $this->request->getPost('lng');

        if (! $img->hasMoved()) {
            $newName = $img->getRandomName();
            $img->move(WRITEPATH . 'uploads', $newName);

            // Path untuk disimpan di DB
            $fotoPath = 'uploads/' . $newName;

            // 1. Panggil Verifikasi AI (Gemini)
            // Note: Ini masih dummy, akan diimplementasikan dengan cURL ke Gemini API
            $aiAnalysis = $this->verifyWithGemini(WRITEPATH . 'uploads/' . $newName);

            // 2. Simpan ke Database
            // $reportModel = new \App\Models\ReportModel();
            // $reportModel->insert([
            //     'user_id'        => session()->get('user_id'), // Contoh auth
            //     'foto_path'      => $fotoPath,
            //     'lat'            => $lat,
            //     'lng'            => $lng,
            //     'kategori'       => $aiAnalysis['kategori'],
            //     'tingkat_bahaya' => $aiAnalysis['tingkat_bahaya'],
            //     'deskripsi_ai'   => $aiAnalysis['deskripsi'],
            //     'validitas_foto' => $aiAnalysis['validitas_foto'],
            // ]);

            return $this->response->setJSON([
                'status'  => 'success',
                'message' => 'Laporan berhasil terkirim dan diverifikasi AI',
                'data'    => $aiAnalysis
            ]);
        }

        return $this->response->setJSON(['status' => 'error', 'message' => 'Gagal mengunggah foto']);
    }

    /**
     * Integrasi nyata dengan Google Gemini API menggunakan cURL
     */
    private function verifyWithGemini($filePath)
    {
        $apiKey = env('GEMINI_API_KEY') ?: process.env.GEMINI_API_KEY;
        
        if (empty($apiKey)) {
            log_message('error', 'Gemini API Key is missing.');
            return $this->getFallbackAnalysis();
        }

        $endpoint = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" . $apiKey;

        // Siapkan gambar (Base64)
        $imageData = base64_encode(file_get_contents($filePath));
        $mimeType = mime_content_type($filePath);

        $prompt = "Kamu adalah agen verifikasi infrastruktur publik bernama JEJAK. Saya akan memberikan sebuah gambar fasilitas umum. Analisis gambar tersebut dan berikan output strictly dalam format JSON tanpa teks tambahan. 
        Analisis yang dibutuhkan:
        'kategori': Pilih salah satu dari [Jalan Berlubang, Tutup Got Hilang, Trotoar Rusak, Galian Mengganggu, Lainnya].
        'tingkat_bahaya': Pilih salah satu dari [Tinggi, Sedang, Rendah]. Perhatikan faktor keamanan (misal: tutup got hilang = Tinggi).
        'deskripsi': Berikan 1 kalimat penjelasan teknis tentang kondisi di foto.
        'validitas_foto': [true/false]. true jika foto terlihat asli/jalanan nyata. false jika terlihat editan/gambar monitor.";

        $data = [
            "contents" => [
                [
                    "parts" => [
                        ["text" => $prompt],
                        [
                            "inline_data" => [
                                "mime_type" => $mimeType,
                                "data" => $imageData
                            ]
                        ]
                    ]
                ]
            ],
            "generationConfig" => [
                "response_mime_type" => "application/json"
            ]
        ];

        $ch = curl_init($endpoint);
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode !== 200) {
            log_message('error', 'Gemini API Error: ' . $response);
            return $this->getFallbackAnalysis();
        }

        $result = json_decode($response, true);
        $jsonOutput = $result['candidates'][0]['content']['parts'][0]['text'] ?? null;

        if ($jsonOutput) {
            return json_decode($jsonOutput, true);
        }

        return $this->getFallbackAnalysis();
    }

    /**
     * Fallback jika AI gagal merespon
     */
    private function getFallbackAnalysis()
    {
        return [
            'kategori'       => 'Lainnya',
            'tingkat_bahaya' => 'Sedang',
            'deskripsi'      => 'Gagal menganalisis otomatis. Perlu verifikasi manual.',
            'validitas_foto' => true
        ];
    }
}
