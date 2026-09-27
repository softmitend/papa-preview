document.addEventListener('DOMContentLoaded', function() {
            const statusFilter = document.getElementById('statusFilter');
            if (!statusFilter) return;
            const ruleSearch = document.getElementById('ruleSearch');

            if (window.jQuery && typeof window.jQuery.fn.select2 === 'function') {
                window.jQuery(statusFilter).select2({
                    width: '100%',
                    minimumResultsForSearch: Infinity,
                });
            }

            const rows = Array.from(document.querySelectorAll('.rule-row'));
            const filteredEmptyRow = document.getElementById('filtered-empty-row');

            function applyStatusFilter() {
                const selected = statusFilter.value;
                const keyword = (ruleSearch?.value || '').trim().toLowerCase();
                let visibleCount = 0;

                rows.forEach((row) => {
                    const activationStatus = row.dataset.activationStatus || '';
                    const approvalStatus = row.dataset.approvalStatus || '';
                    const statusMatch = selected === 'ALL' || activationStatus === selected || approvalStatus ===
                        selected;
                    const textMatch = keyword === '' || row.textContent.toLowerCase().includes(keyword);
                    const isMatch = statusMatch && textMatch;

                    row.style.display = isMatch ? '' : 'none';
                    if (isMatch) visibleCount++;
                });

                if (filteredEmptyRow) {
                    if (rows.length === 0) {
                        filteredEmptyRow.style.display = 'none';
                        return;
                    }
                    filteredEmptyRow.style.display = visibleCount === 0 ? '' : 'none';
                }
            }

            if (window.jQuery) {
                window.jQuery(statusFilter).on('change', applyStatusFilter);
            } else {
                statusFilter.addEventListener('change', applyStatusFilter);
            }
            if (ruleSearch) {
                ruleSearch.addEventListener('input', applyStatusFilter);
            }
            applyStatusFilter();
        });
