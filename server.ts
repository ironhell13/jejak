import "dotenv/config";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // In-memory "Database" for reports and users
  let reports: any[] = [];
  let users: any[] = [
    // Pre-seed a default administrator user or template users
    { id: 1, name: "Ridwan BTC", email: "ridwanbtc1@gmail.com", username: "ridwanbtc", password: "Password123" }
  ];

  app.use(express.json({ limit: '20mb' }));

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", mode: process.env.NODE_ENV || "development" });
  });

  app.get("/api/reports", (req, res) => {
    res.json(reports);
  });

  // Auth: Email/username login
  app.post("/api/auth/login", (req, res) => {
    const { usernameOrEmail, password } = req.body;
    if (!usernameOrEmail || !password) {
      return res.status(400).json({ status: "error", message: "Harap isi semua kolom login" });
    }
    const user = users.find(u => 
      (u.username.toLowerCase() === usernameOrEmail.toLowerCase() || u.email.toLowerCase() === usernameOrEmail.toLowerCase()) && 
      u.password === password
    );
    if (!user) {
      return res.status(401).json({ status: "error", message: "Username/Email atau Password Anda salah" });
    }
    res.json({ 
      status: "success", 
      user: { id: user.id, name: user.name, email: user.email, username: user.username } 
    });
  });

  // Auth: Register/Sign-up
  app.post("/api/auth/signup", (req, res) => {
    const { name, email, username, password } = req.body;
    if (!name || !email || !username || !password) {
      return res.status(400).json({ status: "error", message: "Harap lengkapi formulir registrasi" });
    }

    const emailTaken = users.some(u => u.email.toLowerCase() === email.toLowerCase());
    const usernameTaken = users.some(u => u.username.toLowerCase() === username.toLowerCase());

    if (emailTaken) {
      return res.status(400).json({ status: "error", message: "Email sudah terdaftar" });
    }
    if (usernameTaken) {
      return res.status(400).json({ status: "error", message: "Username sudah digunakan" });
    }

    const newUser = {
      id: users.length + 1,
      name,
      email,
      username,
      password
    };
    users.push(newUser);
    res.json({ 
      status: "success", 
      user: { id: newUser.id, name: newUser.name, email: newUser.email, username: newUser.username } 
    });
  });

  // Auth: Google Direct Action Login
  app.post("/api/auth/google", (req, res) => {
    const { email, name } = req.body;
    if (!email) {
      return res.status(400).json({ status: "error", message: "Kredensial email Google tidak ditemukan" });
    }

    let user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      // Create new account automatically if email doesn't exist
      const computedUsername = email.split("@")[0].replace(/[^a-zA-Z0-9]/g, "") + Math.floor(Math.random() * 100);
      user = {
        id: users.length + 1,
        name: name || email.split("@")[0],
        email: email,
        username: computedUsername,
        password: Math.random().toString(36).substring(2, 10) // Random default password
      };
      users.push(user);
    }

    res.json({
      status: "success",
      user: { id: user.id, name: user.name, email: user.email, username: user.username }
    });
  });

  // AI Analysis endpoint - runs on server to keep API key secure
  app.post("/api/analyze", async (req, res) => {
    try {
      const { imageBase64, mimeType } = req.body;

      if (!imageBase64) {
        return res.status(400).json({ status: 'error', message: 'No image data provided' });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        console.error("GEMINI_API_KEY is not set in .env");
        return res.status(500).json({
          status: 'error',
          message: 'API Key belum dikonfigurasi. Tambahkan GEMINI_API_KEY di file .env',
          fallback: {
            kategori: "Lainnya",
            tingkat_bahaya: "Sedang",
            deskripsi: "Gagal menganalisis: API Key belum dikonfigurasi.",
            validitas_foto: true
          }
        });
      }

      console.log("Analyzing image with Gemini AI (server-side)...");

      const ai = new GoogleGenAI({ apiKey });

      const prompt = `Kamu adalah agen verifikasi infrastruktur publik bernama JEJAK. Saya akan memberikan sebuah gambar fasilitas umum. Analisis gambar tersebut dan berikan output strictly dalam format JSON tanpa teks tambahan.

Analisis yang dibutuhkan:
- "kategori": Pilih salah satu dari ["Jalan Berlubang", "Tutup Got Hilang", "Trotoar Rusak", "Galian Mengganggu", "Lainnya"].
- "tingkat_bahaya": Pilih salah satu dari ["Tinggi", "Sedang", "Rendah"]. Perhatikan faktor keamanan (misal: tutup got hilang = Tinggi).
- "deskripsi": Berikan 1 kalimat penjelasan teknis tentang kondisi di foto.
- "validitas_foto": true jika foto terlihat asli/jalanan nyata. false jika terlihat editan/gambar monitor.

Respons HARUS berupa JSON valid tanpa markdown code block.`;

      // Try multiple models as fallback if one is rate-limited
      const modelsToTry = [
        "gemini-2.5-flash",
        "gemini-2.0-flash",
        "gemini-2.0-flash-lite",
      ];

      let lastError: any = null;
      let responseText = "";

      for (const modelName of modelsToTry) {
        try {
          console.log(`Trying model: ${modelName}...`);

          const response = await ai.models.generateContent({
            model: modelName,
            contents: {
              parts: [
                { text: prompt },
                {
                  inlineData: {
                    data: imageBase64,
                    mimeType: mimeType || "image/jpeg"
                  }
                }
              ]
            },
            config: {
              responseMimeType: "application/json",
            }
          });

          // response.text is a getter property in @google/genai v2.3.0
          responseText = response.text || "";
          console.log(`Model ${modelName} succeeded. Response:`, responseText);
          lastError = null;
          break; // Success - exit the loop

        } catch (modelErr: any) {
          lastError = modelErr;
          const errMsg = modelErr?.message || "";
          console.warn(`Model ${modelName} failed: ${errMsg.substring(0, 200)}`);

          // If rate-limited (429), try next model
          if (errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED")) {
            console.log(`Rate limited on ${modelName}, trying next model...`);
            continue;
          }

          // For other errors, throw immediately (don't try other models)
          throw modelErr;
        }
      }

      // If all models failed
      if (lastError) {
        throw lastError;
      }

      // Clean up potential markdown code blocks
      let cleanJson = responseText.trim();
      if (cleanJson.startsWith("```json")) {
        cleanJson = cleanJson.replace(/^```json\s*/, "").replace(/```\s*$/, "");
      } else if (cleanJson.startsWith("```")) {
        cleanJson = cleanJson.replace(/^```\s*/, "").replace(/```\s*$/, "");
      }

      const aiResult = JSON.parse(cleanJson);
      console.log("AI Analysis Result:", aiResult);

      res.json({ status: 'success', data: aiResult });

    } catch (error: any) {
      // Log FULL error details for debugging
      console.error("=== AI Analysis Error ===");
      console.error("Error message:", error?.message);
      console.error("Error name:", error?.name);
      console.error("Error status:", error?.status || error?.statusCode || error?.code);
      console.error("Error response:", JSON.stringify(error?.response?.data || error?.errorDetails || error?.details || "N/A"));
      console.error("Full error:", JSON.stringify(error, Object.getOwnPropertyNames(error || {})));
      console.error("========================");

      // Parse user-friendly error message
      let friendlyMessage = "Gagal menganalisis foto.";
      // Stringify the entire error to catch nested messages
      const rawMsg = JSON.stringify(error) + " " + (error?.message || "");

      if (rawMsg.includes("403") || rawMsg.includes("PERMISSION_DENIED") || rawMsg.includes("SERVICE_DISABLED")) {
        friendlyMessage = "API Key belum diaktifkan. Silakan buat API key baru di https://aistudio.google.com/apikey lalu masukkan ke file .env";
      } else if (rawMsg.includes("API_KEY_INVALID")) {
        friendlyMessage = "API Key tidak valid. Periksa kembali GEMINI_API_KEY di file .env";
      } else if (rawMsg.includes("429") || rawMsg.includes("RESOURCE_EXHAUSTED")) {
        friendlyMessage = "Kuota API habis. Coba lagi dalam beberapa menit.";
      } else if (rawMsg.includes("fetch") || rawMsg.includes("network") || rawMsg.includes("ENOTFOUND")) {
        friendlyMessage = "Tidak dapat terhubung ke server Gemini. Periksa koneksi internet.";
      } else if (rawMsg.includes("400") || rawMsg.includes("INVALID_ARGUMENT")) {
        friendlyMessage = "Request tidak valid. Pastikan foto yang dikirim benar.";
      } else {
        // Include raw message for debugging unknown errors
        friendlyMessage = "Terjadi kesalahan saat analisis AI: " + (error?.message || "Unknown error").substring(0, 300);
      }

      console.error("Friendly message:", friendlyMessage);

      res.status(500).json({
        status: 'error',
        message: friendlyMessage,
        debug: error?.message || "No error message",
        fallback: {
          kategori: "Lainnya",
          tingkat_bahaya: "Sedang",
          deskripsi: friendlyMessage,
          validitas_foto: true
        }
      });
    }
  });

  app.post("/api/upload", async (req, res) => {
    try {
      const { foto, lat, lng, aiResult, reporter } = req.body;
      
      if (!foto || !aiResult) {
        return res.status(400).json({ status: 'error', message: 'Data tidak lengkap' });
      }

      const newReport = {
        id: reports.length + 1,
        user_id: reporter ? reporter.id : 1,
        reporter_name: reporter ? reporter.name : "Ridwan BTC",
        reporter_username: reporter ? reporter.username : "ridwanbtc",
        foto_path: foto,
        lat: lat,
        lng: lng,
        kategori: aiResult.kategori || "Infrastruktur",
        tingkat_bahaya: aiResult.tingkat_bahaya || "Sedang",
        deskripsi_ai: aiResult.deskripsi || "Laporan masuk.",
        validitas_foto: aiResult.validitas_foto ?? true,
        status: 'Menunggu',
        level_eskalasi: 1,
        created_at: new Date().toISOString()
      };

      reports.unshift(newReport);
      res.json({ status: 'success', data: newReport });

    } catch (error: any) {
      console.error("Upload Error:", error);
      res.status(500).json({ status: 'error', message: error.message });
    }
  });

  // Vite integration
  if (process.env.NODE_ENV !== "production") {
    console.log("Initializing Vite dev server middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Serving static production files from dist...");
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`JEJAK Server is live at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("CRITICAL: Failed to start server:", err);
});
