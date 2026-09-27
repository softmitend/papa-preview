(function ($) {
    'use strict';

    var form = document.getElementById('auditFilterForm');
    if (!form) {
        return;
    }

    var submitForm = function () {
        form.classList.add('is-loading');
        form.submit();
    };

    form.querySelectorAll('[data-audit-auto-submit]').forEach(function (field) {
        field.addEventListener('change', submitForm);
    });

    form.addEventListener('submit', function () {
        form.classList.add('is-loading');
    });

    var dateRange = $('#auditDateRange');
    var dateFrom = document.getElementById('auditDateFrom');
    var dateTo = document.getElementById('auditDateTo');

    if (dateRange.length && dateFrom && dateTo && typeof dateRange.daterangepicker === 'function') {
        dateRange.daterangepicker(
            {
                startDate: window.moment(dateFrom.value, 'YYYY-MM-DD'),
                endDate: window.moment(dateTo.value, 'YYYY-MM-DD'),
                autoUpdateInput: true,
                opens: 'left',
                maxDate: window.moment(),
                locale: {
                    format: 'DD/MM/YYYY',
                    separator: ' - ',
                    applyLabel: 'Terapkan',
                    cancelLabel: 'Batal',
                    fromLabel: 'Dari',
                    toLabel: 'Sampai',
                    customRangeLabel: 'Rentang tanggal',
                    weekLabel: 'M',
                    daysOfWeek: ['Mg', 'Sn', 'Sl', 'Rb', 'Km', 'Jm', 'Sb'],
                    monthNames: [
                        'Januari',
                        'Februari',
                        'Maret',
                        'April',
                        'Mei',
                        'Juni',
                        'Juli',
                        'Agustus',
                        'September',
                        'Oktober',
                        'November',
                        'Desember'
                    ],
                    firstDay: 1
                }
            },
            function (start, end) {
                dateFrom.value = start.format('YYYY-MM-DD');
                dateTo.value = end.format('YYYY-MM-DD');
                submitForm();
            }
        );
    }

    document.querySelectorAll('[data-audit-refresh]').forEach(function (button) {
        button.addEventListener('click', function () {
            button.classList.add('is-loading');
        });
    });
})(window.jQuery);
