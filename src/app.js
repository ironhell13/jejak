// JEJAK - Client-side Advanced Application Logic with Multi-view Redesign
// Compatible with the new #91cd99 based color scheme

let currentCoords = { lat: -6.2730, lng: 106.7246 }; // Default Bintaro/Jakarta coordinates
let reportsList = [];
let currentFilter = "Semua";

// 1. Inisialisasi Geolocation
function initLocation() {
    if ("geolocation" in navigator) {
        navigator.geolocation.watchPosition(
            (position) => {
                currentCoords.lat = position.coords.latitude;
                currentCoords.lng = position.coords.longitude;
                updateLocationUI();
                updateStampUI();
            },
            (error) => {
                console.warn("GPS Warning (Default coordinates used):", error);
                const statusEl = document.getElementById('status-location');
                if (statusEl) {
                    statusEl.innerHTML = `
                        <div class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></div>
                        <span class="text-[10px] font-bold text-amber-600">6.2730, 106.7246 (GPS OFF)</span>
                    `;
                }
            },
            { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );
    } else {
        updateLocationUI();
    }
}

function updateLocationUI() {
    const statusEl = document.getElementById('status-location');
    if (statusEl) {
        statusEl.innerHTML = `
            <div class="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
            <span>${currentCoords.lat.toFixed(4)}, ${currentCoords.lng.toFixed(4)}</span>
        `;
    }
}

function updateStampUI() {
    const stampGps = document.getElementById('stamp-gps');
    if (stampGps) {
        stampGps.innerText = `LAT ${currentCoords.lat.toFixed(4)} / LNG ${currentCoords.lng.toFixed(4)}`;
    }
}

// 2. Setup Drag and Drop Requirements
const dropArea = document.getElementById('drop-area');
const cameraInput = document.getElementById('camera-input');
const canvas = document.getElementById('watermark-canvas');
const ctx = canvas.getContext('2d');
const previewContainer = document.getElementById('preview-container');
const defaultState = document.getElementById('default-state');
const imageStamp = document.getElementById('image-stamp');
const scanningHud = document.getElementById('scanning-hud');

if (dropArea) {
    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropArea.classList.add('bg-surface-container', 'border-primary');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropArea.classList.remove('bg-surface-container', 'border-primary');
        }, false);
    });

    dropArea.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files && files.length > 0) {
            handleFileSelect(files[0]);
        }
    });
}

if (cameraInput) {
    cameraInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) handleFileSelect(file);
    });
}

// 3. Handle Captured File & Draw Watermark on Canvas
function handleFileSelect(file) {
    if (!file) return;

    // Trigger visual scanning effect
    if (scanningHud) scanningHud.classList.remove('hidden');
    if (defaultState) defaultState.classList.add('hidden');

    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);

            // Create canvas translucent visual watermark band on bottom
            const stripHeight = Math.floor(canvas.height * 0.15);
            ctx.fillStyle = 'rgba(49, 106, 63, 0.85)'; // Emerald tint for watermark alignment
            ctx.fillRect(0, canvas.height - stripHeight, canvas.width, stripHeight);
            
            // Draw watermark coordinates and stamps
            ctx.fillStyle = '#FFFFFF';
            const fontSize = Math.max(14, Math.floor(canvas.width / 32));
            ctx.font = `bold ${fontSize}px Inter, system-ui, sans-serif`;
            
            const timestamp = new Date().toLocaleString('id-ID');
            const stampText1 = `JEJAK VERIFIED | ${timestamp}`;
            const stampText2 = `GPS COORDS: LAT ${currentCoords.lat.toFixed(6)}, LNG ${currentCoords.lng.toFixed(6)}`;
            
            ctx.fillText(stampText1, 30, canvas.height - (stripHeight * 0.6));
            ctx.fillText(stampText2, 30, canvas.height - (stripHeight * 0.25));

            // Show Stamp info overlay in application UI
            const stampTime = document.getElementById('stamp-time');
            const stampGps = document.getElementById('stamp-gps');
            if (stampTime) stampTime.innerText = `${timestamp}`;
            if (stampGps) stampGps.innerText = `LAT ${currentCoords.lat.toFixed(4)} / LNG ${currentCoords.lng.toFixed(4)}`;

            // Toggle element visibilities
            if (scanningHud) scanningHud.classList.add('hidden');
            if (canvas) canvas.classList.remove('hidden');
            if (imageStamp) imageStamp.classList.remove('hidden');
            if (previewContainer) previewContainer.classList.remove('hidden');
            if (dropArea) {
                dropArea.classList.remove('border-dashed', 'pulse-border');
                dropArea.classList.add('border-solid', 'border-primary');
            }
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
}

