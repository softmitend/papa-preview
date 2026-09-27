(function() {
    const statusFilter = document.getElementById('statusFilter');
    const filterForm = document.getElementById('rateFilterForm');
    const keyFilter = document.getElementById('keyFilter');
    const searchInput = document.getElementById('searchInput');
    const filteredEmptyRow = document.getElementById('filtered-empty-row');

    if (!statusFilter || !filterForm) {
        return;
    }

    filterForm.addEventListener('submit', function(event) {
        event.preventDefault();
    });

    function applyFilters() {
        const rows = Array.from(document.querySelectorAll('.tax-row'));
        const selectedStatus = (statusFilter.value || 'all').toLowerCase();
        const selectedKey = (keyFilter?.value || 'all').toLowerCase();
        const keyword = (searchInput?.value || '').trim().toLowerCase();
        let visibleCount = 0;

        rows.forEach(function(row) {
            const rowStatus = (row.dataset.status || '').toLowerCase();
            const rowKey = (row.dataset.type || '').toLowerCase();
            const statusMatch = selectedStatus === 'all' || rowStatus === selectedStatus;
            const keyMatch = selectedKey === 'all' || rowKey === selectedKey;
            const textMatch = keyword === '' || row.textContent.toLowerCase().includes(keyword);
            const isMatch = statusMatch && keyMatch && textMatch;

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
        window.jQuery(statusFilter).on('change', applyFilters);
        if (keyFilter) {
            window.jQuery(keyFilter).select2({
                width: '100%',
                minimumResultsForSearch: Infinity,
            });
            window.jQuery(keyFilter).on('change', applyFilters);
        }
    } else {
        statusFilter.addEventListener('change', applyFilters);
        if (keyFilter) {
            keyFilter.addEventListener('change', applyFilters);
        }
    }

    if (searchInput) {
        searchInput.addEventListener('input', applyFilters);
    }

    applyFilters();
})();
