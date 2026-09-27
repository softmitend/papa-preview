(function () {
    "use strict";

    const demoMessage = "Mode demo frontend: perubahan tidak dikirim ke server.";

    const defaultPendingPayroll = [
        {
            id_master_salary: "MS-001",
            employee_name: "Rina Wijaya",
            basic_salary: 5750000,
            tax_deduction: 172500,
            rule_deduction: 100000,
            rule_earning: 450000,
            net_salary: 5927500,
            salary_date: "2026-09-26",
            deduction_components: [
                { code: "PPH21", name: "PPh 21", amount: 172500 },
                { code: "LATE", name: "Penyesuaian Kehadiran", amount: 100000 }
            ],
            earning_components: [
                { code: "OVERTIME", name: "Insentif Lembur", amount: 450000 }
            ]
        },
        {
            id_master_salary: "MS-002",
            employee_name: "Dodi Pratama",
            basic_salary: 5250000,
            tax_deduction: 157500,
            rule_deduction: 0,
            rule_earning: 275000,
            net_salary: 5367500,
            salary_date: "2026-09-26",
            deduction_components: [{ code: "PPH21", name: "PPh 21", amount: 157500 }],
            earning_components: [{ code: "OVERTIME", name: "Insentif Lembur", amount: 275000 }]
        },
        {
            id_master_salary: "MS-003",
            employee_name: "Anita Lestari",
            basic_salary: 6100000,
            tax_deduction: 183000,
            rule_deduction: 75000,
            rule_earning: 300000,
            net_salary: 6142000,
            salary_date: "2026-09-26",
            deduction_components: [
                { code: "PPH21", name: "PPh 21", amount: 183000 },
                { code: "LEAVE", name: "Penyesuaian Cuti", amount: 75000 }
            ],
            earning_components: [{ code: "BONUS", name: "Insentif Proyek", amount: 300000 }]
        }
    ];

    const defaultSalaryHistory = [
        {
            id: "SLIP-2408-001",
            employee_name: "Bagas Saputra",
            salary_date: "2026-08-26",
            salary_amount: 5480000,
            transfer_proof: null,
            status: "paid"
        },
        {
            id: "SLIP-2408-002",
            employee_name: "Nadia Putri",
            salary_date: "2026-08-26",
            salary_amount: 5875000,
            transfer_proof: null,
            status: "paid"
        }
    ];

    const demoStorageKey = "papa-portfolio-demo-state-v2";

    function clone(value) {
        return JSON.parse(JSON.stringify(value));
    }

    function loadDemoState() {
        const fallback = {
            pendingPayroll: clone(defaultPendingPayroll),
            salaryHistory: clone(defaultSalaryHistory),
            schedules: {}
        };

        try {
            const saved = JSON.parse(localStorage.getItem(demoStorageKey) || "null");
            if (!saved || !Array.isArray(saved.pendingPayroll) || !Array.isArray(saved.salaryHistory)) {
                return fallback;
            }

            return Object.assign(fallback, saved);
        } catch (error) {
            return fallback;
        }
    }

    let demoState = loadDemoState();

    function saveDemoState() {
        try {
            localStorage.setItem(demoStorageKey, JSON.stringify(demoState));
        } catch (error) {
            // The demo remains usable when local storage is unavailable.
        }
    }

    function jsonResponse(payload, status) {
        return new Response(JSON.stringify(payload), {
            status: status || 200,
            headers: { "Content-Type": "application/json" }
        });
    }

    const nativeFetch = window.fetch ? window.fetch.bind(window) : null;

    window.fetch = function (input, init) {
        const rawUrl = typeof input === "string" ? input : (input && input.url) || "";
        const url = new URL(rawUrl, window.location.href);

        if (url.pathname.endsWith("/api/salary/pending")) {
            return Promise.resolve(jsonResponse({ data: demoState.pendingPayroll }));
        }

        if (url.pathname.endsWith("/api/salary/history")) {
            return Promise.resolve(jsonResponse({ data: demoState.salaryHistory }));
        }

        if (/\/api\/salary\/detail\/[^/]+$/.test(url.pathname)) {
            const id = decodeURIComponent(url.pathname.split("/").pop());
            const salary = demoState.salaryHistory.find(function (item) {
                return String(item.id) === id;
            });
            return Promise.resolve(jsonResponse({ data: salary || null }, salary ? 200 : 404));
        }

        if (url.pathname.endsWith("/api/salary") && String((init && init.method) || "GET").toUpperCase() === "POST") {
            const formData = init && init.body;
            const masterSalaryId = formData && typeof formData.get === "function"
                ? String(formData.get("id_master_salary") || "")
                : "";
            const pendingIndex = demoState.pendingPayroll.findIndex(function (item) {
                return String(item.id_master_salary) === masterSalaryId;
            });

            if (pendingIndex < 0) {
                return Promise.resolve(jsonResponse({ success: false, message: "Data pembayaran demo tidak ditemukan." }, 404));
            }

            const paidEmployee = demoState.pendingPayroll.splice(pendingIndex, 1)[0];
            const createdSlip = {
                id: "SLIP-" + String(Date.now()).slice(-8),
                employee_name: paidEmployee.employee_name,
                salary_date: String((formData && formData.get("salary_date")) || paidEmployee.salary_date || "2026-09-26"),
                salary_amount: paidEmployee.net_salary,
                transfer_proof: "images/bukti-transfer.png",
                status: "paid"
            };
            demoState.salaryHistory.unshift(createdSlip);
            saveDemoState();

            return Promise.resolve(jsonResponse({
                success: true,
                message: "Bukti transfer diterima. Slip gaji demo berhasil dibuat.",
                data: createdSlip
            }));
        }

        if (url.pathname.endsWith("/api/auth/me")) {
            return Promise.resolve(jsonResponse({ user: { name: "HRD", role: "hrd" } }));
        }

        if (url.pathname.includes("/api/")) {
            const method = String((init && init.method) || "GET").toUpperCase();
            const payload = method === "GET"
                ? { data: [] }
                : { success: true, message: demoMessage, data: {} };
            return Promise.resolve(jsonResponse(payload));
        }

        if (nativeFetch) {
            return nativeFetch(input, init);
        }

        return Promise.reject(new Error("Fetch is not supported by this browser."));
    };

    function showDemoNotice(message) {
        let notice = document.getElementById("portfolio-demo-notice");
        if (!notice) {
            notice = document.createElement("div");
            notice.id = "portfolio-demo-notice";
            notice.setAttribute("role", "status");
            notice.style.cssText = [
                "position:fixed",
                "right:24px",
                "bottom:24px",
                "z-index:99999",
                "max-width:360px",
                "padding:14px 18px",
                "border-radius:10px",
                "background:#253b80",
                "color:#fff",
                "font:600 14px/1.45 Arial,sans-serif",
                "box-shadow:0 12px 30px rgba(20,36,79,.24)",
                "opacity:0",
                "transform:translateY(8px)",
                "transition:opacity .18s ease,transform .18s ease"
            ].join(";");
            document.body.appendChild(notice);
        }

        notice.textContent = message || demoMessage;
        window.clearTimeout(showDemoNotice.timer);
        requestAnimationFrame(function () {
            notice.style.opacity = "1";
            notice.style.transform = "translateY(0)";
        });
        showDemoNotice.timer = window.setTimeout(function () {
            notice.style.opacity = "0";
            notice.style.transform = "translateY(8px)";
        }, 3200);
    }

    function formatRupiah(value) {
        return "Rp " + new Intl.NumberFormat("id-ID").format(Number(value || 0));
    }

    function setSummaryValues(selector, values) {
        document.querySelectorAll(selector).forEach(function (element, index) {
            if (values[index] !== undefined) {
                element.textContent = values[index];
            }
        });
    }

    function isPage(name) {
        const normalizedPath = window.location.pathname.replace(/\/$/, "");
        const currentFile = normalizedPath.split("/").pop() || "";
        const normalizedName = String(name || "").replace(/\.html$/, "");
        return currentFile === normalizedName || currentFile === normalizedName + ".html";
    }

    function replaceTableRows(tableSelector, rowsHtml) {
        const tbody = document.querySelector(tableSelector + " tbody");
        if (!tbody) {
            return;
        }

        const filteredEmptyRow = tbody.querySelector("#filtered-empty-row");
        tbody.innerHTML = rowsHtml;
        if (filteredEmptyRow) {
            tbody.appendChild(filteredEmptyRow);
        }
    }

    function hydrateDashboard() {
        if (!(isPage("index") || document.title.indexOf("Dashboard HRD") === 0)) {
            return;
        }

        const pendingCount = demoState.pendingPayroll.length;
        const grossSalary = demoState.pendingPayroll.reduce(function (total, item) {
            return total + Number(item.basic_salary || 0);
        }, 0);
        const netSalary = demoState.pendingPayroll.reduce(function (total, item) {
            return total + Number(item.net_salary || 0);
        }, 0);
        const alertSub = document.querySelector(".dashboard-alert .alert-sub");
        if (alertSub) {
            alertSub.textContent = "Terdapat " + pendingCount + " pembayaran yang menunggu validasi.";
        }

        document.querySelectorAll(".dashboard-stat-card").forEach(function (card) {
            const label = (card.querySelector(".stat-label") || {}).textContent || "";
            const value = card.querySelector(".stat-value");
            if (!value) return;

            if (label.includes("Item Menunggu")) {
                value.textContent = "1";
                const detail = card.querySelector(".stat-sub");
                if (detail) detail.textContent = "Rule: 0 · Pajak: 1";
            }
            if (label.includes("Gross Salary")) value.textContent = formatRupiah(grossSalary);
            if (label.includes("Net Salary")) value.textContent = formatRupiah(netSalary);
        });
    }

    function hydrateRateSettings() {
        if (!isPage("rate-settings")) return;

        setSummaryValues(".tax-stat-value", ["4", "1", "2", "1"]);
        replaceTableRows(".tax-table", [
            '<tr class="tax-row" data-status="approved" data-key="overtime_per_hour"><td><div class="tax-name">Tarif Lembur per Jam</div><div class="tax-code">overtime_per_hour</div></td><td>v2</td><td><strong>Rp 35.000</strong><div class="tax-code">IDR/jam</div></td><td><span class="status-badge status-approved">Published</span></td><td>Sep 2026 - seterusnya</td><td><span class="status-badge status-approved">Approved</span></td><td><span class="status-badge status-active">Aktif</span></td><td><button type="button" class="btn btn-primary btn-sm" data-demo-action="detail" data-demo-title="Tarif Lembur per Jam">Detail</button></td></tr>',
            '<tr class="tax-row" data-status="approved" data-key="late_deduction_per_minute"><td><div class="tax-name">Potongan Telat per Menit</div><div class="tax-code">late_deduction_per_minute</div></td><td>v1</td><td><strong>Rp 2.500</strong><div class="tax-code">IDR/menit</div></td><td><span class="status-badge status-approved">Published</span></td><td>Sep 2026 - seterusnya</td><td><span class="status-badge status-approved">Approved</span></td><td><span class="status-badge status-active">Aktif</span></td><td><button type="button" class="btn btn-primary btn-sm" data-demo-action="detail" data-demo-title="Potongan Telat per Menit">Detail</button></td></tr>',
            '<tr class="tax-row" data-status="pending" data-key="performance_bonus_amount"><td><div class="tax-name">Nominal Bonus Kinerja</div><div class="tax-code">performance_bonus_amount</div></td><td>v2</td><td><strong>Rp 500.000</strong><div class="tax-code">IDR</div></td><td><span class="status-badge status-pending">Draft</span></td><td>Okt 2026 - seterusnya</td><td><span class="status-badge status-pending">Pending</span></td><td><span class="status-badge status-inactive">Belum Aktif</span></td><td><button type="button" class="btn btn-primary btn-sm" data-demo-action="detail" data-demo-title="Nominal Bonus Kinerja">Detail</button></td></tr>',
            '<tr class="tax-row" data-status="rejected" data-key="weekend_overtime"><td><div class="tax-name">Tarif Lembur Akhir Pekan</div><div class="tax-code">weekend_overtime</div></td><td>v1</td><td><strong>Rp 50.000</strong><div class="tax-code">IDR/jam</div></td><td><span class="status-badge status-rejected">Revision</span></td><td>Okt 2026 - seterusnya</td><td><span class="status-badge status-rejected">Rejected</span></td><td><span class="status-badge status-inactive">Nonaktif</span></td><td><button type="button" class="btn btn-primary btn-sm" data-demo-action="detail" data-demo-title="Tarif Lembur Akhir Pekan">Detail</button></td></tr>'
        ].join(""));
        const footer = document.querySelector(".table-footer small");
        if (footer) footer.textContent = "Menampilkan 1 sampai 4 dari 4 data tarif";
    }

    function hydrateTaxSettings() {
        if (!isPage("tax")) return;

        setSummaryValues(".tax-stat-value", ["3", "1", "1", "1"]);
        replaceTableRows(".tax-table", [
            '<tr class="tax-row" data-status="approved" data-type="pph21"><td><div class="tax-name">PPh 21 Karyawan Tetap</div><div class="tax-code">PPH21-REG</div></td><td>PPH21</td><td>Persentase</td><td><strong>3%</strong></td><td><span class="status-badge status-approved">Approved</span></td><td><span class="status-badge status-active">Aktif</span></td><td><button type="button" class="btn btn-primary btn-sm" data-demo-action="detail" data-demo-title="PPh 21 Karyawan Tetap">Detail</button></td></tr>',
            '<tr class="tax-row" data-status="pending" data-type="other"><td><div class="tax-name">Iuran BPJS Kesehatan</div><div class="tax-code">BPJS-KES</div></td><td>OTHER</td><td>Persentase</td><td><strong>1%</strong></td><td><span class="status-badge status-pending">Pending</span></td><td><span class="status-badge status-inactive">Belum Aktif</span></td><td><button type="button" class="btn btn-primary btn-sm" data-demo-action="detail" data-demo-title="Iuran BPJS Kesehatan">Detail</button></td></tr>',
            '<tr class="tax-row" data-status="rejected" data-type="other"><td><div class="tax-name">Iuran Pensiun Tambahan</div><div class="tax-code">PENSION-ADD</div></td><td>OTHER</td><td>Nominal</td><td><strong>Rp 100.000</strong></td><td><span class="status-badge status-rejected">Rejected</span></td><td><span class="status-badge status-inactive">Nonaktif</span></td><td><button type="button" class="btn btn-primary btn-sm" data-demo-action="detail" data-demo-title="Iuran Pensiun Tambahan">Detail</button></td></tr>'
        ].join(""));
        const footer = document.querySelector(".table-footer small");
        if (footer) footer.textContent = "Menampilkan 1 sampai 3 dari 3 data pajak";
    }

    function hydrateComponents() {
        if (!isPage("components")) return;

        setSummaryValues(".component-stat-value", ["4", "3", "1"]);
        replaceTableRows(".component-table", [
            ['Gaji Pokok', 'Nilai dasar penggajian karyawan.', 'Earning', '6x dipakai', 'active'],
            ['Insentif Lembur', 'Tambahan penghasilan dari hasil perhitungan lembur.', 'Earning', '2x dipakai', 'active'],
            ['Potongan Pajak', 'Potongan pajak yang diterapkan melalui rule engine.', 'Deduction', '1x dipakai', 'active'],
            ['Potongan Keterlambatan', 'Potongan berdasarkan total menit keterlambatan.', 'Deduction', 'Belum dipakai', 'inactive']
        ].map(function (item) {
            const active = item[4] === "active";
            const categoryClass = item[2] === "Earning" ? "badge-earning" : "badge-deduction";
            return '<tr class="component-row" data-status="' + item[4] + '"><td><div class="component-item"><div class="component-icon"><i class="fas fa-cube"></i></div><div class="component-copy"><strong class="component-name">' + item[0] + '</strong><small class="text-muted component-description">' + item[1] + '</small></div></div></td><td><span class="' + categoryClass + '">' + (item[2] === "Earning" ? "+ " : "- ") + item[2] + '</span></td><td><span class="badge-usage">' + item[3] + '</span></td><td><span class="' + (active ? "badge-active" : "badge-inactive") + '">' + (active ? "Aktif" : "Nonaktif") + '</span></td><td class="text-right"><button type="button" class="btn btn-primary btn-sm" data-demo-action="detail" data-demo-title="' + item[0] + '">Detail</button></td></tr>';
        }).join(""));
        const footer = document.querySelector(".table-footer small");
        if (footer) footer.textContent = "Showing 1 to 4 of 4 components";
    }

    function hydrateRules() {
        if (!isPage("rules")) return;

        setSummaryValues(".rule-stat-value", ["3", "2", "1", "0"]);
        replaceTableRows(".rule-table", [
            ['System Tax Deduction Rule', 'Jika status karyawan aktif, tambahkan potongan PPh 21 sesuai tarif pajak aktif.', 'ACTIVE', 'APPROVED', 'v1'],
            ['Overtime Earning Rule', 'Hitung tambahan lembur dari total jam lembur dikalikan tarif lembur aktif.', 'ACTIVE', 'APPROVED', 'v3'],
            ['Unpaid Leave Deduction', 'Kurangi gaji berdasarkan jumlah hari cuti tanpa bayar pada periode berjalan.', 'NON_ACTIVE', 'DRAFT', 'v1']
        ].map(function (item) {
            const active = item[2] === "ACTIVE";
            const approved = item[3] === "APPROVED";
            return '<tr class="rule-row" data-activation-status="' + item[2] + '" data-approval-status="' + item[3] + '"><td><div class="d-flex align-items-center"><div class="rule-icon mr-3"><i class="fas fa-bolt"></i></div><div><div class="rule-name">' + item[0] + '</div><div class="rule-sub">Diperbarui baru saja &bull; ' + item[4] + '</div></div></div></td><td class="rule-summary">' + item[1] + '</td><td class="status-cell"><div class="status-inline"><span class="badge-status ' + (active ? "badge-aktif" : "badge-nonaktif") + '">Aktivasi: ' + (active ? "Active" : "Non Active") + '</span><span class="badge-status ' + (approved ? "badge-approved" : "badge-draft") + '">Approval: ' + (approved ? "Approved" : "Draft") + '</span></div></td><td><button type="button" class="btn btn-primary btn-sm btn-detail" data-demo-action="detail" data-demo-title="' + item[0] + '">Detail</button></td></tr>';
        }).join(""));
        const footer = document.querySelector(".footer-meta");
        if (footer) footer.textContent = "Menampilkan 1 sampai 3 dari 3 aturan";
    }

    function hydrateAuditTrail() {
        if (!isPage("audit-trail")) return;

        const tbody = document.querySelector(".audit-table tbody");
        if (!tbody) return;
        const logs = [
            ["26 Sep 2026 22:15", "HRD Demo", "UPDATED", "Rule", "RULE-001", "Memperbarui System Tax Deduction Rule", "127.0.0.1"],
            ["26 Sep 2026 21:42", "HRD Demo", "APPROVED", "Rate Setting", "RATE-002", "Mengaktifkan Tarif Lembur per Jam versi 2", "127.0.0.1"],
            ["26 Sep 2026 20:18", "Direktur Demo", "APPROVED", "Tax", "TAX-001", "Menyetujui PPh 21 Karyawan Tetap", "127.0.0.1"],
            ["25 Sep 2026 16:05", "HRD Demo", "CREATED", "Payslip", "SLIP-2408-002", "Membuat slip gaji Nadia Putri", "127.0.0.1"],
            ["25 Sep 2026 15:52", "HRD Demo", "CREATED", "Payroll", "PAY-0926", "Menjalankan evaluasi payroll September 2026", "127.0.0.1"]
        ];
        tbody.innerHTML = logs.map(function (item) {
            return '<tr data-audit-row data-search="' + item.join(" ").toLowerCase() + '"><td>' + item[0] + '</td><td><strong>' + item[1] + '</strong></td><td><span class="audit-event-badge">' + item[2] + '</span></td><td>' + item[3] + '</td><td>' + item[4] + '</td><td>' + item[5] + '</td><td>' + item[6] + '</td><td><button type="button" class="audit-icon-button" data-demo-action="detail" data-demo-title="' + item[2] + ' ' + item[3] + '" aria-label="Lihat detail"><i class="fas fa-eye"></i></button></td></tr>';
        }).join("");

        const resultLabel = document.querySelector(".audit-filter-footer span");
        if (resultLabel) resultLabel.textContent = "Showing " + logs.length + " results";
        const keyword = document.getElementById("auditKeyword");
        if (keyword) {
            keyword.addEventListener("input", function () {
                const term = keyword.value.trim().toLowerCase();
                let visible = 0;
                tbody.querySelectorAll("[data-audit-row]").forEach(function (row) {
                    const matches = !term || row.getAttribute("data-search").includes(term);
                    row.style.display = matches ? "" : "none";
                    if (matches) visible += 1;
                });
                if (resultLabel) resultLabel.textContent = "Showing " + visible + " results";
            });
        }
    }

    function preparePrimaryActions() {
        const selectors = [
            [".tax-action a[data-demo-disabled]", "create"],
            [".component-action a[data-demo-disabled]", "create"],
            [".rule-action a[data-demo-disabled]", "create"],
            [".component-row a[data-demo-disabled]", "detail"],
            [".rule-row a[data-demo-disabled]", "detail"]
        ];

        selectors.forEach(function (entry) {
            document.querySelectorAll(entry[0]).forEach(function (link) {
                link.removeAttribute("data-demo-disabled");
                link.setAttribute("data-demo-action", entry[1]);
                link.setAttribute("data-demo-title", (link.textContent || "Data Payroll").trim());
            });
        });
    }

    function ensureDemoModal() {
        let modal = document.getElementById("portfolioDemoModal");
        if (modal) return modal;

        modal = document.createElement("div");
        modal.className = "modal fade";
        modal.id = "portfolioDemoModal";
        modal.tabIndex = -1;
        modal.setAttribute("role", "dialog");
        modal.innerHTML = '<div class="modal-dialog modal-dialog-centered" role="document"><div class="modal-content"><form id="portfolioDemoActionForm"><div class="modal-header"><div><div class="text-uppercase text-primary font-weight-bold small mb-1">PAPA Portfolio Demo</div><h5 class="modal-title">Detail Data</h5></div><button type="button" class="close" data-dismiss="modal" aria-label="Tutup"><span aria-hidden="true">&times;</span></button></div><div class="modal-body"><p class="text-muted mb-4" data-demo-modal-copy></p><div data-demo-modal-fields></div></div><div class="modal-footer"><button type="button" class="btn btn-light" data-dismiss="modal">Tutup</button><button type="submit" class="btn btn-primary" data-demo-modal-save><i class="fas fa-save"></i> Simpan Demo</button></div></form></div></div>';
        document.body.appendChild(modal);
        return modal;
    }

    function openDemoModal(trigger) {
        const modal = ensureDemoModal();
        const action = trigger.getAttribute("data-demo-action") || "detail";
        const title = trigger.getAttribute("data-demo-title") || "Data Payroll";
        modal.querySelector(".modal-title").textContent = action === "create" ? "Tambah Data Demo" : title;
        modal.querySelector("[data-demo-modal-copy]").textContent = action === "create"
            ? "Isi data contoh untuk mendemonstrasikan alur input seperti pada aplikasi PAPA."
            : "Detail ini menggunakan data simulasi dan tidak terhubung ke server produksi.";
        modal.querySelector("[data-demo-modal-fields]").innerHTML = action === "create"
            ? '<div class="form-group"><label>Nama</label><input class="form-control" name="name" placeholder="Masukkan nama data" required></div><div class="form-group"><label>Keterangan</label><textarea class="form-control" name="description" rows="3" placeholder="Keterangan singkat"></textarea></div>'
            : '<div class="p-3 rounded" style="background:#f7f8fc"><div class="font-weight-bold mb-2">' + title + '</div><div class="text-muted">Status aktif &bull; data demo September 2026</div></div>';
        modal.querySelector("[data-demo-modal-save]").style.display = action === "create" ? "inline-block" : "none";
        modal.setAttribute("data-current-action", action);

        if (window.jQuery && typeof window.jQuery.fn.modal === "function") {
            window.jQuery(modal).modal("show");
        }
    }

    function hydrateSavedSchedules() {
        if (!isPage("work-schedule-settings")) return;
        Object.keys(demoState.schedules || {}).forEach(function (day) {
            updateScheduleRow(day, demoState.schedules[day]);
        });
    }

    function updateScheduleRow(day, schedule) {
        const modal = document.getElementById("workScheduleModal" + day);
        const button = document.querySelector('[data-target="#workScheduleModal' + day + '"]');
        const row = button && button.closest("tr");
        if (!modal || !row) return;
        const cells = row.querySelectorAll("td");
        const working = String(schedule.isWorking) === "1";
        const start = schedule.start || "08:00";
        const end = schedule.end || "17:00";
        const startMinutes = Number(start.slice(0, 2)) * 60 + Number(start.slice(3, 5));
        const endMinutes = Number(end.slice(0, 2)) * 60 + Number(end.slice(3, 5));
        const duration = Math.max(0, endMinutes - startMinutes);
        cells[1].innerHTML = '<span class="work-status ' + (working ? "work-status-active" : "work-status-off") + '">' + (working ? "Hari Kerja" : "Libur") + '</span>';
        cells[2].textContent = working ? start : "-";
        cells[3].textContent = working ? end : "-";
        cells[4].textContent = working ? Math.floor(duration / 60) + " jam " + (duration % 60) + " menit" : "-";
        cells[5].textContent = schedule.date || "-";
    }

    function handleDemoForm(form) {
        const scheduleDay = form.querySelector('[name="day_of_week"]');
        if (scheduleDay) {
            const data = {
                isWorking: (form.querySelector('[name="is_working_day"]:checked') || {}).value || "1",
                start: (form.querySelector('[name="work_start"]') || {}).value || "08:00",
                end: (form.querySelector('[name="work_end"]') || {}).value || "17:00",
                date: (form.querySelector('[name="effective_date"]') || {}).value || "2026-09-26"
            };
            demoState.schedules[scheduleDay.value] = data;
            saveDemoState();
            updateScheduleRow(scheduleDay.value, data);
            if (window.jQuery) window.jQuery(form.closest(".modal")).modal("hide");
            showDemoNotice("Pengaturan jam kerja demo berhasil disimpan.");
            return;
        }

        if (form.classList.contains("rate-key-modal-form")) {
            if (window.jQuery) window.jQuery(form.closest(".modal")).modal("hide");
            showDemoNotice("Perubahan kunci tarif berhasil disimulasikan.");
            return;
        }

        if (form.id === "portfolioDemoActionForm") {
            if (window.jQuery) window.jQuery(form.closest(".modal")).modal("hide");
            showDemoNotice("Penyimpanan berhasil disimulasikan tanpa mengirim data ke server.");
        }
    }

    document.addEventListener("DOMContentLoaded", function () {
        document.documentElement.setAttribute("data-portfolio-demo", "true");
        try {
            localStorage.setItem("auth_token", "portfolio-demo-only");
        } catch (error) {
            // The static demo also works when storage is unavailable.
        }

        hydrateDashboard();
        hydrateRateSettings();
        hydrateTaxSettings();
        hydrateComponents();
        hydrateRules();
        hydrateAuditTrail();
        hydrateSavedSchedules();
        preparePrimaryActions();

        document.addEventListener("submit", function (event) {
            const form = event.target;
            if (!(form instanceof HTMLFormElement)) return;
            if (form.id === "uploadTransferForm") return;
            if (form.matches("#rateFilterForm, #taxFilterForm, #componentFilterForm, #rateKeyCatalogFilterForm, #auditFilterForm, .rule-period-form")) {
                event.preventDefault();
                return;
            }
            if (!form.matches('[data-demo-form="true"], #portfolioDemoActionForm')) return;
            event.preventDefault();
            handleDemoForm(form);
        });

        document.addEventListener("click", function (event) {
            const demoAction = event.target.closest("[data-demo-action]");
            if (demoAction) {
                event.preventDefault();
                openDemoModal(demoAction);
                return;
            }
            const disabledLink = event.target.closest('a[data-demo-disabled="true"]');
            if (disabledLink) {
                event.preventDefault();
                showDemoNotice("Halaman ini berada di luar cakupan demo payroll dan RMS.");
            }
        });

        window.logoutViaApi = function () {
            showDemoNotice("Sesi login tidak digunakan pada demo frontend.");
            return Promise.resolve();
        };

        window.logoutViaNavbar = window.logoutViaApi;
    });
})();