// 4. Submit and Process with Gemini AI
const btnSubmit = document.getElementById('btn-submit');
if (btnSubmit) {
    btnSubmit.addEventListener('click', async () => {
        const loader = document.getElementById('ai-loader');
        
        btnSubmit.disabled = true;
        if (loader) loader.classList.remove('hidden');

        try {
            // Generate optimized low quality image stream base64 for Gemini payload safety
            const aiCanvas = document.createElement('canvas');
            const maxDimension = 800;
            let w = canvas.width;
            let h = canvas.height;
            if (w > h) {
                if (w > maxDimension) { h *= maxDimension / w; w = maxDimension; }
            } else {
                if (h > maxDimension) { w *= maxDimension / h; h = maxDimension; }
            }
            aiCanvas.width = w;
            aiCanvas.height = h;
            aiCanvas.getContext('2d').drawImage(canvas, 0, 0, w, h);
            
            const lowQualityDataUrl = aiCanvas.toDataURL('image/jpeg', 0.65);
            const base64Payload = lowQualityDataUrl.replace(/^data:image\/\w+;base64,/, "");

            console.log("Analyzing image via backend endpoint...");
            const aiResponse = await fetch('/api/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    imageBase64: base64Payload,
                    mimeType: 'image/jpeg'
                })
            });

            const result = await aiResponse.json();
            console.log("AI Analysis Result Completed:", result);

            let serverAiResult;
            if (result.status === 'success') {
                serverAiResult = result.data;
            } else {
                serverAiResult = result.fallback || {
                    kategori: "Lainnya",
                    tingkat_bahaya: "Sedang",
                    deskripsi: "Laporan masuk. Analisis AI otomatis mengalami kendala teknis.",
                    validitas_foto: true
                };
            }

            const currentUser = JSON.parse(localStorage.getItem('currentUser'));
            
            // Upload the watermarked report to local database
            const fullResolutionImage = canvas.toDataURL('image/jpeg', 0.85);
            const uploadResponse = await fetch('/api/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    foto: fullResolutionImage,
                    lat: currentCoords.lat,
                    lng: currentCoords.lng,
                    aiResult: serverAiResult,
                    reporter: currentUser
                })
            });

            if (!uploadResponse.ok) {
                const errorInfo = await uploadResponse.json().catch(() => ({}));
                throw new Error(errorInfo.message || "Gagal menyimpan laporan ke server");
            }

            const uploadOutput = await uploadResponse.json();
            if (uploadOutput.status === 'success') {
                // Clear the state inputs
                resetUploadForm();
                showView('history');
                await loadHistory();
            } else {
                throw new Error(uploadOutput.message || "Gagal menyimpan data laporan");
            }

        } catch (error) {
            console.error("Submission Failure:", error);
            alert(error.message || "Gagal mengirim data laporan. Silakan periksa koneksi internet Anda.");
        } finally {
            btnSubmit.disabled = false;
            if (loader) loader.classList.add('hidden');
        }
    });
}

function resetUploadForm() {
    if (previewContainer) previewContainer.classList.add('hidden');
    if (canvas) canvas.classList.add('hidden');
    if (imageStamp) imageStamp.classList.add('hidden');
    if (defaultState) defaultState.classList.remove('hidden');
    if (dropArea) {
        dropArea.classList.remove('border-solid', 'border-primary');
        dropArea.classList.add('border-dashed', 'pulse-border');
    }
    if (cameraInput) cameraInput.value = "";
}

const btnCancel = document.getElementById('btn-cancel');
if (btnCancel) {
    btnCancel.addEventListener('click', () => {
        resetUploadForm();
    });
}

// 5. Load Reports from backend and update Metrics Info
async function loadHistory() {
    try {
        const response = await fetch('/api/reports');
        const data = await response.json();
        reportsList = data;

        updateStats();
        renderReportList();
        renderSolvedStream();
    } catch (err) {
        console.error("Error loading community reports data:", err);
    }
}

