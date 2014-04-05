/**
 * Created by guyr on 3/22/14.
 */
var graphLinks;

// get the data
var onSubmit = function(){
    var className = document.getElementById("className").value || '';
    var methodName = document.getElementById("methodName").value || '';
    $.get('http://localhost:4010/rest/dependencyGraph', {
        requestedClass: className,
        requestedMethod: methodName
    }, function(data){
        if (data.graphLinks.length === 0){
            alert("no dependencies");
        } else {
            graphLinks = data.graphLinks;
            createAndShowGraph();
        }
    })
}

var clearPreviousGraph = function(){
    var previousGraph = $('.svgContainer')[0];
    if (previousGraph){
        previousGraph.parentElement.removeChild(previousGraph);
    }
}

var createAndShowGraph = function(){
    var hideOptional = !(document.getElementById('optionalCheckBox').checked),
        nodes = {},
        links = _.cloneDeep(graphLinks);

    if (!links){
        return;
    }

    clearPreviousGraph();


// Compute the distinct nodes from the links.
    links.forEach(function(link) {
        if (nodes[link.source]){
            if (!(nodes[link.source].owner)){
                nodes[link.source].owner = link.sourceOwner;
            }
        } else {
            nodes[link.source] = {
                name: link.source,
                owner: link.sourceOwner
            };
        }
        if (!hideOptional || link.dependencyType.indexOf('optional') === -1){
            link.source = nodes[link.source];

            link.target = nodes[link.target] ||
                (nodes[link.target] = {name: link.target});
        }

    });
    var width = 960,
        height = 650;

    var force = d3.layout.force()
        .nodes(d3.values(nodes))
        .links(links)
        .size([width, height])
        .linkDistance(100)
        .charge(-1800)
        .on("tick", tick)
        .start();
    var svg = d3.select("#graphContainer").append("svg")
        .attr("class", "svgContainer");


    links.forEach(function(link) {
        if (link.dependencyType.toLowerCase() === 'optional-before') {
            link.type = "optBefore";
        } else if (link.dependencyType.toLowerCase() === 'required-before') {
            link.type = "reqBefore";
        } else if (link.dependencyType.toLowerCase() === 'optional-after') {
            link.type = "optAfter";
        } else if (link.dependencyType.toLowerCase() === 'required-after') {
            link.type = "reqAfter";
        }
    });

// build the arrow.
    svg.append("svg:defs").selectAll("marker")
        .data(["end"]) // Different link/path types can be defined here
        .enter().append("svg:marker") // This section adds in the arrows
        .attr("id", String)
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 20)
        .attr("refY", -2.5)
        .attr("markerWidth", 9)
        .attr("markerHeight", 9)
        .attr("orient", "auto")
        .append("svg:path")
        .attr("d", "M0,-5L10,0L0,5");

// add the links and the arrows
    var path = svg.append("svg:g").selectAll("path")
        .data(force.links())
        .enter().append("svg:path")
        .attr("class", function(d) { return "link " + d.type; })
        .attr("marker-end", "url(#end)");

// define the nodes
    var node = svg.selectAll(".node")
        .data(force.nodes())
        .enter().append("g")
        .attr("class", "node")
        .call(force.drag);
// add the nodes
    node.append("circle")
        .attr("r", 10);

// add the experiment name
    node.append("text")
        .attr("x", 15)
        .attr("dy", ".35em")
        .text(function(d) { return d.name; });

// add the experiment owner name
    node.append("text")
        .attr("x", 15)
        .attr("dy", "25px")
        .attr("class", "ownerText")
        .text(function(d) { return 'Owner: ' + (d.owner ? d.owner : 'Stalin');});

// add the curvy lines
    function tick() {
        path.attr("d", function(d) {
            var dx = d.target.x - d.source.x,
                dy = d.target.y - d.source.y,
                dr = Math.sqrt(dx * dx + dy * dy);
            return "M" +
                (d.source.x+5) + "," +
                (d.source.y+0.5) + "A" +
                dr + "," + dr + " 0 0,1 " +
                (d.target.x+5) + "," +
                (d.target.y+0.5);
        });
        node
            .attr("transform", function(d) {
                return "translate(" + d.x + "," + d.y + ")"; });
    }
}