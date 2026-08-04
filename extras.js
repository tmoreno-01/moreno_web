const form = document.getElementById('contactForm');
    const responseMessage = document.getElementById('responseMessage');
    const submitButton = document.getElementById('submitButton');

    form.addEventListener('submit', function(e) {
        e.preventDefault();
        submitButton.innerText = "SENDING...";
        const formData = new FormData(form);
        
        fetch('https://api.web3forms.com/submit', {
            method: 'POST',
            body: formData
        })
        .then(async (response) => {
            if (response.status == 200) {
                responseMessage.innerText = "Enquiry sent successfully!";
                form.reset();
            } else {
                responseMessage.innerText = "Something went wrong, please try again.";
            }
        })
        .catch(error => {
            responseMessage.innerText = "Something went wrong!";
        })
        .finally(() => {
            submitButton.innerText = "SEND ENQUIRY";
        });
    });
// --- BALANCED SITE PRELOADER ---
// Keep the logo visible long enough to register, then wait for the browser's
// initial eager resources to finish. A hard cap prevents hidden or third-party
// assets from trapping visitors behind the loader.
const PRELOADER_MIN_VISIBLE_MS = 900;
const PRELOADER_MAX_VISIBLE_MS = 2500;
const PRELOADER_FADE_MS = 450;
const preloaderStartedAt = performance.now();

let preloaderMinTimer = null;
let preloaderMaxTimer = null;
let initialPageLoadFinished = document.readyState === 'complete';

function hidePreloader() {
    const preloader = document.getElementById('preloader');
    if (!preloader || preloader.classList.contains('loaded')) return;

    clearTimeout(preloaderMinTimer);
    clearTimeout(preloaderMaxTimer);
    preloaderMinTimer = null;
    preloaderMaxTimer = null;

    preloader.classList.add('loaded');
    preloader.setAttribute('aria-hidden', 'true');
    document.body.classList.add('site-loaded');

    window.setTimeout(() => {
        if (preloader.parentNode) preloader.remove();
    }, PRELOADER_FADE_MS + 60);
}

function hidePreloaderAfterMinimum() {
    initialPageLoadFinished = true;

    const elapsed = performance.now() - preloaderStartedAt;
    const remainingMinimum = Math.max(
        0,
        PRELOADER_MIN_VISIBLE_MS - elapsed
    );

    clearTimeout(preloaderMinTimer);
    preloaderMinTimer = window.setTimeout(
        hidePreloader,
        remainingMinimum
    );
}

if (initialPageLoadFinished) {
    hidePreloaderAfterMinimum();
} else {
    window.addEventListener(
        'load',
        hidePreloaderAfterMinimum,
        { once: true }
    );
}

// Failsafe: begin fading no later than 2.5 seconds after navigation, even if
// a slow image, API or third-party request has not completed.
const elapsedAtSetup = performance.now() - preloaderStartedAt;
preloaderMaxTimer = window.setTimeout(
    hidePreloader,
    Math.max(0, PRELOADER_MAX_VISIBLE_MS - elapsedAtSetup)
);

// ---------- TIME ENGINE (hidden /time page) ----------
let timeActive = false;
let timeStart = null;
const timeRatePerSec = (8.1e9 * 6.7) / 86400; // ~627,708 hours of global screen time per second

function timeFrame(now) {
    if (!timeActive) return;
    const elapsedSec = (now - timeStart) / 1000;
    const totalHours = elapsedSec * timeRatePerSec;
    const totalDays = totalHours / 24;

    const YEAR_DAYS = 365.25;
    const MONTH_DAYS = YEAR_DAYS / 12; // ~30.4375
    const WEEK_DAYS = 7;

    // Each unit is its own running total (not a decomposed remainder),
    // so every column keeps climbing independently and never resets.
    const decades = Math.floor(totalDays / (YEAR_DAYS * 10));
    const years = Math.floor(totalDays / YEAR_DAYS);
    const months = Math.floor(totalDays / MONTH_DAYS);
    const weeks = Math.floor(totalDays / WEEK_DAYS);

    document.getElementById('t-decades').textContent = decades.toLocaleString();
    document.getElementById('t-years').textContent = years.toLocaleString();
    document.getElementById('t-months').textContent = months.toLocaleString();
    document.getElementById('t-weeks').textContent = weeks.toLocaleString();

    requestAnimationFrame(timeFrame);
}