function updateStats() {
    const resolvedStatEl = document.getElementById('resolved-stat');
    const pendingStatEl = document.getElementById('pending-stat');

    const localResolvedCount = reportsList.filter(r => r.status === 'Tuntas' || r.status === 'Selesai' || r.status === 'Fixed').length;
    const localPendingCount = reportsList.filter(r => r.status === 'Menunggu' || r.status === 'Proses').length;

    if (resolvedStatEl) resolvedStatEl.innerText = (1240 + localResolvedCount).toLocaleString('id-ID');
    if (pendingStatEl) pendingStatEl.innerText = (42 + localPendingCount).toLocaleString('id-ID');
}

// 6. Community Stream Filtering & Rendering
window.filterReports = (category) => {
    currentFilter = category;
    
    // Update chip styling
    const keyMapping = {
        'Semua': 'Semua',
        'Jalan Berlubang': 'Jalan',
        'Tutup Got Hilang': 'Got',
        'Trotoar Rusak': 'Trotoar',
        'Lainnya': 'Lainnya'
    };

    const chips = ['Semua', 'Jalan', 'Got', 'Trotoar', 'Lainnya'];
    chips.forEach(chipId => {
        const btn = document.getElementById(`chip-${chipId}`);
        if (btn) {
            if (keyMapping[category] === chipId) {
                btn.className = "shrink-0 bg-primary-container text-on-primary-container font-inter text-sm font-semibold px-4 py-2 rounded-full border-[1.5px] border-primary-container transition-all cursor-pointer";
            } else {
                btn.className = "shrink-0 bg-transparent text-on-surface-variant font-inter text-sm font-semibold px-4 py-2 rounded-full border-[1.5px] border-outline-variant hover:bg-surface-container-highest transition-all cursor-pointer";
            }
        }
    });

    renderReportList();
};

