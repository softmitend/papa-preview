function readJsonConfig(elementId) {
    const el = document.getElementById(elementId);
    if (!el) {
        return {};
    }

    try {
        return JSON.parse(el.textContent || "{}");
    } catch (error) {
        console.error("Invalid JSON config:", elementId, error);
        return {};
    }
}

(function initRateKeySuggestion() {
    const config = readJsonConfig("rate-key-catalog-config");
    const inputLabel = document.getElementById("add_label");
    const inputKey = document.getElementById("add_rate_key");
    const suggestionText = document.getElementById("add_rate_key_suggestion");
    const validationWarning = document.getElementById("rate_key_validation_warning");
    const toggleKeyModeButton = document.getElementById("toggle_rate_key_mode");
    const applySuggestionButton = document.getElementById("apply_rate_key_suggestion");
    const form = inputKey?.closest("form");
    const maxLength = Number(config.rateKeyMaxLength || 80);

    if (!inputLabel || !inputKey || !suggestionText || !validationWarning) {
        return;
    }

    const existingRateKeys = new Set(
        (config.existingRateKeys || [])
            .map((key) => normalizeRateKeyInput(key))
            .filter(Boolean)
    );

    let lastSuggestedKey = "";
    let isKeyManual = String(inputKey.value || "").trim() !== "";

    function normalizeRateKeyInput(value) {
        return String(value || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .replace(/[\s-]+/g, "_")
            .replace(/[^a-z0-9_]/g, "")
            .replace(/^_+|_+$/g, "")
            .replace(/_+/g, "_");
    }

    function trimToMaxLength(value) {
        return String(value || "").slice(0, maxLength).replace(/_+$/g, "");
    }

    function makeAllowedBase(label) {
        let base = normalizeRateKeyInput(label);

        if (base === "") {
            base = "custom_rate";
        }

        if (!/^[a-z]/.test(base)) {
            base = `rate_${base}`;
        }

        base = trimToMaxLength(base);
        return base || "custom_rate";
    }

    function makeUniqueRateKey(base) {
        const cleanBase = makeAllowedBase(base);
        if (!existingRateKeys.has(cleanBase)) {
            return {
                value: cleanBase,
                changed: false,
            };
        }

        for (let index = 2; index < 10000; index++) {
            const suffix = `_${index}`;
            const root = trimToMaxLength(cleanBase.slice(0, maxLength - suffix.length));
            const candidate = `${root}${suffix}`;
            if (/^[a-z][a-z0-9_]*$/.test(candidate) && !existingRateKeys.has(candidate)) {
                return {
                    value: candidate,
                    changed: true,
                };
            }
        }

        return {
            value: cleanBase,
            changed: true,
        };
    }

    function generateRateKeySuggestion() {
        return makeUniqueRateKey(inputLabel.value);
    }

    function updateKeyModeButton() {
        if (toggleKeyModeButton) {
            toggleKeyModeButton.textContent = isKeyManual ? "Kunci otomatis" : "Edit manual";
        }
    }

    function showValidationMessage(message, isWarning) {
        validationWarning.textContent = message || "";
        validationWarning.classList.toggle("show", Boolean(message));
        suggestionText.classList.toggle("is-warning", Boolean(isWarning));
    }

    function validateRateKeyInput() {
        const value = normalizeRateKeyInput(inputKey.value);
        let message = "";

        if (value === "") {
            message = "Kode kunci tarif wajib diisi.";
        } else if (!/^[a-z][a-z0-9_]*$/.test(value)) {
            message = "Kode hanya boleh huruf kecil, angka, underscore, dan harus diawali huruf.";
        } else if (value.length > maxLength) {
            message = `Kode maksimal ${maxLength} karakter.`;
        } else if (existingRateKeys.has(value)) {
            message = "Kunci tarif sudah terdaftar. Gunakan kode lain.";
        }

        inputKey.setCustomValidity(message);
        showValidationMessage(message, Boolean(message));
    }

    function applySuggestedKey(suggestedKey) {
        inputKey.value = suggestedKey;
        isKeyManual = false;
        updateKeyModeButton();
        validateRateKeyInput();
    }

    function updateRateKeySuggestion() {
        const previousSuggestedKey = lastSuggestedKey;
        const suggestion = generateRateKeySuggestion();
        lastSuggestedKey = suggestion.value;

        suggestionText.textContent = suggestion.changed
            ? `Saran kode: ${suggestion.value} (kode awal sudah ada, saran dibuat unik).`
            : `Saran kode: ${suggestion.value} (tetap bisa diubah manual).`;

        const currentValue = normalizeRateKeyInput(inputKey.value);
        const shouldAutofill =
            !isKeyManual || currentValue === "" || currentValue === previousSuggestedKey;

        if (shouldAutofill) {
            applySuggestedKey(suggestion.value);
            return;
        }

        updateKeyModeButton();
        validateRateKeyInput();
    }

    inputLabel.addEventListener("input", updateRateKeySuggestion);

    inputKey.addEventListener("input", function() {
        const normalized = normalizeRateKeyInput(inputKey.value);
        inputKey.value = trimToMaxLength(normalized);
        isKeyManual = inputKey.value !== lastSuggestedKey;
        updateKeyModeButton();
        validateRateKeyInput();
    });

    if (toggleKeyModeButton) {
        toggleKeyModeButton.addEventListener("click", function() {
            isKeyManual = !isKeyManual;
            if (!isKeyManual) {
                applySuggestedKey(lastSuggestedKey || generateRateKeySuggestion().value);
                return;
            }

            updateKeyModeButton();
            validateRateKeyInput();
        });
    }

    if (applySuggestionButton) {
        applySuggestionButton.addEventListener("click", function() {
            applySuggestedKey(lastSuggestedKey || generateRateKeySuggestion().value);
        });
    }

    if (form) {
        form.addEventListener("reset", function() {
            window.setTimeout(function() {
                isKeyManual = false;
                updateRateKeySuggestion();
            }, 0);
        });
    }

    if (String(inputKey.value || "").trim() !== "") {
        inputKey.value = trimToMaxLength(normalizeRateKeyInput(inputKey.value));
    }

    updateRateKeySuggestion();
})();

(function() {
    const statusFilter = document.getElementById('statusFilter');
    const filterForm = document.getElementById('rateKeyCatalogFilterForm');
    const typeFilter = document.getElementById('typeFilter');
    const searchInput = document.getElementById('searchInput');
    const rows = Array.from(document.querySelectorAll('.tax-row'));
    const filteredEmptyRow = document.getElementById('filtered-empty-row');

    if (!statusFilter || !typeFilter || !filterForm) {
        return;
    }

    filterForm.addEventListener('submit', function(event) {
        event.preventDefault();
    });

    function applyFilters() {
        const selectedStatus = (statusFilter.value || 'all').toLowerCase();
        const selectedType = (typeFilter.value || 'all').toLowerCase();
        const keyword = (searchInput?.value || '').trim().toLowerCase();
        let visibleCount = 0;

        rows.forEach((row) => {
            const rowStatus = (row.dataset.status || '').toLowerCase();
            const rowType = (row.dataset.type || '').toLowerCase();
            const statusMatch = selectedStatus === 'all' || rowStatus === selectedStatus;
            const typeMatch = selectedType === 'all' || rowType === selectedType;
            const textMatch = keyword === '' || row.textContent.toLowerCase().includes(keyword);
            const isMatch = statusMatch && typeMatch && textMatch;

            row.style.display = isMatch ? '' : 'none';
            if (isMatch) {
                visibleCount++;
            }
        });

        if (filteredEmptyRow) {
            if (rows.length === 0) {
                filteredEmptyRow.style.display = 'none';
                return;
            }
            filteredEmptyRow.style.display = visibleCount === 0 ? '' : 'none';
        }
    }

    if (window.jQuery && typeof window.jQuery.fn.select2 === 'function') {
        window.jQuery(statusFilter).select2({
            width: '100%',
            minimumResultsForSearch: Infinity,
        });
        window.jQuery(typeFilter).select2({
            width: '100%',
            minimumResultsForSearch: Infinity,
        });
        window.jQuery(statusFilter).on('change', applyFilters);
        window.jQuery(typeFilter).on('change', applyFilters);
    } else {
        statusFilter.addEventListener('change', applyFilters);
        typeFilter.addEventListener('change', applyFilters);
    }

    if (searchInput) {
        searchInput.addEventListener('input', applyFilters);
    }

    applyFilters();
})();
