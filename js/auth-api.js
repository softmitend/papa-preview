/**
 * Integrasi API Autentikasi (Sanctum)
 * - Token disimpan di localStorage (auth_token)
 * - Gunakan getAuthHeaders() atau fetchWithAuth() untuk request yang butuh auth
 */
(function () {
    "use strict";

    const TOKEN_KEY = "auth_token";
    const LOGIN_PATH = "/login";

    window.getAuthToken = function () {
        return localStorage.getItem(TOKEN_KEY);
    };

    window.getAuthHeaders = function (extra, isFormData = false) {
		const token = window.getAuthToken();
		const csrfMeta = document.querySelector('meta[name="csrf-token"]');
		const hasSessionCsrf = Boolean(csrfMeta && csrfMeta.getAttribute("content"));

		const headers = {
			Accept: "application/json",
			"X-Requested-With": "XMLHttpRequest",
		};

		// Hanya set Content-Type jika bukan FormData
		if (!isFormData) {
			headers["Content-Type"] = "application/json";
		}

		if (token && !hasSessionCsrf) {
			headers["Authorization"] = "Bearer " + token;
		}

		if (hasSessionCsrf) {
			headers["X-CSRF-TOKEN"] = csrfMeta.getAttribute("content");
		}

		return Object.assign({}, headers, extra || {});
	};

    /**
     * fetch dengan header Authorization. Jika 401, redirect ke halaman login.
     * @param {string} url
     * @param {RequestInit} options
     * @returns {Promise<Response>}
     */
    window.fetchWithAuth = function (url, options) {
		const opts = options || {};

		// Cek apakah body berupa FormData
		const isFormData = opts.body instanceof FormData;

		// Jika FormData, jangan gunakan Content-Type JSON
		if (isFormData) {
			const headers = window.getAuthHeaders(opts.headers);
			delete headers["Content-Type"];
			opts.headers = headers;
		} else {
			opts.headers = window.getAuthHeaders(opts.headers);
		}

		return fetch(url, opts).then(function (response) {
			if (response.status === 401) {
				localStorage.removeItem(TOKEN_KEY);
				window.location.href = LOGIN_PATH;
				return Promise.reject(new Error("Unauthorized"));
			}
			return response;
		});
	};

    /**
     * Logout: panggil API logout lalu hapus token dan redirect ke login.
     */
    window.logoutViaApi = function () {
        const token = window.getAuthToken();
        if (!token) {
            window.location.href = LOGIN_PATH;
            return Promise.resolve();
        }
        return fetch("/api/auth/logout", {
            method: "POST",
            headers: window.getAuthHeaders(),
        })
            .then(function () {
                localStorage.removeItem(TOKEN_KEY);
                window.location.href = LOGIN_PATH;
            })
            .catch(function () {
                localStorage.removeItem(TOKEN_KEY);
                window.location.href = LOGIN_PATH;
            });
    };

    /**
     * Logout dari navbar.
     * Login lewat /api/auth/login (Sanctum): Bearer token tidak butuh CSRF.
     * Form POST /logout butuh session + _token yang cocok — sering 419 jika session/CSRF tidak sinkron.
     */
    window.logoutViaNavbar = function () {
        const logoutForm = document.getElementById("logout-form");
        const bearerToken = window.getAuthToken();

        function clearAuthAndRedirect() {
            localStorage.removeItem(TOKEN_KEY);
            window.location.href = LOGIN_PATH;
        }

        function submitWebLogoutForm() {
            if (!logoutForm) {
                clearAuthAndRedirect();
                return;
            }

            const csrfMeta = document.querySelector('meta[name="csrf-token"]');
            const tokenInput = logoutForm.querySelector('input[name="_token"]');
            if (csrfMeta && tokenInput) {
                tokenInput.value = csrfMeta.getAttribute("content") || "";
            }

            logoutForm.submit();
        }

        if (bearerToken) {
            return fetch("/api/auth/logout", {
                method: "POST",
                headers: window.getAuthHeaders(),
                credentials: "same-origin",
            })
                .then(clearAuthAndRedirect)
                .catch(submitWebLogoutForm);
        }

        submitWebLogoutForm();
    };

    window.clearAuth = function () {
        localStorage.removeItem(TOKEN_KEY);
    };
})();