function renderReportList() {
    const historyList = document.getElementById('history-list');
    if (!historyList) return;

    // Filter list
    let filteredList = reportsList;
    if (currentFilter !== 'Semua') {
        filteredList = reportsList.filter(r => r.kategori === currentFilter);
    }

    if (filteredList.length === 0) {
        historyList.innerHTML = `
            <div class="text-on-surface-variant text-sm font-semibold py-14 text-center border-[1.5px] border-dashed border-outline-variant rounded-[24px]">
                Belum ada laporan dalam kategori "${currentFilter}".
            </div>
        `;
        return;
    }

    historyList.innerHTML = filteredList.map(item => {
        // Danger Level Configs
        let dangerDot = 'bg-primary';
        let dangerText = 'Rendah';
        if (item.tingkat_bahaya === 'Tinggi') {
            dangerDot = 'bg-error';
            dangerText = 'Tinggi';
        } else if (item.tingkat_bahaya === 'Sedang') {
            dangerDot = 'bg-amber-500';
            dangerText = 'Sedang';
        }

        // Category icon selection
        let categoryIcon = 'warning';
        if (item.kategori === 'Jalan Berlubang') categoryIcon = 'warning';
        else if (item.kategori === 'Tutup Got Hilang') categoryIcon = 'dangerous';
        else if (item.kategori === 'Trotoar Rusak') categoryIcon = 'directions_walk';
        else if (item.kategori === 'Galian Mengganggu') categoryIcon = 'construction';

        // Escalation indicator
        let escalationLabel = 'Level 1 - Terkirim';
        let step1Class = 'bg-primary';
        let step2Class = 'bg-surface-container-highest';
        let step3Class = 'bg-surface-container-highest';

        if (item.status === 'Proses') {
            escalationLabel = 'Level 2 - Diproses';
            step1Class = 'bg-primary';
            step2Class = 'bg-primary';
        } else if (item.status === 'Tuntas' || item.status === 'Selesai') {
            escalationLabel = 'Level 3 - Selesai';
            step1Class = 'bg-primary';
            step2Class = 'bg-primary';
            step3Class = 'bg-primary';
        }

        const dateReported = new Date(item.created_at).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });

        return `
            <article onclick="window.openReportDetail(${item.id})" class="bg-surface-bright border-[1.5px] border-outline-variant rounded-[24px] overflow-hidden flex flex-col md:flex-row shadow-sm hover:shadow-md transition-all cursor-pointer hover:border-primary/50">
                <!-- Status Header (Mobile) / Side (Desktop) -->
                <div class="bg-surface-container-low px-4 py-4 md:w-32 md:border-r-[1.5px] border-outline-variant flex flex-row md:flex-col items-center md:items-start justify-between md:justify-start gap-2 border-b-[1.5px] md:border-b-0 shrink-0">
                    <div class="flex items-center gap-1.5">
                        <span class="w-2.5 h-2.5 rounded-full ${dangerDot}"></span>
                        <span class="font-inter text-sm font-semibold text-on-surface">${dangerText}</span>
                    </div>
                    <span class="font-inter text-xs text-on-surface-variant">${dateReported}</span>
                </div>
                <!-- Content Body -->
                <div class="p-5 flex-1 flex flex-col justify-between">
                    <div>
                        <!-- Reporter profile chip -->
                        <div class="flex items-center gap-1.5 mb-2.5 bg-surface-container-low px-3 py-1 w-fit rounded-full border border-outline-variant">
                            <div class="w-5 h-5 rounded-full bg-primary text-on-primary font-space font-bold text-[10px] flex items-center justify-center uppercase">
                                ${(item.reporter_name || 'R')[0]}
                            </div>
                            <span class="font-inter text-[11px] font-semibold text-on-surface">
                                ${item.reporter_name || 'Ridwan BTC'} <span class="font-normal text-on-surface-variant/75">@${item.reporter_username || 'ridwanbtc'}</span>
                            </span>
                        </div>

                        <div class="flex justify-between items-start mb-2">
                            <div class="flex items-center gap-2">
                                <span class="material-symbols-outlined text-primary" style="font-variation-settings: 'FILL' 1;">${categoryIcon}</span>
                                <span class="font-space text-lg font-bold text-on-surface">${item.kategori}</span>
                            </div>
                            <span class="bg-surface-container px-2.5 py-1 rounded font-inter text-xs font-semibold text-on-surface-variant">ID: #JJK-${item.id}</span>
                        </div>
                        <p class="font-inter text-sm text-on-surface-variant leading-relaxed line-clamp-3 mb-4">${item.deskripsi_ai}</p>
                    </div>

                    <!-- Watermarked Photo Thumbnail preview -->
                    <div class="mb-4 rounded-xl border border-outline-variant overflow-hidden max-h-48">
                        <img src="${item.foto_path}" class="w-full h-full object-cover" alt="Laporan Kerusakan">
                    </div>

                    <!-- Progress Graphic tracker -->
                    <div class="border-t-[1.5px] border-outline-variant pt-4">
                        <div class="flex items-center justify-between font-inter text-xs text-on-surface-variant mb-2">
                            <span>Status Eskalasi</span>
                            <span class="text-primary font-bold">${escalationLabel}</span>
                        </div>
                        <div class="flex gap-1.5 h-2 w-full">
                            <div class="flex-1 ${step1Class} rounded-l-full transition-all"></div>
                            <div class="flex-1 ${step2Class} transition-all"></div>
                            <div class="flex-1 ${step3Class} rounded-r-full transition-all"></div>
                        </div>
                    </div>
                </div>
            </article>
        `;
    }).join('');
}

