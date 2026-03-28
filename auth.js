/**
 * Landing Page Redirect
 * If user visits index.html without ?auth=true or ?guest=true, redirect to landing page.
 */
(function redirectToLandingIfNeeded() {
    const params = new URLSearchParams(window.location.search);
    const isAuthPage  = params.get('auth') === 'true';
    const isGuestPage = params.get('guest') === 'true';
    const hasAuthCode = params.get('code') !== null;
    const hasAuthHash = window.location.hash.includes('access_token') || window.location.hash.includes('provider_token');

    if (!isAuthPage && !isGuestPage && !hasAuthHash && !hasAuthCode) {
        // Not explicitly requesting auth or guest mode — send to landing page
        window.location.replace('index.html');
        return;
    }
})();

function initializeGuestMode() {
    const urlParams = new URLSearchParams(window.location.search);
    const isGuestActive = urlParams.get('guest') === 'true';

    if (isGuestActive) {
        const appContent = document.getElementById('app-content');
        const loginPage  = document.getElementById('login-page');

        if (!appContent || !loginPage) {
            // Retry if DOM elements are not yet accessible
            setTimeout(initializeGuestMode, 50);
            return true;
        }

        // --- Transition UI to Editor View ---
        loginPage.style.display  = 'none';
        appContent.style.display = window.innerWidth <= 1200 ? 'flex' : 'grid';
        if (window.innerWidth <= 1200) {
            appContent.style.flexDirection = 'column';
        }

        // --- Set Session Globals ---
        // We set these to null to signal app.js to skip cloud-persistence layers
        window.currentUser    = null;
        window.supabaseClient = null;

        // --- Update Navigation Header ---
        const userEmailSpan = document.getElementById('auth-user-email');
        const btnLogout     = document.getElementById('btn-logout');
        
        if (userEmailSpan) {
            userEmailSpan.innerText = 'Guest Mode';
            userEmailSpan.style.display = 'inline';
        }
        if (btnLogout) {
            btnLogout.style.display = 'flex';
            btnLogout.innerHTML = '<i class="ri-logout-box-line"></i> Exit Guest Mode';
            btnLogout.onclick = () => window.location.href = 'index.html';
        }
        return true; 
    }
    return false;
}

