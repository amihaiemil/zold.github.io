/**
(The MIT License)

Copyright (c) 2018 Yegor Bugayenko

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the 'Software'), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

var delay = 5000;

var seen_nodes = new Set([]);

function health_init() {
  if (window.location.protocol.startsWith('https')) {
    $(location).attr('href', 'http://www.zold.io/health.html');
    return;
  }
  root = 'b1.zold.io';
  $('#head').html('Wait a second, we are loading the list of nodes from ' + root + '...');
  $.getJSON('http://' + root + '/remotes', function(data) {
    $('#head').html('The node <a href="http://' + root + '">' + root +
      '</a> currently sees <strong>' + data.all.length +
      ' nodes</strong> (refresh the page to update):');
    $.each(data.all.sort(function (r) { return r.host; }), function (i, r) {
      var addr = r.host + ':' + r.port;
      $('#health tbody').append(
        '<tr data-addr="' + addr + '">' +
          '<td class="host"><a href="http://' + addr + '/">' + r.host + '</a></td>' +
          '<td class="port">' + r.port + '</td>' +
          '<td class="ping data"></td>' +
          '<td class="flag data" data-ip="' + r.host + '"></td>' +
          '<td class="cpus data"></td>' +
          '<td class="threads data"></td>' +
          '<td class="score data"></td>' +
          '<td class="wallets data"></td>' +
          '<td class="version data"></td>' +
          '<td class="nscore data"></td>' +
          '<td class="remotes data"></td>' +
          '<td class="history data"></td>' +
          '<td class="queue data"></td>' +
          '<td class="qage data"></td>' +
          '<td class="speed data"></td>' +
          '<td class="age data"></td>' +
          '<td class="wallet"></td>' +
          '</tr>'
      );
      health_flag(r.host);
      window.setTimeout(function () { health_node(addr); }, 0);
    });
  }).fail(function() { console.log('Failed to load the list of remotes from ' + root); });
}

function health_flag(host) {
  var $td = $('#health td[data-ip="' + host + '"]');
  $.getJSON('https://ssl.geoplugin.net/json.gp?k=af0ad95fd7caa623&ip=' + $td.data('ip'), function(json) {
    var country = json.geoplugin_countryCode;
    $td.html('<img src="https://flagpedia.net/data/flags/normal/' +
      country.toLowerCase() + '.png" alt="' + country + '" style="width:1em;"/>');
  }).fail(function() { $td.text('?'); });
}

function health_check_wallet() {
  var wallet = $('#wallet').val();
  $('#health tr[data-addr]').each(function () {
    var addr = $(this).data('addr');
    var $td = $(this).find('td.wallet');
    var url = 'http://' + addr + '/wallet/' + wallet + '/balance';
    $td.text('checking...').addClass('gray').removeClass('green');
    $td.attr('title', url);
    $.getJSON(url, function(data) {
      $td.text(Math.round(parseInt(data) / Math.pow(2, 32), 2) + 'ZLD')
        .removeClass('gray red').addClass('green');
    })
    .fail(function(jqXHR, status, error) { $td.text(jqXHR.status).addClass('red'); });
  });
}

function health_node(addr) {
  var $tr = $('#health tr[data-addr="' + addr + '"]');
  var start = new Date();
  $tr.find('td.ping').html('<div class="spinner">&nbsp;</div>');
  $.getJSON('http://' + addr + '/', function(json) {
    var msec = new Date() - start;
    var $ping = $tr.find('td.ping');
    $ping.text(msec).colorize({ 200: 'red', 0: 'green' });
    $tr.find('td.cpus').text(json.cpus);
    $tr.find('td.threads').text(json.threads);
    $tr.find('td.score').text(json.score.value).colorize({ 16: 'green', 4: 'orange', 0: 'red'});
    $tr.find('td.wallets').text(json.wallets);
    $tr.find('td.remotes').text(json.remotes);
    $tr.find('td.version').text(json.version + '/' + json.protocol);
    $tr.find('td.nscore').text(json.nscore);
    $tr.find('td.age').text(parseFloat(Math.round(json.hours_alive)));
    $tr.find('td.history').text(json.entrance.history_size).colorize({ 8: 'green', 0: 'red'});
    $tr.find('td.queue').text(json.entrance.queue).colorize({ 32: 'red', 8: 'orange', 0: 'green'});
    if (json.entrance.queue_age == 0) {
      $tr.find('td.qage').html('&mdash;');
    } else {
      $tr.find('td.qage').text(Math.round(json.entrance.queue_age)).colorize({ 180: 'red', 60: 'orange', 0: 'green'});
    }
    $tr.find('td.speed').text(Math.round(json.entrance.speed)).colorize({ 32: 'red', 16: 'orange', 0: 'green'});
    $.getJSON('http://' + addr + '/remotes', function(json) {
      seen_nodes.add(addr);
      $.each(json.all, function (i, r) {
        seen_nodes.add(r.host + ':' + r.port);
      });
      $('#total_nodes').text(seen_nodes.size);
      health_update_cost();
    });
  })
  .always(function() { window.setTimeout(function () { health_node(addr); }, delay); })
  .fail(function(jqXHR, status, error) { $tr.find('td.ping').text('#' + jqXHR.status).addClass('red'); });
}

function health_update_cost() {
  var cpus = 0;
  $('#health td.cpus').each(function () {
    var td = $(this).text();
    if (td.match(/^[0-9]+$/)) {
      cpus += parseInt(td);
    }
  });
  $('#total_cpus').text(cpus);
  var nodes = parseInt($('#total_nodes').text());
  var visible = $('#health td.cpus').length;
  $('#total_dollars').text(Math.round(0.16 * nodes * cpus / visible, 2));
}
