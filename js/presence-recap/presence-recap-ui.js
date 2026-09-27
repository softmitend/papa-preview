/**
 * UI helpers untuk halaman Laporan Rekap Absensi (select2 + tombol).
 */
(function () {
    "use strict";

    var SELECT2_OPTS = {
        width: "100%",
        allowClear: true,
    };

    function resolveDropdownParent(el, options) {
        if (options.dropdownParent) {
            return window.jQuery(options.dropdownParent);
        }

        var modal = el.closest(".modal");
        if (modal) {
            return window.jQuery(modal);
        }

        return window.jQuery(document.body);
    }

    function allowSelect2FocusInModal() {
        if (window._presenceSelect2ModalFocusFix || typeof window.jQuery === "undefined") {
            return;
        }

        window._presenceSelect2ModalFocusFix = true;
        window.jQuery(document).on("focusin.bs.modal.presenceSelect2", function (e) {
            if (window.jQuery(e.target).closest(".select2-container, .select2-dropdown").length) {
                e.stopImmediatePropagation();
            }
        });
    }

    function focusEmployeeSearch() {
        setTimeout(function () {
            var search = document.querySelector(
                ".select2-container--open .select2-search__field"
            );
            if (!search) return;

            search.removeAttribute("readonly");
            search.disabled = false;
            search.setAttribute("placeholder", "Ketik nama karyawan...");
            search.focus();
        }, 50);
    }

    window.destroyPresenceRecapSelect2 = function (el) {
        if (!el || typeof window.jQuery === "undefined" || !window.jQuery.fn.select2) return;

        var $el = window.jQuery(el);
        if ($el.hasClass("select2-hidden-accessible")) {
            $el.off("select2:open.presenceRecap");
            $el.select2("destroy");
        }

        var sibling = el.nextElementSibling;
        if (sibling && sibling.classList.contains("select2-container")) {
            sibling.remove();
        }
        el.classList.remove("select2-hidden-accessible");
        el.removeAttribute("data-select2-id");
        el.removeAttribute("aria-hidden");
        el.removeAttribute("tabindex");
    };

    window.initPresenceEmployeeSelect = function (el, options) {
        if (!el || typeof window.jQuery === "undefined" || !window.jQuery.fn.select2) return;

        options = options || {};
        window.destroyPresenceRecapSelect2(el);

        if (el.closest(".modal")) {
            allowSelect2FocusInModal();
        }

        var $el = window.jQuery(el);
        $el.select2(
            Object.assign({}, SELECT2_OPTS, {
                allowClear: false,
                minimumResultsForSearch: 0,
                dropdownParent: resolveDropdownParent(el, options),
                language: {
                    noResults: function () {
                        return "Karyawan tidak ditemukan";
                    },
                    searching: function () {
                        return "Mencari...";
                    },
                },
            })
        );
        $el.on("select2:open.presenceRecap", focusEmployeeSearch);
    };

    window.initPresenceRecapEmployeeSelect = function (el) {
        window.initPresenceEmployeeSelect(el);
    };

    window.shouldDeferEmployeeSelectInit = function (el) {
        if (!el) return false;
        var modal = el.closest(".modal");
        return modal && !modal.classList.contains("show") && modal.style.display !== "block";
    };

    window.initAllPresenceEmployeeSelects = function (root, options) {
        root = root || document;
        root.querySelectorAll("select.presence-employee-select").forEach(function (el) {
            if (el.classList.contains("select2-hidden-accessible")) return;
            if (window.shouldDeferEmployeeSelectInit(el)) return;
            window.initPresenceEmployeeSelect(el, options);
        });
    };

    window.repopulatePresenceEmployeeSelect = function (el, employees, options) {
        if (!el) return;

        options = options || {};
        var selected = el.value;
        var emptyLabel = options.emptyLabel || "Semua Karyawan";

        if (typeof window.destroyPresenceRecapSelect2 === "function") {
            window.destroyPresenceRecapSelect2(el);
        }

        el.innerHTML = '<option value="">' + emptyLabel + "</option>";

        if (!employees || !employees.length) {
            if (options.showEmptyState) {
                var emptyOpt = document.createElement("option");
                emptyOpt.value = "";
                emptyOpt.textContent = "Data karyawan tidak tersedia";
                emptyOpt.disabled = true;
                el.appendChild(emptyOpt);
            }
        } else {
            employees.forEach(function (emp) {
                var opt = document.createElement("option");
                opt.value = emp.id || emp.id_employee || emp.id_user || "";
                opt.textContent = emp.name || emp.employee_name || "-";
                if (emp.name || emp.employee_name) {
                    opt.dataset.name = emp.name || emp.employee_name;
                }
                el.appendChild(opt);
            });
        }

        if (selected) {
            el.value = selected;
        }

        if (!window.shouldDeferEmployeeSelectInit(el)) {
            window.initPresenceEmployeeSelect(el, options);
        }
    };

    window.setPresenceRecapBtnLoading = function (btn, loading, defaultLabel) {
        if (!btn) return;
        btn.disabled = !!loading;
        btn.classList.toggle("is-loading", !!loading);

        var label = btn.querySelector(".btn-label");
        var icon = btn.querySelector("i");

        if (label) {
            label.textContent = loading ? "Memuat..." : defaultLabel;
        }
        if (icon) {
            icon.className = loading ? "fas fa-spinner fa-spin" : btn.getAttribute("data-icon") || "fas fa-search";
        }
    };

    window.setPresenceRecapPrintEnabled = function (btn, enabled) {
        if (!btn) return;
        btn.disabled = !enabled;
        btn.title = enabled ? "Unduh laporan PDF" : "Tampilkan data terlebih dahulu";
        btn.classList.toggle("is-ready", !!enabled);
    };

    document.addEventListener("DOMContentLoaded", function () {
        if (document.getElementById("presenceRecapForm")) {
            window.setPresenceRecapPrintEnabled(
                document.getElementById("btnCetakRecap"),
                false
            );
        }

        window.initAllPresenceEmployeeSelects();
        window.loadPresenceEmployeeSelectOptions();
    });

    window.loadPresenceEmployeeSelectOptions = function (root) {
        root = root || document;
        if (!window.fetchWithAuth) return;

        root.querySelectorAll("select.presence-employee-select[data-employees-url]").forEach(function (el) {
            if (el.dataset.employeesLoaded === "1") return;

            var url = el.dataset.employeesUrl;
            if (!url) return;

            window.fetchWithAuth(url, { method: "GET" })
                .then(function (res) { return res.json(); })
                .then(function (result) {
                    if (result.status === "success") {
                        el.dataset.employeesLoaded = "1";
                        window.repopulatePresenceEmployeeSelect(el, result.data || []);
                    }
                })
                .catch(function () {});
        });
    };

    if (typeof window.jQuery !== "undefined") {
        window.jQuery(document).on("shown.bs.modal", function (e) {
            window.initAllPresenceEmployeeSelects(e.target);
            window.loadPresenceEmployeeSelectOptions(e.target);
        });
    }
})();
