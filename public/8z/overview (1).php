<?php require_once('sql/select-overview.php'); ?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="ie=edge">
    <!-- <meta http-equiv="refresh" content="120"> -->
    <title>Ideas System</title>
    <link rel="stylesheet" href="/group-operations/digital-factory/ideas/dashboards/content/bootstrap/css/bootstrap.css" type="text/css">
    <link rel="stylesheet" href="/group-operations/digital-factory/ideas/dashboards/content/bootswatch/united.css" type="text/css">
    <link rel="stylesheet" href="/group-operations/digital-factory/ideas/dashboards/content/dashboards.css" type="text/css">
    <link rel="stylesheet" href="/group-operations/digital-factory/ideas/dashboards/content/font-awesome/css/all.css" type="text/css">
    <link rel="stylesheet" href="/group-operations/digital-factory/ideas/dashboards/content/chart-js/chart.min.css" type="text/css">
    <script src="/group-operations/digital-factory/ideas/dashboards/content/jquery/jquery-3.3.1.min.js"></script>
    <script src="/group-operations/digital-factory/ideas/dashboards/content/bootstrap/js/bootstrap.bundle.js"></script>
    <script src="/group-operations/digital-factory/ideas/dashboards/content/chart-js/chart.bundle.min.js"></script>
    <script src="/group-operations/digital-factory/ideas/dashboards/content/chart-js/chartjs-plugin-labels.min.js"></script>
</head>
<body>

<div class="container-fluid">
        
    <div class="row header-top">
        <div class="col-lg-8 d-none d-lg-block text-left" style="padding: 4px 4px 5px 4px">
            <img height="24px" src="/group-operations/digital-factory/ideas/dashboards/content/jcb-logo.png">
        </div>
        <div class="col-lg-4 d-none d-lg-block text-right" style="padding: 5px 8px 0px 0px">
            <a href="../admin/list.php">
                <span style="font-size: 22px; padding-top: 2px; color: black; margin-right: 5px" class="fas fa-home icon-home"></span>
            </a>
            <a href="../admin/board.php">
                <span style="font-size: 21px; padding-top: 2px; color: black" class="fas fa-sticky-note icon-home"></span>
            </a>
        </div>
    </div>

</div>

<div class="container-fluid">
    <div class="row">
        <div class="col-main">

            <div class="row">

                <div class="col-lg-3"></div>
                <div class="col-lg-6">
                    <h1 style="font-size: 34px; color: white; margin: 4px 0px 0px 0px; text-align: center">Group Operations</h1>
                    <h1 style="font-size: 22px; color: rgb(252, 176, 38); margin: 0px 0px 16px 0px; text-align: center">Digitisation Status</h1>
                </div>
                <div class="col-lg-3"></div>

                <div class="col-lg-12" style="margin-bottom: 18px; padding: 8px 0px 8px 0px; border-top: 3px solid rgb(26, 28, 30); border-bottom: 3px solid rgb(26, 28, 30)">

                    <div class="col-measure" style="width: 33.3%; float: left; text-align: center; margin: 0px">
                        <h1 class="line-sub-header-top">Digitised Processes - YTD Target</h1>
                        <h1 class="line-measure-value-top text-grey"><?php echo $processes_target; ?></h1>
                    </div>

                    <div class="col-measure" style="width: 33.4%; float: left; text-align: center; margin: 0px">
                        <h1 class="line-sub-header-top">Digitised Processes - YTD Actual</h1>
                        <h1 class="line-measure-value-top <?php echo $text_processes_actual; ?>"><?php echo $processes_digitised; ?></h1>
                    </div>

                    <div class="col-measure" style="width: 33.3%; float: left; text-align: center; margin: 0px">
                        <h1 class="line-sub-header-top">Digitised Processes - FYF</h1>
                        <h1 class="line-measure-value-top text-grey"><?php echo $processes_digitised + $processes_forecast; ?></h1>
                    </div>

                </div>

                <div class="col-lg-4">
                    <h1 style="font-size: 24px; color: white; margin: 0px 0px 2px 0px; text-align: center">Open Projects By Status</h1>
                    <canvas id="chartOpenStatus" height="116"></canvas>
                </div>

                <div class="col-lg-4">
                    <h1 style="font-size: 24px; color: white; margin: 0px 0px 2px 0px; text-align: center">Digitised Processes - Overview</h1>
                    <canvas id="chartProcessesDigitised" height="116"></canvas>
                </div>

                <div class="col-lg-4">
                    <h1 style="font-size: 24px; color: white; margin: 0px 0px 2px 0px; text-align: center">Open Projects By Strategy</h1>
                    <canvas id="chartOpenStrategy" height="116"></canvas>
                </div>

                <div class="col-lg-12" style="margin-top: 28px">
                
                    <h1 style="font-size: 24px; color: white; margin: 0px 0px 2px 0px; text-align: center">Digitised Processes - Timeline</h1>
                    <canvas id="chartTimeline" height="54"></canvas>
                
                </div>

            </div>

        </div>
    </div>