// Solved Stream Renderer (Beranda)
function renderSolvedStream() {
    const solvedStream = document.getElementById('solved-stream');
    if (!solvedStream) return;

    const tuntasReports = reportsList.filter(r => r.status === 'Tuntas' || r.status === 'Selesai');
    
    // Generate static defaults if no dynamic resolved items exist
    if (tuntasReports.length === 0) {
        solvedStream.innerHTML = `
            <div class="bg-surface border-[1.5px] border-outline-variant rounded-[24px] overflow-hidden flex flex-col md:flex-row">
              <div class="md:w-1/3 h-48 md:h-auto bg-surface-container-high relative">
                <img class="w-full h-full object-cover grayscale opacity-80" src="https://images.unsplash.com/photo-1541888946425-d81bb19240f5?q=80&w=600&auto=format&fit=crop" alt="Asphalt road restoration">
                <div class="absolute top-4 left-4 bg-primary-container text-on-primary-container font-inter text-xs font-bold px-3 py-1 rounded-full border-[1.5px] border-on-primary-container flex items-center gap-1">
                  <span class="material-symbols-outlined text-sm" style="font-variation-settings: 'FILL' 1;">build</span>
                  FIXED
                </div>
              </div>
              <div class="p-6 flex flex-col justify-center flex-grow">
                <p class="font-inter text-xs text-on-surface-variant mb-2">Dinas Pekerjaan Umum • Baru Saja</p>
                <h4 class="font-space text-lg font-bold text-on-surface mb-2">Perbaikan Jalan Berlubang Jl. Sudirman</h4>
                <p class="font-inter text-sm text-on-surface-variant">Laporan #JJK-1502 telah diselesaikan secara tuntas. Pengaspalan ulang dan pemadatan jalan telah rampung dilakukan.</p>
              </div>
            </div>

            <div class="bg-surface border-[1.5px] border-outline-variant rounded-[24px] overflow-hidden flex flex-col md:flex-row">
              <div class="md:w-1/3 h-48 md:h-auto bg-surface-container-high relative">
                <img class="w-full h-full object-cover grayscale opacity-80" src="https://images.unsplash.com/photo-1581092160607-ee22621dd758?q=80&w=600&auto=format&fit=crop" alt="PJU replacement works">
                <div class="absolute top-4 left-4 bg-primary-container text-on-primary-container font-inter text-xs font-bold px-3 py-1 rounded-full border-[1.5px] border-on-primary-container flex items-center gap-1">
                  <span class="material-symbols-outlined text-sm" style="font-variation-settings: 'FILL' 1;">build</span>
                  FIXED
                </div>
              </div>
              <div class="p-6 flex flex-col justify-center flex-grow">
                <p class="font-inter text-xs text-on-surface-variant mb-2">Suku Dinas Bina Marga • 5 Jam yang lalu</p>
                <h4 class="font-space text-lg font-bold text-on-surface mb-2">Lampu PJU Taman Suropati Menyala</h4>
                <p class="font-inter text-sm text-on-surface-variant">Laporan #JJK-1402 telah ditindaklanjuti. Penggantian beberapa unit bohlam LED utama dan perbaikan gardu listrik selesai.</p>
              </div>
            </div>
        `;
        return;
    }

    solvedStream.innerHTML = tuntasReports.map(item => {
        const dateReported = new Date(item.created_at).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short'
        });

        return `
            <div onclick="window.openReportDetail(${item.id})" class="bg-surface border-[1.5px] border-outline-variant rounded-[24px] overflow-hidden flex flex-col md:flex-row shadow-sm cursor-pointer hover:shadow-md hover:border-primary/50 transition-all">
              <div class="md:w-1/3 h-48 md:h-auto bg-surface-container-high relative shrink-0">
                <img class="w-full h-full object-cover grayscale opacity-80" src="${item.foto_path}" alt="Pekerjaan Selesai">
                <div class="absolute top-4 left-4 bg-primary-container text-on-primary-container font-inter text-xs font-bold px-3 py-1 rounded-full border-[1.5px] border-on-primary-container flex items-center gap-1">
                  <span class="material-symbols-outlined text-sm" style="font-variation-settings: 'FILL' 1;">build</span>
                  FIXED
                </div>
              </div>
              <div class="p-6 flex flex-col justify-center flex-grow">
                <p class="font-inter text-xs text-on-surface-variant mb-2">Eskalasi Tuntas • ${dateReported}</p>
                <h4 class="font-space text-lg font-bold text-on-surface mb-2">Pekerjaan Selesai: ${item.kategori}</h4>
                <p class="font-inter text-sm text-on-surface-variant">${item.deskripsi_ai}</p>
              </div>
            </div>
        `;
    }).join('');
}

