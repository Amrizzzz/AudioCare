<script setup>
import { ref, computed, onBeforeUnmount } from 'vue'

// ---------- Data ----------
const frequencies = [500, 1000, 2000, 4000, 8000]
const totalSteps = frequencies.length
const TONE_MS = 2000

const groups = [
    { label: 'Rendah', freqs: [500, 1000] },
    { label: 'Menengah', freqs: [2000] },
    { label: 'Tinggi', freqs: [4000, 8000] },
]

// ---------- State ----------
const screen = ref('landing') // landing | prep | test | result
const currentStep = ref(1)
const isPlaying = ref(false)
const hasPlayed = ref(false)
const responses = ref({}) // { 500: true, 1000: false, ... }

let audioCtx = null
let toneTimer = null

// ---------- Computed ----------
const currentFreq = computed(() => frequencies[currentStep.value - 1])
const progress = computed(() => (currentStep.value / totalSteps) * 100)

const instruction = computed(() => {
    if (isPlaying.value) return 'Dengarkan dengan saksama...'
    if (hasPlayed.value) return 'Silakan pilih jawaban Anda di bawah.'
    return 'Tekan tombol putar untuk memutar suara'
})

const heardCount = computed(() => Object.values(responses.value).filter(Boolean).length)

const groupResults = computed(() =>
    groups.map((g) => {
        const heard = g.freqs.filter((f) => responses.value[f]).length
        const percent = Math.round((heard / g.freqs.length) * 100)
        let status = { text: 'Baik', variant: 'success' }
        if (percent === 0) status = { text: 'Kurang', variant: 'danger' }
        else if (percent < 100) status = { text: 'Sedang', variant: 'warning' }
        return { label: g.label, percent, ...status }
    })
)

const overall = computed(() => {
    if (heardCount.value === totalSteps)
        return {
            title: 'Pendengaran Anda Normal',
            text: 'Berdasarkan tes, kemampuan Anda mendengar berbagai frekuensi berada dalam batas sehat. Tetap jaga kesehatan telinga Anda dari paparan suara bising.',
            variant: 'success',
            icon: 'carbon:thumbs-up-filled',
        }
    if (heardCount.value >= 3)
        return {
            title: 'Ada Penurunan Ringan',
            text: 'Beberapa frekuensi tidak terdengar. Pastikan Anda berada di ruang tenang dan ulangi tes. Jika hasilnya sama, periksakan ke dokter THT.',
            variant: 'warning',
            icon: 'gravity-ui:triangle-exclamation-fill',
        }
    return {
        title: 'Disarankan Pemeriksaan Lanjutan',
        text: 'Banyak frekuensi yang tidak terdengar. Kami menyarankan Anda berkonsultasi dengan dokter atau audiolog untuk pemeriksaan menyeluruh.',
        variant: 'danger',
        icon: 'gravity-ui:circle-exclamation',
    }
})

// Lingkaran SVG: keliling = 2 * PI * 45 ≈ 283
const ringOffset = computed(() => 283 * (1 - heardCount.value / totalSteps))
const ringColor = computed(
    () => ({ success: '#10b981', warning: '#f59e0b', danger: '#ef4444' })[overall.value.variant]
)

// ---------- Navigasi ----------
function goTo(name) {
    screen.value = name
    window.scrollTo({ top: 0, behavior: 'smooth' })
}

function startTest() {
    currentStep.value = 1
    responses.value = {}
    resetSound()
    goTo('test')
}

function restart() {
    stopTone()
    currentStep.value = 1
    responses.value = {}
    resetSound()
    goTo('landing')
}

// ---------- Audio (Web Audio API - nada sungguhan) ----------
function playTone(freq) {
    const AudioContext = window.AudioContext || window.webkitAudioContext
    if (!AudioContext) return
    if (!audioCtx) audioCtx = new AudioContext()
    if (audioCtx.state === 'suspended') audioCtx.resume()

    const osc = audioCtx.createOscillator()
    const gain = audioCtx.createGain()
    const now = audioCtx.currentTime
    const dur = TONE_MS / 1000

    osc.type = 'sine'
    osc.frequency.value = freq
    // fade in/out agar tidak ada bunyi "klik"
    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(0.25, now + 0.1)
    gain.gain.linearRampToValueAtTime(0, now + dur)

    osc.connect(gain).connect(audioCtx.destination)
    osc.start(now)
    osc.stop(now + dur)
}

