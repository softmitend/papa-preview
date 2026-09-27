(function (window, document) {
    'use strict';

    function initializeAuditSelect2() {
        var $ = window.jQuery;
        var page = document.querySelector('.audit-page');

        if (!page || !$ || typeof $.fn.select2 !== 'function') {
            return;
        }

        var $dropdownParent = $(page);

        page.querySelectorAll('select[data-audit-select2]').forEach(function (select) {
            var $select = $(select);

            if ($select.hasClass('select2-hidden-accessible')) {
                $select.select2('destroy');
            }

            $select.siblings('.select2-container').remove();
            $select.off('.auditSelect2');
            $select.select2({
                width: '100%',
                dropdownParent: $dropdownParent,
                minimumResultsForSearch: 0,
                language: {
                    noResults: function () {
                        return 'Data tidak ditemukan';
                    },
                    searching: function () {
                        return 'Mencari...';
                    }
                }
            });

            $select.on('select2:open.auditSelect2', function () {
                window.setTimeout(function () {
                    var openDropdown = page.querySelector(
                        '.select2-container--open .select2-dropdown'
                    );
                    var searchInput = page.querySelector(
                        '.select2-container--open .select2-search__field'
                    );

                    if (openDropdown) {
                        openDropdown.classList.add('audit-select2-dropdown');
                    }

                    if (searchInput) {
                        searchInput.focus();
                    }
                }, 0);
            });
        });
    }

    window.jQuery(initializeAuditSelect2);
})(window, document);
