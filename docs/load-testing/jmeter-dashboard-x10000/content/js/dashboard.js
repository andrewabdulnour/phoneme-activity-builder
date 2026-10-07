/*
   Licensed to the Apache Software Foundation (ASF) under one or more
   contributor license agreements.  See the NOTICE file distributed with
   this work for additional information regarding copyright ownership.
   The ASF licenses this file to You under the Apache License, Version 2.0
   (the "License"); you may not use this file except in compliance with
   the License.  You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/
var showControllersOnly = false;
var seriesFilter = "";
var filtersOnlySampleSeries = true;

/*
 * Add header in statistics table to group metrics by category
 * format
 *
 */
function summaryTableHeader(header) {
    var newRow = header.insertRow(-1);
    newRow.className = "tablesorter-no-sort";
    var cell = document.createElement('th');
    cell.setAttribute("data-sorter", false);
    cell.colSpan = 1;
    cell.innerHTML = "Requests";
    newRow.appendChild(cell);

    cell = document.createElement('th');
    cell.setAttribute("data-sorter", false);
    cell.colSpan = 3;
    cell.innerHTML = "Executions";
    newRow.appendChild(cell);

    cell = document.createElement('th');
    cell.setAttribute("data-sorter", false);
    cell.colSpan = 7;
    cell.innerHTML = "Response Times (ms)";
    newRow.appendChild(cell);

    cell = document.createElement('th');
    cell.setAttribute("data-sorter", false);
    cell.colSpan = 1;
    cell.innerHTML = "Throughput";
    newRow.appendChild(cell);

    cell = document.createElement('th');
    cell.setAttribute("data-sorter", false);
    cell.colSpan = 2;
    cell.innerHTML = "Network (KB/sec)";
    newRow.appendChild(cell);
}

/*
 * Populates the table identified by id parameter with the specified data and
 * format
 *
 */
function createTable(table, info, formatter, defaultSorts, seriesIndex, headerCreator) {
    var tableRef = table[0];

    // Create header and populate it with data.titles array
    var header = tableRef.createTHead();

    // Call callback is available
    if(headerCreator) {
        headerCreator(header);
    }

    var newRow = header.insertRow(-1);
    for (var index = 0; index < info.titles.length; index++) {
        var cell = document.createElement('th');
        cell.innerHTML = info.titles[index];
        newRow.appendChild(cell);
    }

    var tBody;

    // Create overall body if defined
    if(info.overall){
        tBody = document.createElement('tbody');
        tBody.className = "tablesorter-no-sort";
        tableRef.appendChild(tBody);
        var newRow = tBody.insertRow(-1);
        var data = info.overall.data;
        for(var index=0;index < data.length; index++){
            var cell = newRow.insertCell(-1);
            cell.innerHTML = formatter ? formatter(index, data[index]): data[index];
        }
    }

    // Create regular body
    tBody = document.createElement('tbody');
    tableRef.appendChild(tBody);

    var regexp;
    if(seriesFilter) {
        regexp = new RegExp(seriesFilter, 'i');
    }
    // Populate body with data.items array
    for(var index=0; index < info.items.length; index++){
        var item = info.items[index];
        if((!regexp || filtersOnlySampleSeries && !info.supportsControllersDiscrimination || regexp.test(item.data[seriesIndex]))
                &&
                (!showControllersOnly || !info.supportsControllersDiscrimination || item.isController)){
            if(item.data.length > 0) {
                var newRow = tBody.insertRow(-1);
                for(var col=0; col < item.data.length; col++){
                    var cell = newRow.insertCell(-1);
                    cell.innerHTML = formatter ? formatter(col, item.data[col]) : item.data[col];
                }
            }
        }
    }

    // Add support of columns sort
    table.tablesorter({sortList : defaultSorts});
}

