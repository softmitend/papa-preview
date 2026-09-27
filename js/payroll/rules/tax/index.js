(function() {
            const statusFilter = document.getElementById('statusFilter');
            const filterForm = document.getElementById('taxFilterForm');
            const typeFilter = document.getElementById('typeFilter');
            const searchInput = document.getElementById('searchInput');
            const filteredEmptyRow = document.getElementById('filtered-empty-row');

            if (!statusFilter || !typeFilter || !filterForm) {
                return;
            }

            filterForm.addEventListener('submit', function(event) {
                event.preventDefault();
            });

            function applyFilters() {
                const rows = Array.from(document.querySelectorAll('.tax-row'));
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

            if (window.jQuery && typeof window.jQuery.fn.select2 === 'function') {
                window.jQuery(statusFilter).select2({
                    width: '100%',
                    minimumResultsForSearch: Infinity,
                });
                window.jQuery(typeFilter).select2({
                    width: '100%',
                    minimumResultsForSearch: Infinity,
                });
                window.jQuery(statusFilter).on('change', function() {
                    applyFilters();
                });
                window.jQuery(typeFilter).on('change', function() {
                    applyFilters();
                });
            } else {
                statusFilter.addEventListener('change', function() {
                    applyFilters();
                });
                typeFilter.addEventListener('change', function() {
                    applyFilters();
                });
            }

            if (searchInput) {
                searchInput.addEventListener('input', function() {
                    applyFilters();
                });
            }

            applyFilters();
        })();