// Execute guest bypass immediately to minimize flashes of unauthenticated content
const isGuestAuthenticated = initializeGuestMode();
if (!isGuestAuthenticated) {

    // --- Supabase Configuration ---
    const SUPABASE_URL = 'https://tuigsckfsinefximtysx.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR1aWdzY2tmc2luZWZ4aW10eXN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxODQzNzEsImV4cCI6MjA4OTc2MDM3MX0.COxVqWUXuxLVDpJZNsMYg7lzKTcJn6OId77PmNcIbfw';

    // Safety check - make sure the Supabase library loaded
    if (!window.supabase) {
        throw new Error('Supabase library failed to load! Check your internet connection.');
    }

    const _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    window.supabaseClient = _supabase; // Expose for app.js

    // --- Auth State ---
    let isSignupMode = false;
    let currentUser = null;

    // --- DOM Elements ---
    const appContent    = document.getElementById('app-content');
    const loginPage     = document.getElementById('login-page');
    const userEmailSpan = document.getElementById('auth-user-email');
    const btnLogout     = document.getElementById('btn-logout');
    const authForm      = document.getElementById('auth-form');
    const authTitle     = document.getElementById('auth-title');
    const authSubtitle  = document.getElementById('auth-subtitle');
    const authSubmitBtn = document.getElementById('btn-auth-submit');
    const authError     = document.getElementById('auth-error');
    const btnSwitchMode = document.getElementById('btn-switch-auth-mode');
    const authSwitchText= document.getElementById('auth-switch-text');
    const btnGoogleAuth = document.getElementById('btn-google-auth');

    // Sanity check that all elements were found
    const allEls = { appContent, loginPage, userEmailSpan, btnLogout, authForm, authTitle, authSubtitle, authSubmitBtn, authError, btnSwitchMode, authSwitchText, btnGoogleAuth };
    for (const [name, el] of Object.entries(allEls)) {
        if (!el) { console.error(`Auth: could not find element #${name}`); }
    }

    // Auto-switch to signup mode if ?signup=true
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('signup') === 'true') {
        isSignupMode = true;
        updateAuthUI();
    }

    // -----------------------------------------------
    // EVENT LISTENERS
    // -----------------------------------------------

    // Switch between Sign In and Sign Up modes
    btnSwitchMode.addEventListener('click', (e) => {
        e.preventDefault();
        isSignupMode = !isSignupMode;
        clearAuthError();
        updateAuthUI();
    });

    // Email / Password form submit
    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        clearAuthError();

        const email    = document.getElementById('auth-email').value.trim();
        const password = document.getElementById('auth-password').value;

        if (!email || !password) {
            showAuthError('Please enter your email and password.');
            return;
        }

        setLoading(true);

        try {
            if (isSignupMode) {
                // --- Sign Up ---
                const { data, error } = await _supabase.auth.signUp({ email, password });
                if (error) throw error;

                // Supabase returns an empty identities array if email already exists
                if (data.user && data.user.identities && data.user.identities.length === 0) {
                    throw new Error('This email is already registered. Please sign in instead.');
                }

                showAuthError('✅ Check your email for a confirmation link!', 'success');

            } else {
                // --- Sign In ---
                const { error } = await _supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
                // Auth state observer will handle UI transition
            }
        } catch (err) {
            showAuthError(err.message);
        } finally {
            setLoading(false);
        }
    });

    // Google OAuth - must use type="button" so it doesn't submit the form
    btnGoogleAuth.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        clearAuthError();

        try {
            const { error } = await _supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.origin + '/app.html',
                }
            });
            if (error) throw error;
        } catch (err) {
            showAuthError(err.message);
        }
    });

    // Sign Out button inside the main app header
    btnLogout.addEventListener('click', async (e) => {
        e.preventDefault();
        try {
            const { error } = await _supabase.auth.signOut();
            if (error) throw error;
            // Redirect to landing page after sign out
            window.location.href = 'index.html';
        } catch (err) {
            console.error('Logout error:', err);
            alert('Error logging out. Please try again.');
        }
    });

    // -----------------------------------------------
    // SUPABASE AUTH STATE OBSERVER
    // -----------------------------------------------
    _supabase.auth.onAuthStateChange((event, session) => {
        currentUser = session?.user ?? null;
        window.currentUser = currentUser; // Global exposure for app.js sync
        updateHeaderNav();
    });

    // Also check session on initial load (handles page refresh after Google OAuth redirect)
    _supabase.auth.getSession().then(({ data: { session } }) => {
        currentUser = session?.user ?? null;
        window.currentUser = currentUser; // Expose to app.js
        updateHeaderNav();
    });

    // -----------------------------------------------
    // HELPER FUNCTIONS
    // -----------------------------------------------

    function updateAuthUI() {
        if (isSignupMode) {
            authTitle.innerText      = 'Create Account';
            authSubtitle.innerText   = 'Sign up to safely access your invoices.';
            authSubmitBtn.innerHTML  = '<i class="ri-user-add-line"></i> Sign Up';
            authSwitchText.innerText = 'Already have an account?';
            btnSwitchMode.innerText  = 'Sign In';
        } else {
            authTitle.innerText      = 'Welcome Back';
            authSubtitle.innerText   = 'Sign in to sync your generated invoices.';
            authSubmitBtn.innerHTML  = '<i class="ri-login-circle-line"></i> Sign In';
            authSwitchText.innerText = 'New here?';
            btnSwitchMode.innerText  = 'Create an account';
        }
    }

    function updateHeaderNav() {
        if (currentUser) {
            // Hide login page, show the app
            loginPage.style.display  = 'none';
            userEmailSpan.innerText  = currentUser.email;

            // Responsive display
            appContent.style.display = window.innerWidth <= 1200 ? 'flex' : 'grid';
            if (window.innerWidth <= 1200) {
                appContent.style.flexDirection = 'column';
            }
        } else {
            // Show login page, hide the app
            loginPage.style.display  = 'flex';
            appContent.style.display = 'none';
            userEmailSpan.innerText  = '';
        }
    }

    function showAuthError(msg, type = 'error') {
        authError.style.display    = 'block';
        authError.innerText        = msg;
        authError.style.color      = type === 'success' ? '#34d399' : '#ff6b6b';
        authError.style.background = type === 'success' ? 'rgba(52,211,153,0.1)' : 'rgba(255,107,107,0.1)';
    }

    function clearAuthError() {
        authError.style.display = 'none';
        authError.innerText     = '';
    }

    function setLoading(isLoading) {
        // Use requestAnimationFrame to defer DOM mutations and prevent
        // stale element errors during rapid automated test interactions
        requestAnimationFrame(() => {
            authSubmitBtn.disabled    = isLoading;
            authSubmitBtn.innerHTML   = isLoading
                ? '<i class="ri-loader-4-line ri-spin"></i> Processing...'
                : (isSignupMode ? '<i class="ri-user-add-line"></i> Sign Up' : '<i class="ri-login-circle-line"></i> Sign In');
        });
    }

}