$(document).ready(function() {

    // Customize table sorter default options
    $.extend( $.tablesorter.defaults, {
        theme: 'blue',
        cssInfoBlock: "tablesorter-no-sort",
        widthFixed: true,
        widgets: ['zebra']
    });

    var data = {"OkPercent": 97.26285714285714, "KoPercent": 2.737142857142857};
    var dataset = [
        {
            "label" : "FAIL",
            "data" : data.KoPercent,
            "color" : "#FF6347"
        },
        {
            "label" : "PASS",
            "data" : data.OkPercent,
            "color" : "#9ACD32"
        }];
    $.plot($("#flot-requests-summary"), dataset, {
        series : {
            pie : {
                show : true,
                radius : 1,
                label : {
                    show : true,
                    radius : 3 / 4,
                    formatter : function(label, series) {
                        return '<div style="font-size:8pt;text-align:center;padding:2px;color:white;">'
                            + label
                            + '<br/>'
                            + Math.round10(series.percent, -2)
                            + '%</div>';
                    },
                    background : {
                        opacity : 0.5,
                        color : '#000'
                    }
                }
            }
        },
        legend : {
            show : true
        }
    });

    // Creates APDEX table
    createTable($("#apdexTable"), {"supportsControllersDiscrimination": true, "overall": {"data": [0.97145, 500, 1500, "Total"], "isController": false}, "titles": ["Apdex", "T (Toleration threshold)", "F (Frustration threshold)", "Label"], "items": [{"data": [0.9715, 500, 1500, "04 POST /api/activities (save Wordle)"], "isController": false}, {"data": [0.9715, 500, 1500, "07 DELETE /api/activities/{id}"], "isController": false}, {"data": [0.971, 500, 1500, "02 GET /api/word-lists"], "isController": false}, {"data": [0.96335, 500, 1500, "01 GET /health"], "isController": false}, {"data": [0.97305, 500, 1500, "03 GET /wordle (builder page)"], "isController": false}, {"data": [0.97825, 500, 1500, "06 POST /api/telemetry/page-view"], "isController": false}, {"data": [0.9715, 500, 1500, "05 GET /api/activities/{id}/generate"], "isController": false}]}, function(index, item){
        switch(index){
            case 0:
                item = item.toFixed(3);
                break;
            case 1:
            case 2:
                item = formatDuration(item);
                break;
        }
        return item;
    }, [[0, 0]], 3);

    // Create statistics table
    createTable($("#statisticsTable"), {"supportsControllersDiscrimination": true, "overall": {"data": ["Total", 70000, 1916, 2.737142857142857, 12.249085714285785, 0, 737, 5.0, 29.0, 112.0, 499.9900000000016, 1158.9020231118175, 16348.853986881642, 257.3587691632727], "isController": false}, "titles": ["Label", "#Samples", "FAIL", "Error %", "Average", "Min", "Max", "Median", "90th pct", "95th pct", "99th pct", "Transactions/s", "Received", "Sent"], "items": [{"data": ["04 POST /api/activities (save Wordle)", 10000, 285, 2.85, 10.152099999999992, 0, 697, 5.0, 21.0, 30.0, 59.0, 165.81273110149397, 115.64011421906349, 60.13629417872954], "isController": false}, {"data": ["07 DELETE /api/activities/{id}", 10000, 285, 2.85, 10.281600000000013, 0, 723, 5.0, 21.0, 29.0, 56.0, 165.8264791721942, 56.72481756496252, 44.75753836810161], "isController": false}, {"data": ["02 GET /api/word-lists", 10000, 285, 2.85, 9.197100000000017, 0, 737, 6.0, 17.0, 22.0, 37.0, 165.74951932639397, 3282.2341701439536, 26.732775258154877], "isController": false}, {"data": ["01 GET /health", 10000, 299, 2.99, 38.3422, 0, 723, 3.0, 125.0, 183.0, 561.0, 165.72754391779915, 109.54194136870235, 25.434678747514084], "isController": false}, {"data": ["03 GET /wordle (builder page)", 10000, 263, 2.63, 4.558300000000009, 0, 715, 1.0, 8.0, 11.0, 21.0, 165.83472910897, 10726.741306762118, 25.545576825011192], "isController": false}, {"data": ["06 POST /api/telemetry/page-view", 10000, 214, 2.14, 3.8271000000000077, 0, 702, 1.0, 9.0, 11.0, 18.0, 165.85398215411152, 39.50003705799914, 42.7168430679255], "isController": false}, {"data": ["05 GET /api/activities/{id}/generate", 10000, 285, 2.85, 9.385200000000026, 0, 732, 4.0, 20.0, 25.0, 39.0, 165.83197903883783, 2044.0491194321912, 32.43014392661106], "isController": false}]}, function(index, item){
        switch(index){
            // Errors pct
            case 3:
                item = item.toFixed(2) + '%';
                break;
            // Mean
            case 4:
            // Mean
            case 7:
            // Median
            case 8:
            // Percentile 1
            case 9:
            // Percentile 2
            case 10:
            // Percentile 3
            case 11:
            // Throughput
            case 12:
            // Kbytes/s
            case 13:
            // Sent Kbytes/s
                item = item.toFixed(2);
                break;
        }
        return item;
    }, [[0, 0]], 0, summaryTableHeader);

    // Create error table
    createTable($("#errorsTable"), {"supportsControllersDiscrimination": false, "titles": ["Type of error", "Number of errors", "% in errors", "% in all samples"], "items": [{"data": ["400/Bad Request", 40, 2.0876826722338206, 0.05714285714285714], "isController": false}, {"data": ["Non HTTP response code: java.net.SocketException/Non HTTP response message: Connection reset", 13, 0.6784968684759917, 0.018571428571428572], "isController": false}, {"data": ["Non HTTP response code: java.net.SocketException/Non HTTP response message: Connection reset by peer", 1566, 81.73277661795407, 2.237142857142857], "isController": false}, {"data": ["Non HTTP response code: java.net.SocketException/Non HTTP response message: Broken pipe", 148, 7.724425887265136, 0.21142857142857144], "isController": false}, {"data": ["404/Not Found", 149, 7.776617954070981, 0.21285714285714286], "isController": false}]}, function(index, item){
        switch(index){
            case 2:
            case 3:
                item = item.toFixed(2) + '%';
                break;
        }
        return item;
    }, [[1, 1]]);

        // Create top5 errors by sampler
    createTable($("#top5ErrorsBySamplerTable"), {"supportsControllersDiscrimination": false, "overall": {"data": ["Total", 70000, 1916, "Non HTTP response code: java.net.SocketException/Non HTTP response message: Connection reset by peer", 1566, "404/Not Found", 149, "Non HTTP response code: java.net.SocketException/Non HTTP response message: Broken pipe", 148, "400/Bad Request", 40, "Non HTTP response code: java.net.SocketException/Non HTTP response message: Connection reset", 13], "isController": false}, "titles": ["Sample", "#Samples", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors"], "items": [{"data": ["04 POST /api/activities (save Wordle)", 10000, 285, "Non HTTP response code: java.net.SocketException/Non HTTP response message: Connection reset by peer", 226, "400/Bad Request", 40, "Non HTTP response code: java.net.SocketException/Non HTTP response message: Broken pipe", 18, "Non HTTP response code: java.net.SocketException/Non HTTP response message: Connection reset", 1, "", ""], "isController": false}, {"data": ["07 DELETE /api/activities/{id}", 10000, 285, "Non HTTP response code: java.net.SocketException/Non HTTP response message: Connection reset by peer", 155, "404/Not Found", 91, "Non HTTP response code: java.net.SocketException/Non HTTP response message: Broken pipe", 36, "Non HTTP response code: java.net.SocketException/Non HTTP response message: Connection reset", 3, "", ""], "isController": false}, {"data": ["02 GET /api/word-lists", 10000, 285, "Non HTTP response code: java.net.SocketException/Non HTTP response message: Connection reset by peer", 262, "Non HTTP response code: java.net.SocketException/Non HTTP response message: Broken pipe", 20, "Non HTTP response code: java.net.SocketException/Non HTTP response message: Connection reset", 3, "", "", "", ""], "isController": false}, {"data": ["01 GET /health", 10000, 299, "Non HTTP response code: java.net.SocketException/Non HTTP response message: Connection reset by peer", 264, "Non HTTP response code: java.net.SocketException/Non HTTP response message: Broken pipe", 34, "Non HTTP response code: java.net.SocketException/Non HTTP response message: Connection reset", 1, "", "", "", ""], "isController": false}, {"data": ["03 GET /wordle (builder page)", 10000, 263, "Non HTTP response code: java.net.SocketException/Non HTTP response message: Connection reset by peer", 249, "Non HTTP response code: java.net.SocketException/Non HTTP response message: Broken pipe", 11, "Non HTTP response code: java.net.SocketException/Non HTTP response message: Connection reset", 3, "", "", "", ""], "isController": false}, {"data": ["06 POST /api/telemetry/page-view", 10000, 214, "Non HTTP response code: java.net.SocketException/Non HTTP response message: Connection reset by peer", 196, "Non HTTP response code: java.net.SocketException/Non HTTP response message: Broken pipe", 16, "Non HTTP response code: java.net.SocketException/Non HTTP response message: Connection reset", 2, "", "", "", ""], "isController": false}, {"data": ["05 GET /api/activities/{id}/generate", 10000, 285, "Non HTTP response code: java.net.SocketException/Non HTTP response message: Connection reset by peer", 214, "404/Not Found", 58, "Non HTTP response code: java.net.SocketException/Non HTTP response message: Broken pipe", 13, "", "", "", ""], "isController": false}]}, function(index, item){
        return item;
    }, [[0, 0]], 0);

});
