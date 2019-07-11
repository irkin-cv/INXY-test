import 'jquery';
import '../styles/index.scss';

function renderHeader(state) {
    $('.title-item-js').removeClass('asc');
    $('.title-item-js').removeClass('desc');
    $('.title-item-js[data-col=' + state.current_order_column + ']').addClass(state.current_order_direction);
}

function renderServer(server) {
    return (
        '<div class="element-block">' +
            '<div class="element-inner">' + server.provider + '</div>' +
            '<div class="element-inner">' + server.brand + '</div>' +
            '<div class="element-inner">' + server.location + '</div>' +
            '<div class="element-inner">' + server.cpu +'</div>' +
            '<div class="element-inner">' + server.drive_label + '</div>' +
            '<div class="element-inner price">$' + server.price + '</div>' +
        '</div>'
    );
}

function renderFirstPage(state) {
    var container = $('#server-list');
    var content;

    if (state.raw_data.length == 0 || state.processed_data.length == 0) {
        var message = state.raw_data.length == 0 ? "Loading ..." : "No data";
        content =
            '<div class="element-block button">' +
                '<span class="loading">' + message + '</span>' +
            '</div>';
    } else {
        content = state.processed_data.slice(0, state.items_per_page).map(renderServer);
    }
    container.html(content);
}

function renderNextPage(state) {
    var container = $('#server-list');
    var from = state.items_per_page * (state.current_page - 1);
    var to = from + state.items_per_page;
    var content = state.processed_data.slice(from, to).map(renderServer);

    container.append(content);
}

function renderFooter(state) {
    var container = $('.server-pagination');
    var last = state.items_per_page * state.current_page;

    if (last < state.processed_data.length) {
        container.html(
            '<div class="server-pagination">' +
                '<div id="next-page" class="button">Show more</div>' +
            '</div>'
        );
    } else {
        container.empty();
    }
}

function renderFirst(state) {
    state.current_page = 1;

    renderHeader(state);
    renderFirstPage(state);
    renderFooter(state);
}

function renderFilter(state, col) {
    var container = $('#' + col + '-filter');
    var content = state['known_' + col + 's'].map(function(item){
        if (item) {
            return '<option>' + item + '</option>';
        } else {
            return '<option value=""> All ' + col + 's</option>';
        };
    });

    container.html(content);
}

function filterServers(state) {
    var processed_data = state.raw_data;

    Object.keys(state.current_filter).forEach(function(col) {
        if (state.current_filter[col]) {
            processed_data = processed_data.filter(function (server) {
                return server[col] == state.current_filter[col];
            });
        }
    });

    state.processed_data = processed_data;
}

function orderAsc(a, b, col) {
    return (a[col] > b[col]) ? 1 : -1;
}

function orderDesc(a, b, col) {
    return (a[col] > b[col]) ? -1 : 1;
}

function sortServers(state) {
    if (state.current_order_column) {
        var orderFn = state.current_order_direction == "asc" ? orderAsc : orderDesc;

        state.processed_data =
            state.processed_data.sort(function(a, b){
                return orderFn(a, b, state.current_order_column);
            });
    }
}

function distinct(value, index, self) {
    return self.indexOf(value) === index;
}

function knownValues(servers, col) {
    var res = servers.map(function(server){ return server[col]; }).filter(distinct).sort();
    res.unshift("");
    return res;
}

function loadData(state) {
    $.getJSON(state.data_url, function(data) {
        state.raw_data = data.data;
        state.known_locations = knownValues(state.raw_data, "location");
        state.known_providers = knownValues(state.raw_data, "provider");

        filterServers(state);
        sortServers(state);

        renderFilter(state, "location");
        renderFilter(state, "provider");
        renderFirst(state);
    });
}

function onSort(state, evt) {
    var col = $(evt.currentTarget).data('col');

    if (state.current_order_column == col) {
        state.current_order_direction = state.current_order_direction == "asc" ? "desc" : "asc";
    } else {
        state.current_order_column = col;
        state.current_order_direction = "asc";
    }

    filterServers(state);
    sortServers(state);
    renderFirst(state);
}

function onFilter(state, col, evt) {
    var val = $(evt.currentTarget).val();

    state.current_filter[col] = val;

    filterServers(state);
    sortServers(state);
    renderFirst(state);
}

function onNextPage(state, evt) {
    state.current_page += 1;
    renderNextPage(state);
    renderFooter(state);
}

$('document').ready(function(){
    var state = {
        data_url: "/public/servers_catalog.json", // источник данных
        raw_data: [],                             // сырые данные
        processed_data: [],                       // обработанные данные
        current_filter: {
            location: "",
            provider: ""
        },                                        // текущий фильтр
        current_order_column: "price",            // текущая сортировка
        current_order_direction: "asc",           // направление сортировки
        current_page: 1,                          // текущая страница
        items_per_page: 20,                       // элементов на страницу
        known_locations: [],                      // известные локации
        known_providers: []                       // известные провайдеры
    };

    renderFirst(state);

    $(".title-item-js").click(function(evt){ onSort(state, evt); });
    $(".server-pagination").click("#next-page", function(evt){ onNextPage(state, evt); });
    $("#location-filter").change(function(evt){ onFilter(state, "location", evt); });
    $("#provider-filter").change(function(evt){ onFilter(state, "provider", evt); });

    loadData(state);
});
