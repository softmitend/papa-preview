function readJsonConfig(elementId) {
    const el = document.getElementById(elementId);
    if (!el) {
        return {};
    }

    try {
        return JSON.parse(el.textContent || '{}');
    } catch (error) {
        console.error('Invalid JSON config:', elementId, error);
        return {};
    }
}

const hrdPayslipConfig = readJsonConfig('payroll-hrd-payslip-config');

let proofModalInstance;
        let uploadModalInstance;
        let pendingEmployees = [];
        let salaryHistory = [];
        const TAX_COMPONENT_KEYWORDS = ['PPH', 'BPJS', 'TAX', 'JHT', 'JP', 'JKM', 'JKK'];

        function formatCurrency(amount) {
            return new Intl.NumberFormat('id-ID', {
                style: 'currency',
                currency: 'IDR',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
            }).format(Number(amount || 0));
        }

        function parseLocalDate(dateString) {
            if (!dateString) return null;

            const normalized = String(dateString).trim();
            const datePart = normalized.slice(0, 10);

            if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
                const [year, month, day] = datePart.split('-').map(Number);
                return new Date(year, month - 1, day);
            }

            const parsed = new Date(normalized);
            return Number.isNaN(parsed.getTime()) ? null : parsed;
        }

        function getTodayLocalInputValue() {
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }

        function formatShortDate(dateString) {
            if (!dateString) return '-';
            const parsedDate = parseLocalDate(dateString);
            if (!parsedDate) return '-';

            return parsedDate.toLocaleDateString('id-ID', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
            });
        }

        function escapeHtml(value) {
            return String(value ?? '')
                .replaceAll('&', '&amp;')
                .replaceAll('<', '&lt;')
                .replaceAll('>', '&gt;')
                .replaceAll('"', '&quot;')
                .replaceAll("'", '&#39;');
        }

        function isTaxDeductionComponent(component) {
            const haystack = `${String(component?.code || '').toUpperCase()} ${String(component?.name || '').toUpperCase()}`;
            return TAX_COMPONENT_KEYWORDS.some((keyword) => haystack.includes(keyword));
        }

        function normalizeComponentAmount(component) {
            return Number(component?.amount ?? component?.value ?? 0);
        }

        function normalizeComponentLabel(component, fallbackLabel) {
            const name = String(component?.name || '').trim();
            const code = String(component?.code || '').trim().toUpperCase();

            if (name && code && name.toUpperCase() !== code) {
                return `${name} (${code})`;
            }

            if (name) {
                return name;
            }

            if (code) {
                return code;
            }

            return fallbackLabel;
        }

        function renderBreakdownDetailList(targetElementId, components, options = {}) {
            const targetElement = document.getElementById(targetElementId);
            if (!targetElement) {
                return;
            }

            const items = Array.isArray(components) ? components : [];
            if (!items.length) {
                targetElement.innerHTML = `<div class="transfer-breakdown-empty">${escapeHtml(options.emptyText || 'Belum ada data.')}</div>`;
                return;
            }

            const rowsHtml = items.map((component) => {
                const label = normalizeComponentLabel(component, options.fallbackLabel || 'Komponen');
                const amount = normalizeComponentAmount(component);
                const kindBadge = options.withDeductionKind
                    ? `<span class="transfer-breakdown-kind ${isTaxDeductionComponent(component) ? 'kind-tax' : 'kind-rule'}">${isTaxDeductionComponent(component) ? 'Pajak' : 'Rule'}</span>`
                    : '';

                return `
                    <div class="transfer-breakdown-row">
                        <div class="transfer-breakdown-row-label">
                            <span>${escapeHtml(label)}</span>
                            ${kindBadge}
                        </div>
                        <div class="transfer-breakdown-row-value">${escapeHtml(formatCurrency(amount))}</div>
                    </div>
                `;
            }).join('');

            targetElement.innerHTML = rowsHtml;
        }

        function setSelectedPeriodLabel(dateString) {
            const targetDate = parseLocalDate(dateString);
            if (!targetDate) {
                document.getElementById('selectedPeriodLabel').textContent = '-';
                return;
            }

            document.getElementById('selectedPeriodLabel').textContent = targetDate.toLocaleDateString('id-ID', {
                month: 'long',
                year: 'numeric',
            });
        }

        function setSummaryCounts() {
            document.getElementById('pendingCount').textContent = pendingEmployees.length;
            document.getElementById('paidCount').textContent = salaryHistory.length;
        }

        function setTableLoading(tbodyId, colspan, message, wrapperId, emptyStateId) {
            const tbody = document.getElementById(tbodyId);
            const tableWrapper = document.getElementById(wrapperId);
            const emptyState = document.getElementById(emptyStateId);

            if (!tbody) {
                return;
            }

            tableWrapper?.classList.remove('d-none');
            emptyState?.classList.add('d-none');
            tbody.innerHTML = `
                <tr class="table-state-row">
                    <td colspan="${colspan}">
                        <div class="table-state-content" aria-live="polite">
                            <i class="fas fa-spinner fa-spin"></i>
                            <div class="table-state-title">${message}</div>
                        </div>
                    </td>
                </tr>
            `;
        }

        function switchPayslipPanel(panelId) {
            const tabs = document.querySelectorAll('.approval-tab');
            const panels = document.querySelectorAll('.tab-panel');

            tabs.forEach((tab) => {
                const isTarget = tab.getAttribute('data-panel-target') === panelId;
                tab.classList.toggle('active', isTarget);
                tab.setAttribute('aria-selected', isTarget ? 'true' : 'false');
            });

            panels.forEach((panel) => {
                panel.classList.toggle('active', panel.id === panelId);
            });
        }

        async function loadPendingPayments() {
            const date = document.getElementById('paymentDateFilter').value;
            setSelectedPeriodLabel(date);

            try {
                document.getElementById('pendingError').classList.add('d-none');
                setTableLoading(
                    'pendingTableBody',
                    8,
                    'Memuat karyawan menunggu pembayaran...',
                    'pendingTableWrapper',
                    'pendingEmptyState'
                );

                const response = await fetch(`/api/salary/pending?salary_date=${encodeURIComponent(date)}`);
                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.message || 'Gagal memuat daftar pembayaran pending');
                }

                pendingEmployees = result.data || [];
                renderPendingTable();
                setSummaryCounts();
            } catch (error) {
                const errorEl = document.getElementById('pendingError');
                errorEl.textContent = error.message;
                errorEl.classList.remove('d-none');
            }
        }

        async function loadSalaryHistory() {
            try {
                document.getElementById('historyError').classList.add('d-none');
                setTableLoading(
                    'historyTableBody',
                    5,
                    'Memuat riwayat slip gaji...',
                    'historyTableWrapper',
                    'historyEmptyState'
                );
                const response = await fetch('/api/salary/history');
                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.message || 'Gagal memuat riwayat slip gaji');
                }

                salaryHistory = result.data || [];
                renderHistoryTable();
                setSummaryCounts();
            } catch (error) {
                const errorEl = document.getElementById('historyError');
                errorEl.textContent = error.message;
                errorEl.classList.remove('d-none');
            }
        }

        function renderPendingTable() {
            const tbody = document.getElementById('pendingTableBody');
            const emptyState = document.getElementById('pendingEmptyState');
            const tableWrapper = document.getElementById('pendingTableWrapper');

            tbody.innerHTML = '';

            if (pendingEmployees.length === 0) {
                tableWrapper.classList.add('d-none');
                emptyState.classList.remove('d-none');
                return;
            }

            tableWrapper.classList.remove('d-none');
            emptyState.classList.add('d-none');

            pendingEmployees.forEach((employee, index) => {
                const taxDeduction = Number(employee.tax_deduction ?? employee.pph21 ?? 0);
                const ruleDeduction = Number(employee.rule_deduction ?? 0);
                const ruleEarning = Number(employee.rule_earning ?? 0);
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>
                        <div class="font-weight-700">${employee.employee_name}</div>
                        <div class="text-muted small">Master Salary ID #${employee.id_master_salary}</div>
                    </td>
                    <td class="amount-strong">${formatCurrency(employee.basic_salary ?? employee.master_salary_amount ?? employee.salary_amount)}</td>
                    <td>${formatCurrency(taxDeduction)}</td>
                    <td>${formatCurrency(ruleDeduction)}</td>
                    <td>${formatCurrency(ruleEarning)}</td>
                    <td class="amount-strong">${formatCurrency(employee.net_salary)}</td>
                    <td><span class="status-badge status-pending pending-status-pill">Menunggu Pembayaran</span></td>
                    <td>
                        <button type="button" class="btn btn-primary btn-sm transfer-action-btn open-upload-modal-btn"
                            data-pending-index="${index}"
                            data-master-salary-id="${employee.id_master_salary}"
                            data-salary-date="${employee.salary_date}"
                            data-employee-name="${employee.employee_name}">
                            <i class="fas fa-exchange-alt"></i> Transfer
                        </button>
                    </td>
                `;
                tbody.appendChild(row);
            });

            document.querySelectorAll('.open-upload-modal-btn').forEach((button) => {
                button.addEventListener('click', function () {
                    const pendingIndex = Number(this.getAttribute('data-pending-index'));
                    const selectedEmployee = Number.isInteger(pendingIndex) && pendingIndex >= 0
                        ? pendingEmployees[pendingIndex]
                        : null;

                    openUploadModal({
                        masterSalaryId: this.getAttribute('data-master-salary-id'),
                        salaryDate: this.getAttribute('data-salary-date'),
                        employeeName: this.getAttribute('data-employee-name'),
                        employeeData: selectedEmployee,
                    });
                });
            });
        }

        function renderHistoryTable() {
            const tbody = document.getElementById('historyTableBody');
            const emptyState = document.getElementById('historyEmptyState');
            const tableWrapper = document.getElementById('historyTableWrapper');

            tbody.innerHTML = '';

            if (salaryHistory.length === 0) {
                tableWrapper.classList.add('d-none');
                emptyState.classList.remove('d-none');
                return;
            }

            tableWrapper.classList.remove('d-none');
            emptyState.classList.add('d-none');

            salaryHistory.forEach((salary) => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>
                        <div class="font-weight-700">${salary.employee_name}</div>
                        <div class="text-muted small">Slip #${salary.id}</div>
                    </td>
                    <td>${formatShortDate(salary.salary_date)}</td>
                    <td class="amount-strong">${formatCurrency(salary.salary_amount)}</td>
                    <td>
                        ${salary.transfer_proof
                            ? `<a href="#" onclick="openProofModal('${salary.transfer_proof}', '${salary.employee_name}'); return false;">Lihat Bukti</a>`
                            : `<span class="text-muted">Tidak ada</span>`}
                    </td>
                    <td>
                        <a href="${hrdPayslipConfig.detailUrl}?id=${salary.id}" class="btn btn-primary btn-sm">
                            <i class="fas fa-eye"></i> Rincian
                        </a>
                    </td>
                `;
                tbody.appendChild(row);
            });
        }

        function openUploadModal({ masterSalaryId, salaryDate, employeeName, employeeData }) {
            document.getElementById('uploadMasterSalaryId').value = masterSalaryId;
            document.getElementById('uploadSalaryDate').value = salaryDate;
            document.getElementById('uploadEmployeeCaption').textContent = `Karyawan: ${employeeName}`;
            document.getElementById('uploadTransferProof').value = '';

            const taxDeduction = Number(employeeData?.tax_deduction ?? employeeData?.pph21 ?? 0);
            const ruleDeduction = Number(employeeData?.rule_deduction ?? 0);
            const ruleEarning = Number(employeeData?.rule_earning ?? 0);
            const totalDeduction = taxDeduction + ruleDeduction;
            const netSalary = Number(employeeData?.net_salary ?? employeeData?.salary_amount ?? 0);
            const earningComponents = Array.isArray(employeeData?.rule_breakdown?.earnings)
                ? employeeData.rule_breakdown.earnings
                : [];
            const deductionComponents = Array.isArray(employeeData?.rule_breakdown?.deductions)
                ? employeeData.rule_breakdown.deductions
                : [];
            const earningDetails = earningComponents.length > 0
                ? earningComponents
                : (ruleEarning > 0 ? [{ name: 'Total Earning Rule', amount: ruleEarning }] : []);
            const deductionDetails = deductionComponents.length > 0
                ? deductionComponents
                : [
                    ...(taxDeduction > 0 ? [{ name: 'Potongan Pajak', code: 'TAX', amount: taxDeduction }] : []),
                    ...(ruleDeduction > 0 ? [{ name: 'Potongan Rule', code: 'RULE_DEDUCTION', amount: ruleDeduction }] : []),
                ];

            document.getElementById('uploadRuleEarningAmount').textContent = formatCurrency(ruleEarning);
            document.getElementById('uploadTaxDeductionAmount').textContent = formatCurrency(taxDeduction);
            document.getElementById('uploadRuleDeductionAmount').textContent = formatCurrency(ruleDeduction);
            document.getElementById('uploadTotalDeductionAmount').textContent = formatCurrency(totalDeduction);
            document.getElementById('uploadNetSalaryAmount').textContent = formatCurrency(netSalary);
            renderBreakdownDetailList('uploadEarningDetailList', earningDetails, {
                emptyText: 'Belum ada komponen earning.',
                fallbackLabel: 'Komponen Earning',
            });
            renderBreakdownDetailList('uploadDeductionDetailList', deductionDetails, {
                emptyText: 'Belum ada komponen potongan.',
                fallbackLabel: 'Komponen Potongan',
                withDeductionKind: true,
            });

            if (!uploadModalInstance) {
                uploadModalInstance = new bootstrap.Modal(document.getElementById('uploadTransferModal'));
            }

            uploadModalInstance.show();
        }

        function closeUploadModal() {
            if (uploadModalInstance) {
                uploadModalInstance.hide();
            }
        }

        async function handleTransferUpload(event) {
            event.preventDefault();

            const masterSalaryId = document.getElementById('uploadMasterSalaryId').value;
            const salaryDate = document.getElementById('uploadSalaryDate').value;
            const fileInput = document.getElementById('uploadTransferProof');
            const submitButton = document.getElementById('uploadTransferSubmitButton');

            if (!fileInput.files.length) {
                alert('Silakan upload bukti transfer terlebih dahulu.');
                return;
            }

            submitButton.disabled = true;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memproses';

            try {
                const formData = new FormData();
                formData.append('id_master_salary', masterSalaryId);
                formData.append('salary_date', salaryDate);
                formData.append('transfer_proof', fileInput.files[0]);

                const response = await fetch('/api/salary', {
                    method: 'POST',
                    headers: {
                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
                        'Accept': 'application/json',
                    },
                    body: formData,
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.message || 'Gagal mengunggah bukti transfer');
                }

                showHistorySuccess(result.message || 'Slip gaji berhasil dibuat otomatis.');
                closeUploadModal();
                await Promise.all([loadPendingPayments(), loadSalaryHistory()]);
                switchPayslipPanel('historyPanel');
            } catch (error) {
                alert(error.message);
            } finally {
                submitButton.disabled = false;
                submitButton.innerHTML = '<i class="fas fa-upload"></i> Upload & Generate';
            }
        }

        function showHistorySuccess(message) {
            const successEl = document.getElementById('historySuccess');
            successEl.textContent = message;
            successEl.classList.remove('d-none');

            setTimeout(() => {
                successEl.classList.add('d-none');
            }, 3000);
        }

        function openProofModal(proofPath, employeeName) {
            const imageEl = document.getElementById('proofImage');
            const pdfEl = document.getElementById('proofPdf');
            const downloadLink = document.getElementById('proofDownloadLink');
            const titleEl = document.getElementById('proofModalLabel');
            const storageUrl = `${hrdPayslipConfig.storageBaseUrl}${proofPath}`;

            titleEl.textContent = `Bukti Transfer - ${employeeName}`;
            downloadLink.href = storageUrl;

            imageEl.classList.add('d-none');
            pdfEl.classList.add('d-none');

            if (proofPath.toLowerCase().endsWith('.pdf')) {
                pdfEl.src = storageUrl;
                pdfEl.classList.remove('d-none');
            } else {
                imageEl.src = storageUrl;
                imageEl.classList.remove('d-none');
            }

            proofModalInstance = new bootstrap.Modal(document.getElementById('proofModal'));
            proofModalInstance.show();
        }

        function closeProofModal() {
            if (proofModalInstance) {
                proofModalInstance.hide();
            }
        }

        document.addEventListener('DOMContentLoaded', function () {
            const today = getTodayLocalInputValue();
            document.getElementById('paymentDateFilter').value = today;

            loadPendingPayments();
            loadSalaryHistory();
            switchPayslipPanel('pendingPanel');

            document.getElementById('refreshPendingButton').addEventListener('click', loadPendingPayments);
            document.getElementById('refreshHistoryButton').addEventListener('click', loadSalaryHistory);
            document.getElementById('paymentDateFilter').addEventListener('change', loadPendingPayments);
            document.getElementById('uploadTransferForm').addEventListener('submit', handleTransferUpload);

            document.querySelectorAll('.approval-tab').forEach((tab) => {
                tab.addEventListener('click', function () {
                    switchPayslipPanel(this.getAttribute('data-panel-target'));
                });
            });
        });