// 6.5. Modal Report Detail
window.openReportDetail = (id) => {
    const report = reportsList.find(r => r.id === id);
    if (!report) return;

    let modal = document.getElementById('report-detail-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'report-detail-modal';
        modal.className = 'fixed inset-0 z-[100] flex items-center justify-center bg-black/60 hidden px-4';
        document.body.appendChild(modal);
    }

    const dateReported = new Date(report.created_at).toLocaleString('id-ID', {
        day: 'numeric', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });

    const locationText = report.alamat_lengkap && report.alamat_lengkap !== "Lokasi tidak diketahui" 
        ? report.alamat_lengkap 
        : `Kel: ${report.kelurahan || '-'}, Kec: ${report.kecamatan || '-'}, ${report.kota || '-'} (${report.lat?.toFixed(4) || 0}, ${report.lng?.toFixed(4) || 0})`;

    modal.innerHTML = `
        <div class="bg-surface w-full max-w-xl rounded-[24px] overflow-hidden flex flex-col max-h-[90vh] shadow-xl relative" onclick="event.stopPropagation()">
            <div class="px-6 py-4 border-b border-outline-variant flex justify-between items-center bg-surface-container-low">
                <h3 class="font-space font-bold text-lg text-on-surface flex items-center gap-2">
                    <span class="material-symbols-outlined text-primary">receipt_long</span>
                    Detail Laporan #JJK-${report.id}
                </h3>
                <button onclick="document.getElementById('report-detail-modal').classList.add('hidden')" class="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-highest flex items-center justify-center text-on-surface-variant transition-colors">
                    <span class="material-symbols-outlined text-sm">close</span>
                </button>
            </div>
            <div class="p-6 overflow-y-auto">
                <div class="mb-5 rounded-xl overflow-hidden border border-outline-variant max-h-64 flex items-center justify-center bg-surface-container-lowest relative">
                    <img src="${report.foto_path}" class="object-contain w-full h-full" alt="Laporan Kerusakan">
                    <div class="absolute bottom-3 right-3 bg-surface-container text-on-surface-variant text-[10px] font-bold px-2 py-1 rounded shadow-sm opacity-80">
                        LAT ${report.lat?.toFixed(4) || '-'} / LNG ${report.lng?.toFixed(4) || '-'}
                    </div>
                </div>
                
                <div class="grid grid-cols-2 gap-4 mb-5">
                    <div class="bg-surface-container-low p-3.5 rounded-xl border border-outline-variant">
                        <span class="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Kategori</span>
                        <span class="font-inter font-semibold text-on-surface">${report.kategori}</span>
                    </div>
                    <div class="bg-surface-container-low p-3.5 rounded-xl border border-outline-variant">
                        <span class="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Status & Bahaya</span>
                        <div class="flex items-center gap-1.5 mt-0.5">
                            <span class="w-2 h-2 rounded-full ${report.tingkat_bahaya === 'Tinggi' ? 'bg-error' : report.tingkat_bahaya === 'Sedang' ? 'bg-amber-500' : 'bg-primary'}"></span>
                            <span class="font-inter font-semibold text-on-surface">${report.status} | ${report.tingkat_bahaya}</span>
                        </div>
                    </div>
                </div>

                <div class="bg-surface-container-low p-4 rounded-xl border border-outline-variant mb-5">
                    <span class="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-3">Lokasi & Waktu</span>
                    <p class="font-inter text-sm text-on-surface mb-3 flex items-start gap-2.5">
                        <span class="material-symbols-outlined text-[16px] text-primary mt-0.5">location_on</span>
                        <span class="leading-relaxed">${locationText}</span>
                    </p>
                    <p class="font-inter text-sm text-on-surface flex items-start gap-2.5">
                        <span class="material-symbols-outlined text-[16px] text-primary mt-0.5">schedule</span>
                        <span>${dateReported}</span>
                    </p>
                </div>

                <div class="bg-surface-container-low p-4 rounded-xl border border-outline-variant">
                    <span class="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-2">Deskripsi Otomatis AI</span>
                    <p class="font-inter text-sm text-on-surface leading-relaxed">${report.deskripsi_ai}</p>
                </div>
            </div>
        </div>
    `;
    
    // Close modal if clicking outside
    modal.onclick = (e) => {
        if (e.target === modal) modal.classList.add('hidden');
    };
    
    modal.classList.remove('hidden');
};