function stopTone() {
    clearTimeout(toneTimer)
    isPlaying.value = false
}

function simulateSound() {
    if (isPlaying.value) return
    isPlaying.value = true
    playTone(currentFreq.value)

    toneTimer = setTimeout(() => {
        isPlaying.value = false
        hasPlayed.value = true
    }, TONE_MS)
}

function resetSound() {
    stopTone()
    hasPlayed.value = false
}

// ---------- Jawaban ----------
function recordResponse(heard) {
    if (!hasPlayed.value) return
    responses.value[currentFreq.value] = heard

    if (currentStep.value < totalSteps) {
        currentStep.value++
        resetSound()
    } else {
        setTimeout(() => goTo('result'), 300)
    }
}

onBeforeUnmount(() => {
    stopTone()
    if (audioCtx) audioCtx.close()
})
</script>

<template>
    <div class="app-shell d-flex flex-column min-vh-100">
        <!-- Navbar -->
        <nav class="navbar bg-white border-bottom shadow-sm">
            <div class="container" style="max-width: 1152px">
                <a class="navbar-brand d-flex align-items-center gap-2 fw-bold text-brand-dark" href="#"
                    @click.prevent="restart">
                    <span class="brand-logo"><iconify-icon icon="keyline-icons:ear-listen" width="24"
                            height="24"></iconify-icon></span>
                    AudioCare
                </a>
                <span class="navbar-text small fw-medium d-none d-sm-block">Klinik Pendengaran Digital</span>
            </div>
        </nav>

        <!-- Konten utama -->
        <main class="flex-grow-1 d-flex align-items-center justify-content-center p-3 p-lg-4">
            <div class="card main-card border-0 rounded-5 shadow-lg overflow-hidden w-100 p-20">
                <Transition name="screen" mode="out-in">
                    <!-- 1. LANDING -->
                    <section v-if="screen === 'landing'" key="landing" class="p-4 p-md-5 text-center">
                        <div class="icon-circle icon-circle-lg mx-auto mb-4">
                            <iconify-icon icon="maki:doctor" width="48" height="48"></iconify-icon>
                        </div>
                        <h3 class="display-5 fw-bold mb-3">
                            Tes Pendengaran Online <span class="text-brand">Gratis</span>
                        </h3>
                        <p class="fs-5 text-secondary mb-5 mx-auto" style="max-width: 640px">
                            Ketahui kondisi pendengaran Anda hanya dalam waktu 3 menit. Cepat, aman, dan dirancang oleh
                            ahli
                            audiologi profesional.
                        </p>

                        <div class="row g-3 mx-auto mb-5 text-start" style="max-width: 768px">
                            <div class="col-md-4">
                                <div class="feature-box h-100">
                                    <div class="icon-circle icon-circle-sm mb-4">
                                        <iconify-icon icon="mdi:clock-fast" width="48" height="48"></iconify-icon>
                                    </div>
                                    <!-- <i class="fa-solid fa-bolt text-warning fs-4 mb-2"></i> -->
                                    <h3 class="h6 fw-semibold text-center">Cepat &amp; Mudah</h3>
                                    <p class="small text-secondary mb-0">Selesai hanya dalam 3 menit.</p>
                                </div>
                            </div>
                            <div class="col-md-4">
                                <div class="feature-box h-100">
                                    <div class="icon-circle icon-circle-sm mb-4">
                                        <iconify-icon icon="mdi:shield-check-outline" width="48" height="48"></iconify-icon>
                                    </div>
                                    <!-- <i class="fa-solid fa-shield-halved text-success fs-4 mb-2"></i> -->
                                    <h3 class="h6 fw-semibold text-center">Akurat &amp; Terpercaya</h3>
                                    <p class="small text-secondary mb-0">Menggunakan standar frekuensi medis.</p>
                                </div>
                            </div>
                            <div class="col-md-4">
                                <div class="feature-box h-100">
                                    <div class="icon-circle icon-circle-sm mb-4">
                                        <iconify-icon icon="fa6-solid:user-doctor" width="48" height="48"></iconify-icon>
                                    </div>
                                    <!-- <i class="fa-solid fa-user-doctor text-brand fs-4 mb-2"></i> -->
                                    <h3 class="h6 fw-semibold text-center">Hasil Instan</h3>
                                    <p class="small text-secondary mb-0">Dapatkan evaluasi dan rekomendasi langsung.</p>
                                </div>
                            </div>
                        </div>

                        <button
                            class="btn btn-brand btn-lg rounded-pill px-5 py-3 fw-semibold shadow d-inline-flex align-items-center gap-2"
                            @click="goTo('prep')">
                            Mulai Tes Sekarang <i class="fa-solid fa-arrow-right"></i>
                        </button>
                    </section>

                    <!-- 2. PERSIAPAN -->
                    <section v-else-if="screen === 'prep'" key="prep" class="p-4 p-md-5">
                        <div class="text-center mb-5">
                            <h3 class="fw-bold mb-2">Persiapan Sebelum Memulai</h3>
                            <p class="text-secondary mb-0">Untuk hasil yang akurat, ikuti 3 langkah sederhana berikut:
                            </p>
                        </div>

                        <div class="row g-4 mb-5">
                            <div class="col-md-4">
                                <div class="prep-card h-100">
                                    <div class="icon-circle mb-3">
                                        <iconify-icon icon="ph:headphones-bold" width="48" height="48"></iconify-icon>
                                    </div>
                                    <h3 class="h5 fw-bold">Gunakan Headphone</h3>
                                    <p class="small text-secondary mb-0">Gunakan earphone atau headphone agar suara
                                        terdengar jelas di kedua telinga.</p>
                                </div>
                            </div>
                            <div class="col-md-4">
                                <div class="prep-card h-100">
                                    <div class="icon-circle mb-3">
                                        <iconify-icon icon="bi:volume-up-fill" width="48" height="48"></iconify-icon>
                                    </div>
                                    <h3 class="h5 fw-bold">Atur Volume</h3>
                                    <p class="small text-secondary mb-0">Pastikan volume perangkat Anda berada di
                                        tingkat 50% untuk kalibrasi standar.</p>
                                </div>
                            </div>
                            <div class="col-md-4">
                                    <div class="prep-card h-100">
                                        <div class="icon-circle mb-3">
                                        <iconify-icon icon="bi:door-closed-fill" width="48" height="48"></iconify-icon>
                                    </div>
                                        <h3 class="h5 fw-bold">Cari Ruang Tenang</h3>
                                        <p class="small text-secondary mb-0">Pindah ke ruangan yang sunyi, jauh dari
                                            kebisingan latar belakang atau TV.</p>
                                    </div>
                                </div>
                            </div>

                            <div class="d-flex justify-content-between align-items-center bg-light p-3 rounded-4">
                                <button class="btn btn-link text-secondary text-decoration-none fw-medium"
                                    @click="goTo('landing')">Kembali</button>
                                <button
                                    class="btn btn-brand rounded-4 px-6 py-2.5 fw-semibold d-inline-flex align-items-center gap-2"
                                    @click="startTest">
                                    Saya Siap, Lanjut
                                    <iconify-icon icon="mdi:arrow-right"></iconify-icon>
                                </button>
                            </div>
                    </section>

                    <!-- 3. TES -->
                    <section v-else-if="screen === 'test'" key="test" class="p-4 p-md-5 d-flex flex-column test-screen">
                        <div class="mb-4">
                            <div class="d-flex justify-content-between small fw-semibold text-secondary mb-2">
                                <span>Tahap {{ currentStep }} dari {{ totalSteps }}</span>
                                <span class="text-brand">Frekuensi: {{ currentFreq }} Hz</span>
                            </div>
                            <div class="progress" style="height: 10px" role="progressbar" :aria-valuenow="progress"
                                aria-valuemin="0" aria-valuemax="100">
                                <div class="progress-bar bg-brand progress-smooth" :style="{ width: progress + '%' }">
                                </div>
                            </div>
                        </div>

                        <div class="flex-grow-1 d-flex flex-column align-items-center justify-content-center py-4">
                            <h2 class="h2 fw-bold text-center mb-4">Apakah Anda mendengar nada ini?</h2>

                            <div class="sound-wave mb-5" :class="{ playing: isPlaying }">
                                <span class="wave-circle"></span>
                                <span class="wave-circle"></span>
                                <span class="wave-circle"></span>
                                <button class="ear-btn" :disabled="isPlaying"
                                    :aria-label="isPlaying ? 'Sedang memutar' : 'Putar nada'" @click="simulateSound">
                                    <iconify-icon icon="at-icons:play"
                                        :icon="isPlaying ? 'mdi:volume-high' : hasPlayed ? 'ic:baseline-replay' : 'at-icons:play'"></iconify-icon>
                                </button>
                            </div>

                            <p class="text-secondary fw-medium text-center mb-4"
                                :class="{ 'pulse-text': !isPlaying && !hasPlayed }">
                                {{ instruction }}
                            </p>

                            <div class="row g-3 w-100 answer-row" :class="{ disabled: !hasPlayed }">
                                <div class="col-6">
                                    <button
                                        class="btn btn-outline-secondary bg-white w-100 rounded-4 py-3 fw-bold d-flex flex-column align-items-center gap-2"
                                        :disabled="!hasPlayed" @click="recordResponse(false)">
                                        <iconify-icon icon="bi:volume-mute-fill" width="24" height="24"></iconify-icon>
                                        Tidak Terdengar
                                    </button>
                                </div>
                                <div class="col-6">
                                    <button
                                        class="btn btn-brand w-100 rounded-4 py-3 fw-bold shadow d-flex flex-column align-items-center gap-2"
                                        :disabled="!hasPlayed" @click="recordResponse(true)">
                                        <iconify-icon icon="bi:volume-up-fill" width="24" height="24"></iconify-icon>
                                        Saya Mendengar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </section>

                    <!-- 4. HASIL -->
                    <section v-else key="result" class="p-4 p-md-5 text-center">
                        <div class="position-relative d-inline-block mb-4">
                            <svg width="128" height="128" viewBox="0 0 100 100" style="transform: rotate(-90deg)">
                                <circle cx="50" cy="50" r="45" fill="none" stroke="#f1f5f9" stroke-width="10" />
                                <circle cx="50" cy="50" r="45" fill="none" stroke-width="10" stroke-linecap="round"
                                    stroke-dasharray="283" :stroke-dashoffset="ringOffset" :stroke="ringColor"
                                    class="ring" />
                            </svg>
                            <div class="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center fs-2"
                                :class="`text-${overall.variant}`">
                                <iconify-icon :icon="overall.icon" width="34" height="34"></iconify-icon>
                            </div>
                        </div>

                        <h3 class="fw-bold mb-2 mt-2">{{ overall.title }}</h3>
                        <p class="fs-6 text-secondary mb-4 mx-auto" style="max-width: 600px">{{ overall.text }}</p>

                        <div class="bg-light rounded-4 p-4 mb-4 mx-auto border text-start mt-3" style="max-width: 672px">
                            <h3 class="h6 fw-semibold mb-3">Rincian Frekuensi:</h3>
                            <div v-for="g in groupResults" :key="g.label" class="d-flex align-items-center small mb-3">
                                <span class="fw-medium text-secondary" style="width: 80px">{{ g.label }}</span>
                                <div class="progress flex-grow-1 mx-3" style="height: 8px">
                                    <div class="progress-bar" :class="`bg-${g.variant}`"
                                        :style="{ width: g.percent + '%' }"></div>
                                </div>
                                <span class="fw-bold text-end" :class="`text-${g.variant}`" style="width: 56px">{{
                                    g.text }}</span>
                            </div>
                        </div>

                        <div class="d-flex flex-column flex-sm-row gap-3 justify-content-center mt-3">
                            <button class="btn btn-brand-soft rounded-4 px-4 py-3 fw-semibold d-flex align-items-center gap-2"
                                @click="restart">
                                <!-- <i class="fa-solid fa-arrow-rotate-right me-2"></i> -->
                                <iconify-icon icon="mdi:arrow-rotate-right" width="20" height="20"></iconify-icon>
                                Ulangi Tes
                            </button>
                            <button
                                class="btn btn-dark rounded-4 px-5 py-3 fw-semibold shadow d-flex align-items-center gap-2">
                                <!-- <i class="fa-solid fa-user-doctor me-2"></i> -->
                                <iconify-icon icon="fa6-solid:user-doctor" width="20" height="20"></iconify-icon>
                                Konsultasi Dokter (Gratis)
                            </button>
                        </div>
                    </section>
                </Transition>
            </div>
        </main>

        <footer class="bg-white border-top py-4">
            <div class="container text-center small text-secondary">
                &copy; 2026 Klinik AudioCare Indonesia. Hanya untuk keperluan skrining awal, bukan diagnosis medis.
            </div>
        </footer>
    </div>
