class Player {
    private audio: HTMLAudioElement | null = null;
    private _currentPosition: number = 0;

    load(url: string) {
        if (this.audio) {
            this.audio.pause();
            this.audio = null;
        }
        this.audio = new Audio(url);
        this.audio.currentTime = this._currentPosition;
        this.audio.addEventListener('timeupdate', () => {
            this._currentPosition = this.audio!.currentTime;
        });
    }

    play() {
        if (this.audio) {
            this.audio.currentTime = this._currentPosition;
            this.audio.play();
        }
    }

    pause() {
        if (this.audio) {
            this.audio.pause();
            this._currentPosition = this.audio.currentTime;
        }
    }

    stop() {
        if (this.audio) {
            this.audio.pause();
            this.audio.currentTime = 0;
            this._currentPosition = 0;
        }
    }

    setCurrentPosition(position: number) {
        this._currentPosition = position;
        if (this.audio) {
            this.audio.currentTime = position;
        }
    }

    get currentPosition() {
        return this._currentPosition;
    }

    isLoaded() {
        return this.audio !== null;
    }
}

// --- New: Storage helper ---
class ProgressStorage {
    private key = 'audiobookProgress';

    save(bookId: string, position: number) {
        const data = this.loadAll();
        data[bookId] = position;
        localStorage.setItem(this.key, JSON.stringify(data));
    }

    load(bookId: string): number {
        const data = this.loadAll();
        return data[bookId] || 0;
    }

    private loadAll(): Record<string, number> {
        try {
            return JSON.parse(localStorage.getItem(this.key) || '{}');
        } catch {
            return {};
        }
    }
}

const player = new Player();
const storage = new ProgressStorage();

let bookId = '';

const fileInput = document.getElementById('fileInput') as HTMLInputElement;
const playBtn = document.getElementById('playButton') as HTMLButtonElement;
const pauseBtn = document.getElementById('pauseButton') as HTMLButtonElement;
const stopBtn = document.getElementById('stopButton') as HTMLButtonElement;
const progressBar = document.getElementById('progressBar') as HTMLInputElement;
const rewindBtn = document.getElementById('rewindButton') as HTMLButtonElement;
const forwardBtn = document.getElementById('forwardButton') as HTMLButtonElement;
const currentTimeSpan = document.getElementById('currentTime') as HTMLSpanElement;
const durationSpan = document.getElementById('duration') as HTMLSpanElement;



// Helper to format time
function formatTime(sec: number): string {
    if (isNaN(sec) || !isFinite(sec)) return "00:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

// Update progress bar and time display
function updateProgressBar() {
    if (player.isLoaded() && player['audio']) {
        const audio = player['audio'] as HTMLAudioElement;
        if (audio.duration > 0) {
            progressBar.max = audio.duration.toString();
            progressBar.value = audio.currentTime.toString();
            currentTimeSpan.textContent = formatTime(audio.currentTime);
            durationSpan.textContent = formatTime(audio.duration);
        } else {
            progressBar.value = "0";
            currentTimeSpan.textContent = "00:00";
            durationSpan.textContent = "00:00";
        }
    }
}

// Fast forward and rewind
rewindBtn.addEventListener('click', () => {
    if (player.isLoaded() && player['audio']) {
        const audio = player['audio'] as HTMLAudioElement;
        audio.currentTime = Math.max(0, audio.currentTime - 10);
        player.setCurrentPosition(audio.currentTime);
        updateProgressBar();
    }
});
forwardBtn.addEventListener('click', () => {
    if (player.isLoaded() && player['audio']) {
        const audio = player['audio'] as HTMLAudioElement;
        audio.currentTime = Math.min(audio.duration, audio.currentTime + 10);
        player.setCurrentPosition(audio.currentTime);
        updateProgressBar();
    }
});

// When user seeks using the progress bar
progressBar.addEventListener('input', () => {
    if (player.isLoaded() && player['audio']) {
        const audio = player['audio'] as HTMLAudioElement;
        audio.currentTime = parseFloat(progressBar.value);
        player.setCurrentPosition(audio.currentTime);
    }
});

fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (file) {
        bookId = file.name;
        const url = URL.createObjectURL(file);

        // Try to extract cover and chapters (for mp3/m4b with metadata)


        // Load saved position
        const savedPosition = storage.load(bookId);
        player.setCurrentPosition(savedPosition);
        player.load(url);
        playBtn.disabled = false;
        pauseBtn.disabled = false;
        stopBtn.disabled = false;
        rewindBtn.disabled = false;
        forwardBtn.disabled = false;

        setTimeout(() => {
            if (player['audio']) {
                const audio = player['audio'] as HTMLAudioElement;
                audio.addEventListener('timeupdate', updateProgressBar);
                audio.addEventListener('loadedmetadata', updateProgressBar);
                updateProgressBar();
            }
        }, 100);
    }
});

// --- Metadata extraction using music-metadata-browser ---


// Save progress on pause
pauseBtn.addEventListener('click', () => {
    player.pause();
    if (bookId) storage.save(bookId, player.currentPosition);
});

// Stop playback and reset position
stopBtn.addEventListener('click', () => {
    player.stop();
    if (bookId) storage.save(bookId, 0);
});

// Save progress when the page is closed or reloaded
window.addEventListener('beforeunload', () => {
    if (bookId) storage.save(bookId, player.currentPosition);
});

playBtn.addEventListener('click', () => {
    if (!player.isLoaded()) {
        alert('Please select an audiobook file first.');
        return;
    }
    player.play();
});