// 7. Navigation Controller
window.showView = (viewName) => {
    const dashboardView = document.getElementById('dashboard-view');
    const homeView = document.getElementById('home-view');
    const historyView = document.getElementById('history-view');
    
    const navDashboard = document.getElementById('nav-dashboard');
    const navHome = document.getElementById('nav-home');
    const navHistory = document.getElementById('nav-history');

    const deskNavDashboard = document.getElementById('desk-nav-dashboard');
    const deskNavHome = document.getElementById('desk-nav-home');
    const deskNavHistory = document.getElementById('desk-nav-history');

    // Hide all views safely
    [dashboardView, homeView, historyView].forEach(v => {
        if (v) v.classList.add('hidden');
    });
    
    // Reset mobile bottom nav buttons
    [navDashboard, navHome, navHistory].forEach(n => {
        if (n) {
            n.className = "flex-grow flex flex-col items-center justify-center text-on-surface-variant transition-all hover:text-primary relative py-1";
            const dot = n.querySelector('.nav-dot');
            if (dot) dot.classList.add('hidden');
        }
    });

    // Reset desktop top nav buttons
    [deskNavDashboard, deskNavHome, deskNavHistory].forEach(dn => {
        if (dn) {
            dn.className = "text-on-surface-variant hover:bg-surface-container transition-colors px-3 py-2 rounded-lg";
        }
    });

    if (viewName === 'dashboard') {
        if (dashboardView) dashboardView.classList.remove('hidden');
        if (navDashboard) {
            navDashboard.className = "flex-grow flex flex-col items-center justify-center bg-primary-container text-on-primary-container rounded-full px-6 py-1.5 font-bold scale-105 duration-200 ease-out relative";
            const dot = navDashboard.querySelector('.nav-dot');
            if (dot) dot.classList.remove('hidden');
        }
        if (deskNavDashboard) {
            deskNavDashboard.className = "text-primary font-bold hover:bg-surface-container transition-colors px-3 py-2 rounded-lg";
        }
    } else if (viewName === 'home') {
        if (homeView) homeView.classList.remove('hidden');
        if (navHome) {
            navHome.className = "flex-grow flex flex-col items-center justify-center bg-primary-container text-on-primary-container rounded-full px-6 py-1.5 font-bold scale-105 duration-200 ease-out relative";
            const dot = navHome.querySelector('.nav-dot');
            if (dot) dot.classList.remove('hidden');
        }
        if (deskNavHome) {
            deskNavHome.className = "text-primary font-bold hover:bg-surface-container transition-colors px-3 py-2 rounded-lg";
        }
    } else {
        if (historyView) historyView.classList.remove('hidden');
        if (navHistory) {
            navHistory.className = "flex-grow flex flex-col items-center justify-center bg-primary-container text-on-primary-container rounded-full px-6 py-1.5 font-bold scale-105 duration-200 ease-out relative";
            const dot = navHistory.querySelector('.nav-dot');
            if (dot) dot.classList.remove('hidden');
        }
        if (deskNavHistory) {
            deskNavHistory.className = "text-primary font-bold hover:bg-surface-container transition-colors px-3 py-2 rounded-lg";
        }
        loadHistory();
    }
};

// ============================================
// AUTHENTICATION STATE & DECORATOR HANDLERS
// ============================================

window.checkAuthState = () => {
    const userJson = localStorage.getItem('currentUser');
    const authView = document.getElementById('auth-view');
    const headerEl = document.querySelector('header');
    const bottomNavEl = document.querySelector('nav.md\\:hidden');
    
    const dashboardView = document.getElementById('dashboard-view');
    const homeView = document.getElementById('home-view');
    const historyView = document.getElementById('history-view');

    if (!userJson) {
        // Hide all principal application contexts
        if (authView) authView.classList.remove('hidden');
        if (headerEl) headerEl.classList.add('hidden');
        if (bottomNavEl) bottomNavEl.classList.add('hidden');

        [dashboardView, homeView, historyView].forEach(view => {
            if (view) view.classList.add('hidden');
        });
    } else {
        const user = JSON.parse(userJson);
        
        // Unhide system layouts
        if (authView) authView.classList.add('hidden');
        if (headerEl) headerEl.classList.remove('hidden');
        if (bottomNavEl) bottomNavEl.classList.remove('hidden');

        // Render User Display badges
        const profileMenu = document.getElementById('user-profile-menu');
        const userDisplayName = document.getElementById('user-display-name');
        const userAvatar = document.getElementById('user-avatar');
        const dropdownUsername = document.getElementById('dropdown-username');
        const dropdownEmail = document.getElementById('dropdown-email');

        if (profileMenu) profileMenu.classList.remove('hidden');
        if (userDisplayName) userDisplayName.innerText = user.name;
        if (userAvatar) {
            userAvatar.innerText = user.name[0];
            userAvatar.className = "w-6 h-6 rounded-full bg-primary text-on-primary font-space font-bold text-xs flex items-center justify-center uppercase";
        }
        if (dropdownUsername) dropdownUsername.innerText = `@${user.username}`;
        if (dropdownEmail) dropdownEmail.innerText = user.email;

        // Default routing
        showView('dashboard');
    }
};