</template>

<style scoped>
.app-shell {
    --brand-50: #eff6ff;
    --brand-100: #dbeafe;
    --brand-200: #bfdbfe;
    --brand-500: #3b82f6;
    --brand-600: #2563eb;
    --brand-700: #1d4ed8;
    --brand-900: #1e3a8a;
    background-color: #f8fafc;
    font-family: 'Inter', system-ui, sans-serif;
    overflow-x: hidden;
}

/* Kartu utama */
.main-card {
    max-width: 896px;
    min-height: 500px;
}

.test-screen {
    min-height: 500px;
}

/* Warna brand */
.text-brand {
    color: var(--brand-600);
}

.text-brand-dark {
    color: var(--brand-900);
}

.bg-brand {
    background-color: var(--brand-600);
}

.brand-logo {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    background: var(--brand-600);
    color: #fff;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 0.95rem;
}

.btn-brand {
    background-color: var(--brand-600);
    border-color: var(--brand-600);
    color: #fff;
}

.btn-brand:hover,
.btn-brand:focus {
    background-color: var(--brand-700);
    border-color: var(--brand-700);
    color: #fff;
}

.btn-brand:disabled {
    background-color: var(--brand-600);
    border-color: var(--brand-600);
    color: #fff;
}

.btn-brand-soft {
    background-color: var(--brand-50);
    border: 1px solid var(--brand-200);
    color: var(--brand-600);
}