</div>

<div class="container-fluid footer">
        
    <div class="row header-top">
        <div class="col-lg-6 d-none d-lg-block text-left" style="padding: 4px 4px 5px 4px">
        <img height="24px" src="/group-operations/digital-factory/ideas/dashboards/content/jcb-logo.png">
            <img height="24px" src="/group-operations/digital-factory/ideas/dashboards/media/df.png">
        </div>
        <div class="col-lg-6 d-none d-lg-block text-right" style="padding: 6px 12px 5px 0px; font-weight: bold">
            J.C. Bamford Excavators LTD &copy; 2022
        </div>
    </div>

</div>

<script>

    $(document).ready(function () {

        var ctxOpenStatus = $('#chartOpenStatus');
        var chartOpenStatus = new Chart(ctxOpenStatus, {
            plugins: [{
                beforeInit: function(chart, options) {
                    chart.legend.afterFit = function() {
                        this.height = this.height + 4;
                    };
                }
            }],
            type: 'doughnut',
            data: {
                labels: ['Categorised', 'Hopper', 'Priorities', 'Work-In-Progress'],
                datasets: [
                    {
                        data: [<?php echo $ideas_open_categorised; ?>, <?php echo $ideas_open_hopper; ?>, <?php echo $ideas_open_priorities; ?>, <?php echo $ideas_open_wip; ?>],
                        backgroundColor: ['rgb(102, 104, 106)', 'rgb(238, 28, 37)', 'rgb(255, 123, 0)', 'rgb(0, 173, 238)'],   
                        borderColor: 'black',
                        borderWidth: 6,
                        hoverBackgroundColor: 'rgba(255, 255, 255, 0.8)',
                        hoverBorderColor: 'black',
                    },
                ]
            },
            options: {
                plugins: {
                    labels: {
                        render: 'value',
                        fontSize: 14,
                        fontFamily: 'verdana',
                        fontColor: 'rgb(0, 0, 0)',
                        fontStyle: 'bold',
                        render: function (context) {
                            if (context.percentage > 10) {
                                return context.value;
                            };
                        },
                    }                
                },
                tooltips: {
                    enabled: true,
                    mode: 'single',
                    callbacks: {
                        label: function(tooltipItem, data) {
                            var label = data.labels[tooltipItem.index];
                            var datasetLabel = data.datasets[tooltipItem.datasetIndex].data[tooltipItem.index];
                            return label + " - " + datasetLabel.toFixed(0);
                        }
                    },
                },
                legend: {
                    display: true,
                    labels : {
                        fontColor: 'rgb(162, 164, 166)',
                        fontSize: 14
                    }
                },
                cutoutPercentage: 50,
            }
        });

        var ctxOpenStrategy = $('#chartOpenStrategy');
        var chartOpenStrategy = new Chart(ctxOpenStrategy, {
            plugins: [{
                beforeInit: function(chart, options) {
                    chart.legend.afterFit = function() {
                        this.height = this.height + 4;
                    };
                }
            }],
            type: 'doughnut',
            data: {
                labels: ['Integration', 'Automation', 'Standardisation', 'Digitisation'],
                datasets: [
                    {
                        data: [<?php echo $ideas_open_integration; ?>, <?php echo $ideas_open_automation; ?>, <?php echo $ideas_open_standardisation; ?>, <?php echo $ideas_open_digitisation; ?>],
                        backgroundColor: ['rgb(102, 104, 106)', 'rgb(238, 28, 37)', 'rgb(255, 123, 0)', 'rgb(0, 173, 238)'],
                        borderColor: 'black',
                        borderWidth: 6,
                        hoverBackgroundColor: 'rgba(255, 255, 255, 0.8)',
                        hoverBorderColor: 'black',
                    },
                ]
            },
            options: {
                plugins: {
                    labels: {
                        render: 'value',
                        fontSize: 14,
                        fontFamily: 'verdana',
                        fontColor: 'rgb(0, 0, 0)',
                        fontStyle: 'bold',
                        render: function (context) {
                            if (context.percentage > 10) {
                                return context.value;
                            };
                        },
                    }                
                },
                tooltips: {
                    enabled: true,
                    mode: 'single',
                    callbacks: {
                        label: function(tooltipItem, data) {
                            var label = data.labels[tooltipItem.index];
                            var datasetLabel = data.datasets[tooltipItem.datasetIndex].data[tooltipItem.index];
                            return label + " - " + datasetLabel.toFixed(0);
                        }
                    },
                },
                legend: {
                    display: true,
                    labels : {
                        fontColor: 'rgb(162, 164, 166)',
                        fontSize: 14
                    }
                },
                cutoutPercentage: 50,
            }
        });

        var ctxProcessesDigitised = $('#chartProcessesDigitised');
        var chartProcessesDigitised = new Chart(ctxProcessesDigitised, {
            plugins: [{
                beforeInit: function(chart, options) {
                    chart.legend.afterFit = function() {
                        this.height = this.height + 4;
                    };
                }
            }],
            type: 'doughnut',
            data: {
                labels: ['Completed', 'Identified', 'Remaining'],
                datasets: [
                    {
                        data: [<?php echo $processes_digitised; ?>, <?php echo $processes_forecast; ?>, <?php echo $processes_remaining; ?>],
                        backgroundColor: ['rgb(0, 169, 79)', 'rgb(255, 123, 0)', 'rgb(238, 28, 37)'],   
                        borderColor: 'black',
                        borderWidth: 6,
                        hoverBackgroundColor: 'rgba(255, 255, 255, 0.8)',
                        hoverBorderColor: 'black',
                    },
                ]
            },
            options: {
                plugins: {
                    labels: {
                        render: 'value',
                        fontSize: 14,
                        fontFamily: 'verdana',
                        fontColor: 'rgb(0, 0, 0)',
                        fontStyle: 'bold',
                        render: function (context) {
                            if (context.percentage > 10) {
                                return context.value;
                            };
                        },
                    }                
                },
                tooltips: {
                    enabled: true,
                    mode: 'single',
                    callbacks: {
                        label: function(tooltipItem, data) {
                            var label = data.labels[tooltipItem.index];
                            var datasetLabel = data.datasets[tooltipItem.datasetIndex].data[tooltipItem.index];
                            return label + " - " + datasetLabel.toFixed(0);
                        }
                    },
                },
                legend: {
                    display: true,
                    labels : {
                        fontColor: 'rgb(162, 164, 166)',
                        fontSize: 14
                    }
                },
                cutoutPercentage: 50,
            }
        });

        var ctxTimeline = document.getElementById('chartTimeline').getContext('2d');
        var chartTimeline = new Chart(ctxTimeline, {
            plugins: [{
                beforeInit: function(chart, options) {
                    chart.legend.afterFit = function() {
                        this.height = this.height + 11;
                    };
                }
            }],
            type: 'bar',
            data: {
                labels: [<?php for ($x=1; $x<53; $x++) { echo $x.", "; } ?>],
                datasets: [
                    {
                        label: 'Current Week',
                        type: 'bar',
                        fill: true,
                        data: [<?php for ($x=1; $x<=52; $x++) { if ($x == (int)Date("W")) { echo "300, "; } else { echo "0, "; } } ?>],
                        backgroundColor: 'rgba(255, 255, 255, 0.25)',
                        borderColor: 'rgba(255, 255, 255, 0.25)',
                        borderWidth: 0
                    },
                    {
                        label: 'Rolling Target',
                        type: 'line',
                        fill: false,
                        data: [6, 12, 17, 23, 29, 35, 40, 46, 52, 58, 63, 69, 75, 81, 87, 92, 98, 104, 110, 115, 121, 127, 133, 138, 144, 150, 156, 162, 167, 173, 179, 185, 190, 196, 202, 208, 213, 219, 225, 231, 237, 242, 248, 254, 260, 265, 271, 277, 283, 288, 294, 300],
                        backgroundColor: 'white',
                        borderColor: 'white',
                        borderWidth: 2
                    },
                    {
                        label: 'Cumulative Actual',
                        type: 'line',
                        fill: false,
                        data: [<?php foreach ($array_cumulative as $cumulative) { echo $cumulative.", "; } ?>],
                        backgroundColor: 'rgb(0, 169, 79)',
                        borderColor: 'rgb(0, 169, 79)',
                        borderWidth: 2
                    },
                    {
                        label: 'Cumulative Forecast',
                        type: 'line',
                        fill: false,
                        data: [<?php foreach ($array_forecast as $forecast) { echo $forecast.", "; } ?>],
                        backgroundColor: 'rgb(255, 123, 0)',
                        borderColor: 'rgb(255, 123, 0)',
                        borderWidth: 2
                    },
                ]
            },
            options: {
                legend: {
                    display: true,
                    labels : {
                        fontColor: 'rgb(162, 164, 166)',
                        fontSize: 14
                    }
                },
                plugins: {
                    labels: {
                        display: false,
                        fontSize: 0
                    }                
                },
                scales: {
                    yAxes: [{
                        stacked: false,
                        gridLines: {
                            display: true,
                            color: 'rgb(30, 30, 30)',
                            zeroLineColor: 'rgb(30, 30, 30)',
                            lineWidth: 2,
                            zeroLineWidth: 2
                        },
                        ticks: {
                            beginAtZero: true,
                            fontColor: 'white',
                            min: 0,
                            precision: 1,
                            fontSize: 14,
                            maxTicksLimit: 8,
                        }
                    }],
                    xAxes: [{
                        barPercentage: 1,
                        stacked: false,
                        gridLines: {
                            display: false,
                            color: 'rgb(30, 30, 30)'
                        },
                        ticks: {
                            beginAtZero: true,
                            fontColor: 'white',
                            fontSize: 14
                        }
                    }]
                },
            }
        });

    });

</script>
    
</body>
</html>