window.switchAuthTab = (type) => {
    const formLogin = document.getElementById('form-login');
    const formSignup = document.getElementById('form-signup');
    const tabLogin = document.getElementById('tab-login');
    const tabSignup = document.getElementById('tab-signup');
    
    if (type === 'login') {
        if (formLogin) formLogin.classList.remove('hidden');
        if (formSignup) formSignup.classList.add('hidden');
        if (tabLogin) tabLogin.className = "flex-1 text-center font-space text-xs font-bold py-2 rounded-lg bg-primary-container text-on-primary-container transition-all cursor-pointer";
        if (tabSignup) tabSignup.className = "flex-1 text-center font-space text-xs font-semibold py-2 rounded-lg text-on-surface-variant hover:text-on-surface transition-all cursor-pointer";
    } else {
        if (formLogin) formLogin.classList.add('hidden');
        if (formSignup) formSignup.classList.remove('hidden');
        if (tabLogin) tabLogin.className = "flex-1 text-center font-space text-xs font-semibold py-2 rounded-lg text-on-surface-variant hover:text-on-surface transition-all cursor-pointer";
        if (tabSignup) tabSignup.className = "flex-1 text-center font-space text-xs font-bold py-2 rounded-lg bg-primary-container text-on-primary-container transition-all cursor-pointer";
    }
};

window.toggleProfileDropdown = () => {
    const dropdown = document.getElementById('profile-dropdown');
    if (dropdown) dropdown.classList.toggle('hidden');
};

window.handleLogout = () => {
    localStorage.removeItem('currentUser');
    const dropdown = document.getElementById('profile-dropdown');
    if (dropdown) dropdown.classList.add('hidden');
    checkAuthState();
};

window.triggerGoogleOAuthMock = () => {
    const modal = document.getElementById('google-chooser-modal');
    const card = document.getElementById('google-chooser-card');
    if (modal) {
        modal.classList.remove('hidden');
        setTimeout(() => {
            if (card) {
                card.classList.remove('scale-100', 'opacity-0');
                card.classList.add('scale-100', 'opacity-100');
            }
        }, 10);
    }
};

window.closeGoogleChooser = () => {
    const modal = document.getElementById('google-chooser-modal');
    if (modal) modal.classList.add('hidden');
};

window.selectGoogleAccount = async (name, email) => {
    closeGoogleChooser();
    try {
        const response = await fetch('/api/auth/google', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email })
        });
        const result = await response.json();
        if (result.status === 'success') {
            localStorage.setItem('currentUser', JSON.stringify(result.user));
            checkAuthState();
        } else {
            alert(result.message);
        }
    } catch (err) {
        console.error("Google choosing error:", err);
    }
};

// Setup Form listeners explicitly
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('form-login');
    const signupForm = document.getElementById('form-signup');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const usernameOrEmail = document.getElementById('login-username').value.trim();
            const password = document.getElementById('login-password').value;

            try {
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ usernameOrEmail, password })
                });
                const result = await response.json();
                if (result.status === 'success') {
                    localStorage.setItem('currentUser', JSON.stringify(result.user));
                    checkAuthState();
                } else {
                    alert(result.message || "Login gagal.");
                }
            } catch (err) {
                console.error("Web Login error:", err);
                alert("Gangguan koneksi server.");
            }
        });
    }

    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('signup-name').value.trim();
            const email = document.getElementById('signup-email').value.trim();
            const username = document.getElementById('signup-username').value.trim();
            const password = document.getElementById('signup-password').value;

            try {
                const response = await fetch('/api/auth/signup', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, email, username, password })
                });
                const result = await response.json();
                if (result.status === 'success') {
                    localStorage.setItem('currentUser', JSON.stringify(result.user));
                    checkAuthState();
                } else {
                    alert(result.message || "Pendaftaran gagal.");
                }
            } catch (err) {
                console.error("Web Signup error:", err);
                alert("Gangguan koneksi server.");
            }
        });
    }

    // Dismiss profile dropdown on outside clicks
    document.addEventListener('click', (e) => {
        const toggleBtn = document.getElementById('btn-profile-toggle');
        const dropdown = document.getElementById('profile-dropdown');
        if (toggleBtn && dropdown && !toggleBtn.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.classList.add('hidden');
        }
    });
});

// Start initial routines
initLocation();
checkAuthState();
loadHistory();