.btn-brand-soft:hover {
    background-color: var(--brand-100);
    color: var(--brand-600);
}

/* Ikon & kartu */
.icon-circle {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    background: var(--brand-50);
    color: var(--brand-600);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-inline: auto;
}

.icon-circle-lg {
    width: 80px;
    height: 80px;
}

.feature-box {
    background: #f8fafc;
    border: 1px solid #f1f5f9;
    border-radius: 1rem;
    padding: 1.25rem;
}

.prep-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 1.5rem;
    background: #fff;
    border: 1px solid #f1f5f9;
    border-radius: 1rem;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    transition: border-color 0.2s;
}

.prep-card:hover {
    border-color: var(--brand-200);
}

/* Transisi antar layar */
.screen-enter-active,
.screen-leave-active {
    transition: opacity 0.3s ease, transform 0.3s ease;
}

.screen-enter-from {
    opacity: 0;
    transform: translateY(20px);
}

.screen-leave-to {
    opacity: 0;
}

/* Progress */
.progress-smooth {
    transition: width 0.5s ease-out;
}

/* Animasi gelombang suara */
.sound-wave {
    position: relative;
    width: 120px;
    height: 120px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.wave-circle {
    position: absolute;
    inset: 0;
    border-radius: 50%;
    background-color: rgba(59, 130, 246, 0.2);
    opacity: 0;
    transform: scale(0.5);
}

.playing .wave-circle {
    animation: ripple 2s infinite ease-out;
}

.playing .wave-circle:nth-child(2) {
    animation-delay: 0.6s;
}

.playing .wave-circle:nth-child(3) {
    animation-delay: 1.2s;
}

@keyframes ripple {
    0% {
        transform: scale(0.5);
        opacity: 1;
    }

    100% {
        transform: scale(1.5);
        opacity: 0;
    }
}

.ear-btn {
    position: relative;
    z-index: 1;
    width: 80px;
    height: 80px;
    border-radius: 50%;
    border: 2px solid var(--brand-200);
    background: var(--brand-50);
    color: var(--brand-600);
    font-size: 1.75rem;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s ease;
}

.ear-btn:hover:not(:disabled) {
    background: var(--brand-100);
}

.ear-btn:focus-visible {
    outline: 3px solid var(--brand-500);
    outline-offset: 3px;
}

.playing .ear-btn {
    background: var(--brand-600);
    border-color: var(--brand-600);
    color: #fff;
    box-shadow: 0 0 15px rgba(37, 99, 235, 0.5);
}

/* Teks berdenyut */
.pulse-text {
    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
    50% {
        opacity: 0.5;
    }
}

/* Tombol jawaban (nonaktif sampai nada diputar) */
.answer-row {
    max-width: 448px;
    transition: opacity 0.3s;
}

.answer-row.disabled {
    opacity: 0.5;
    pointer-events: none;
}

/* Cincin hasil */
.ring {
    transition: stroke-dashoffset 1s ease-out;
}

@media (prefers-reduced-motion: reduce) {

    .playing .wave-circle,
    .pulse-text {
        animation: none;
    }

    .screen-enter-active,
    .screen-leave-active,
    .progress-smooth,
    .ring {
        transition: none;
    }
}
</style>